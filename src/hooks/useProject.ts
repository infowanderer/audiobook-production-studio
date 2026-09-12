import { useState, useCallback, useRef } from 'react';
import type { Project, ChapterRecord, ChangeRecord } from '@/project/types';
import * as pm from '@/project/manager';
import { parseEpub, computeFileHash, UserError } from '@/processing/epub/parser';
import { runCleanup } from '@/processing/cleanup/engine';
import type { CleanupConfig } from '@/processing/cleanup/types';
import { DEFAULT_CLEANUP_CONFIG } from '@/processing/cleanup/types';
import type { DocumentNode } from '@/processing/document/model';

export type AppView = 'home' | 'project';

export interface StatusMessage {
  text: string;
  type: 'info' | 'success' | 'error' | 'progress';
}

export function useProject() {
  const [view, setView] = useState<AppView>('home');
  const [project, setProject] = useState<Project | null>(null);
  const [chapters, setChapters] = useState<ChapterRecord[]>([]);
  const [selectedChapterIndex, setSelectedChapterIndex] = useState<number>(0);
  const [changes, setChanges] = useState<ChangeRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [loading, setLoading] = useState(false);

  const statusTimeout = useRef<ReturnType<typeof setTimeout>>();
  const showStatus = useCallback((text: string, type: StatusMessage['type'] = 'info', duration = 4000) => {
    clearTimeout(statusTimeout.current);
    setStatus({ text, type });
    if (type !== 'progress') {
      statusTimeout.current = setTimeout(() => setStatus(null), duration);
    }
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const list = await pm.listProjects();
      setProjects(list);
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Failed to load projects', 'error');
    }
  }, [showStatus]);

  const createProject = useCallback(async (name: string) => {
    try {
      setLoading(true);
      showStatus('Creating project...', 'progress');
      const p = await pm.createProject(name);
      setProject(p);
      setChapters([]);
      setChanges([]);
      setView('project');
      showStatus('Project created', 'success');
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Failed to create project', 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  const openProject = useCallback(async (id: string) => {
    try {
      setLoading(true);
      showStatus('Opening project...', 'progress');
      const p = await pm.getProject(id);
      if (!p) { showStatus('Project not found', 'error'); return; }
      setProject(p);
      const chs = await pm.getChapters(id);
      setChapters(chs);
      setSelectedChapterIndex(0);
      if (chs.length > 0) {
        const ch = await pm.getCleanupChanges(chs[0].id);
        setChanges(ch);
      }
      setView('project');
      showStatus('Project loaded', 'success');
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Failed to open project', 'error');
    } finally {
      setLoading(false);
    }
  }, [showStatus]);

  const importEpub = useCallback(async (file: File) => {
    if (!project) return;
    try {
      setLoading(true);
      showStatus('Importing ebook...', 'progress');
      await pm.updateProject(project.id, { status: 'importing' });

      showStatus('Extracting chapters...', 'progress');
      const book = await parseEpub(file);
      const hash = await computeFileHash(file);

      showStatus('Saving chapters...', 'progress');
      const savedChapters = await pm.saveChapters(project.id, book.chapters);

      const updatedProject = await pm.updateProject(project.id, {
        status: 'imported',
        source_filename: file.name,
        source_hash: hash,
        metadata: {
          bookTitle: book.title,
          bookAuthor: book.author,
          chapterCount: book.chapters.length,
        },
      });

      setProject(updatedProject);
      setChapters(savedChapters);
      setSelectedChapterIndex(0);
      setChanges([]);
      showStatus(`Imported "${book.title}" with ${book.chapters.length} chapters`, 'success');
    } catch (e) {
      await pm.updateProject(project.id, { status: 'created' });
      if (e instanceof UserError) {
        showStatus(e.message, 'error');
      } else {
        showStatus('Something went wrong during import. The original file is safe.', 'error');
      }
    } finally {
      setLoading(false);
    }
  }, [project, showStatus]);

  const runCleanupOnAll = useCallback(async (config?: CleanupConfig) => {
    if (!project || chapters.length === 0) return;
    try {
      setLoading(true);
      const cleanupConfig = config ?? project.cleanupConfig ?? DEFAULT_CLEANUP_CONFIG;

      showStatus('Running cleanup...', 'progress');
      await pm.updateProject(project.id, { status: 'cleaning', cleanup_config: cleanupConfig });

      for (let i = 0; i < chapters.length; i++) {
        const ch = chapters[i];
        showStatus(`Cleaning chapter ${i + 1} of ${chapters.length}...`, 'progress');

        const result = runCleanup(ch.originalContent, ch.chapterIndex, cleanupConfig);

        const updated = await pm.updateChapter(ch.id, {
          cleaned_content: result.nodes,
          review_status: result.changes.length > 0 ? 'needs_review' : 'accepted',
          processing_metadata: result.metadata as unknown as Record<string, unknown>,
        });

        await pm.saveCleanupChanges(project.id, ch.id, result.changes);
        chapters[i] = updated;
      }

      const updatedProject = await pm.updateProject(project.id, {
        status: 'cleaned',
        cleanup_config: cleanupConfig,
      });
      setProject(updatedProject);
      setChapters([...chapters]);

      if (chapters.length > 0) {
        const ch = await pm.getCleanupChanges(chapters[selectedChapterIndex]?.id ?? chapters[0].id);
        setChanges(ch);
      }

      showStatus('Cleanup complete. Ready for review.', 'success');
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Cleanup failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [project, chapters, selectedChapterIndex, showStatus]);

  const selectChapter = useCallback(async (index: number) => {
    setSelectedChapterIndex(index);
    const ch = chapters[index];
    if (ch) {
      try {
        const chChanges = await pm.getCleanupChanges(ch.id);
        setChanges(chChanges);
      } catch {
        setChanges([]);
      }
    }
  }, [chapters]);

  const updateChapterContent = useCallback(async (
    chapterId: string,
    newContent: DocumentNode[],
    reviewStatus: 'accepted' | 'manually_edited',
  ) => {
    try {
      const updated = await pm.updateChapter(chapterId, {
        cleaned_content: newContent,
        review_status: reviewStatus,
      });
      setChapters((prev) =>
        prev.map((ch) => (ch.id === chapterId ? updated : ch)),
      );
      showStatus('Changes saved', 'success', 2000);
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Failed to save changes', 'error');
    }
  }, [showStatus]);

  const acceptAllChanges = useCallback(async (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch || !ch.cleanedContent) return;
    await updateChapterContent(chapterId, ch.cleanedContent, 'accepted');
  }, [chapters, updateChapterContent]);

  const rejectAllChanges = useCallback(async (chapterId: string) => {
    const ch = chapters.find((c) => c.id === chapterId);
    if (!ch) return;
    await updateChapterContent(chapterId, ch.originalContent, 'accepted');
  }, [chapters, updateChapterContent]);

  const updateCleanupConfig = useCallback(async (config: CleanupConfig) => {
    if (!project) return;
    const updated = await pm.updateProject(project.id, { cleanup_config: config });
    setProject(updated);
  }, [project]);

  const goHome = useCallback(() => {
    setView('home');
    setProject(null);
    setChapters([]);
    setChanges([]);
  }, []);

  const deleteProjectById = useCallback(async (id: string) => {
    try {
      await pm.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      showStatus('Project deleted', 'success');
    } catch (e) {
      showStatus(e instanceof Error ? e.message : 'Failed to delete project', 'error');
    }
  }, [showStatus]);

  return {
    view,
    project,
    chapters,
    selectedChapterIndex,
    changes,
    projects,
    status,
    loading,
    loadProjects,
    createProject,
    openProject,
    deleteProjectById,
    importEpub,
    runCleanupOnAll,
    selectChapter,
    updateChapterContent,
    acceptAllChanges,
    rejectAllChanges,
    updateCleanupConfig,
    goHome,
    showStatus,
  };
}
