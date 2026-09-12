import { useState, useCallback, useRef, useEffect } from 'react';
import { useProject } from '@/hooks/useProject';
import { ProjectHome } from '@/components/project/ProjectHome';
import { Toolbar } from '@/components/layout/Toolbar';
import { Sidebar } from '@/components/layout/Sidebar';
import { StatusBar } from '@/components/layout/StatusBar';
import { ReviewPanel } from '@/components/review/ReviewPanel';
import { CleanupSettings } from '@/components/cleanup/CleanupSettings';
import { ExportDialog } from '@/components/export/ExportDialog';

function App() {
  const {
    view,
    project,
    chapters,
    selectedChapterIndex,
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
  } = useProject();

  const [showSettings, setShowSettings] = useState(false);
  const [showExport, setShowExport] = useState(false);

  // For the demo flow: store pending import file
  const pendingImport = useRef<File | null>(null);
  const prevProjectId = useRef<string | null>(null);

  // When a project is newly created and we have a pending import, run it
  useEffect(() => {
    if (project && project.id !== prevProjectId.current && pendingImport.current) {
      const file = pendingImport.current;
      pendingImport.current = null;
      importEpub(file);
    }
    prevProjectId.current = project?.id ?? null;
  }, [project, importEpub]);

  const handleDemoImport = useCallback((file: File) => {
    pendingImport.current = file;
  }, []);

  const selectedChapter = chapters[selectedChapterIndex] ?? null;
  const hasCleanedContent = chapters.some((c) => c.cleanedContent !== null);
  const bookTitle = (project?.metadata as Record<string, unknown>)?.bookTitle as string | undefined;

  if (view === 'home') {
    return (
      <div className="h-screen flex flex-col bg-slate-900">
        <ProjectHome
          projects={projects}
          onLoadProjects={loadProjects}
          onCreateProject={createProject}
          onOpenProject={openProject}
          onDeleteProject={deleteProjectById}
          onImportDemo={handleDemoImport}
          loading={loading}
        />
        <StatusBar status={status} />
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-900 text-white">
      <Toolbar
        projectName={project?.name ?? 'Untitled'}
        hasChapters={chapters.length > 0}
        hasCleanedContent={hasCleanedContent}
        onGoHome={goHome}
        onImportEpub={importEpub}
        onRunCleanup={() => runCleanupOnAll()}
        onOpenSettings={() => setShowSettings(true)}
        onExport={() => setShowExport(true)}
        loading={loading}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          chapters={chapters}
          selectedIndex={selectedChapterIndex}
          onSelect={selectChapter}
          bookTitle={bookTitle}
        />
        <ReviewPanel
          chapter={selectedChapter}
          onAcceptAll={acceptAllChanges}
          onRejectAll={rejectAllChanges}
          onSaveEdit={updateChapterContent}
        />
      </div>

      <StatusBar status={status} projectStatus={project?.status} />

      {showSettings && project && (
        <CleanupSettings
          config={project.cleanupConfig}
          onSave={updateCleanupConfig}
          onClose={() => setShowSettings(false)}
        />
      )}

      {showExport && project && (
        <ExportDialog
          bookTitle={bookTitle ?? project.name}
          chapters={chapters}
          onClose={() => setShowExport(false)}
          onShowStatus={showStatus}
        />
      )}
    </div>
  );
}

export default App;
