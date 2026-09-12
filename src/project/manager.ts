import { supabase } from '@/lib/supabase';
import type { Project, ChapterRecord, ChangeRecord, ExportSettings } from './types';
import { dbToProject, dbToChapter, dbToChange } from './types';
import type { CleanupConfig } from '@/processing/cleanup/types';
import { DEFAULT_CLEANUP_CONFIG } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';
import type { Chapter } from '@/processing/document/model';

export async function createProject(name: string): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .insert({
      name,
      status: 'created',
      cleanup_config: DEFAULT_CLEANUP_CONFIG,
      export_settings: { format: 'both', perChapter: true, combined: true },
    })
    .select()
    .single();

  if (error) throw new Error(`Could not create project: ${error.message}`);
  return dbToProject(data);
}

export async function listProjects(): Promise<Project[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw new Error(`Could not load projects: ${error.message}`);
  return (data ?? []).map(dbToProject);
}

export async function getProject(id: string): Promise<Project | null> {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw new Error(`Could not load project: ${error.message}`);
  return data ? dbToProject(data) : null;
}

export async function updateProject(
  id: string,
  updates: Partial<{
    name: string;
    status: string;
    source_filename: string;
    source_hash: string;
    cleanup_config: CleanupConfig;
    export_settings: ExportSettings;
    metadata: Record<string, unknown>;
  }>,
): Promise<Project> {
  const { data, error } = await supabase
    .from('projects')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();

  if (error) throw new Error(`Could not update project: ${error.message}`);
  return dbToProject(data);
}

export async function deleteProject(id: string): Promise<void> {
  const { error } = await supabase.from('projects').delete().eq('id', id);
  if (error) throw new Error(`Could not delete project: ${error.message}`);
}

export async function saveChapters(
  projectId: string,
  chapters: Chapter[],
): Promise<ChapterRecord[]> {
  await supabase.from('chapters').delete().eq('project_id', projectId);

  const rows = chapters.map((ch) => ({
    project_id: projectId,
    chapter_index: ch.index,
    title: ch.title,
    original_content: ch.nodes,
    review_status: 'not_processed',
    source_hash: null,
  }));

  const { data, error } = await supabase
    .from('chapters')
    .insert(rows)
    .select();

  if (error) throw new Error(`Could not save chapters: ${error.message}`);
  return (data ?? []).map(dbToChapter);
}

export async function getChapters(projectId: string): Promise<ChapterRecord[]> {
  const { data, error } = await supabase
    .from('chapters')
    .select('*')
    .eq('project_id', projectId)
    .order('chapter_index', { ascending: true });

  if (error) throw new Error(`Could not load chapters: ${error.message}`);
  return (data ?? []).map(dbToChapter);
}

export async function updateChapter(
  chapterId: string,
  updates: Partial<{
    cleaned_content: DocumentNode[];
    review_status: string;
    processing_metadata: Record<string, unknown>;
  }>,
): Promise<ChapterRecord> {
  const { data, error } = await supabase
    .from('chapters')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', chapterId)
    .select()
    .single();

  if (error) throw new Error(`Could not update chapter: ${error.message}`);
  return dbToChapter(data);
}

export async function saveCleanupChanges(
  projectId: string,
  chapterId: string,
  changes: CleanupChange[],
): Promise<void> {
  await supabase.from('cleanup_changes').delete().eq('chapter_id', chapterId);

  if (changes.length === 0) return;

  const rows = changes.map((c) => ({
    chapter_id: chapterId,
    project_id: projectId,
    rule_id: c.ruleId,
    operation_type: c.operationType,
    location: c.location,
    original_text: c.originalText,
    replacement_text: c.replacementText,
    confidence: c.confidence,
    status: c.status,
  }));

  const { error } = await supabase.from('cleanup_changes').insert(rows);
  if (error) throw new Error(`Could not save cleanup changes: ${error.message}`);
}

export async function getCleanupChanges(chapterId: string): Promise<ChangeRecord[]> {
  const { data, error } = await supabase
    .from('cleanup_changes')
    .select('*')
    .eq('chapter_id', chapterId)
    .order('created_at', { ascending: true });

  if (error) throw new Error(`Could not load cleanup changes: ${error.message}`);
  return (data ?? []).map(dbToChange);
}

export async function updateChangeStatus(
  changeId: string,
  status: 'accepted' | 'rejected' | 'pending',
): Promise<void> {
  const { error } = await supabase
    .from('cleanup_changes')
    .update({ status })
    .eq('id', changeId);

  if (error) throw new Error(`Could not update change status: ${error.message}`);
}
