import { useState, useEffect } from 'react';
import { Plus, FolderOpen, Trash2, Clock, BookOpen, TestTube } from 'lucide-react';
import type { Project } from '@/project/types';
import { createSyntheticEpub } from '@/processing/epub/synthetic-epub';

interface ProjectHomeProps {
  projects: Project[];
  onLoadProjects: () => void;
  onCreateProject: (name: string) => void;
  onOpenProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onImportDemo: (file: File) => void;
  loading: boolean;
}

export function ProjectHome({
  projects,
  onLoadProjects,
  onCreateProject,
  onOpenProject,
  onDeleteProject,
  onImportDemo,
  loading,
}: ProjectHomeProps) {
  const [newName, setNewName] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  useEffect(() => {
    onLoadProjects();
  }, [onLoadProjects]);

  const handleCreate = () => {
    const name = newName.trim();
    if (!name) return;
    onCreateProject(name);
    setNewName('');
    setShowCreate(false);
  };

  const handleDemo = async () => {
    const file = await createSyntheticEpub();
    onImportDemo(file);
    onCreateProject('The Clockmaker\'s Apprentice');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-8"
      style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 border border-slate-700 mb-4">
            <BookOpen size={28} className="text-sky-400" />
          </div>
          <h1 className="text-3xl font-semibold text-white tracking-tight">
            Audiobook Production Studio
          </h1>
          <p className="mt-2 text-slate-400 text-sm">
            Transform ebooks into production-ready audiobook source material
          </p>
        </div>

        <div className="flex gap-3 justify-center mb-8">
          <button
            onClick={() => setShowCreate(true)}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-500 text-white text-sm
              font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <Plus size={16} />
            New Project
          </button>
          <button
            onClick={handleDemo}
            disabled={loading}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-700 hover:bg-slate-600 text-slate-200 text-sm
              font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <TestTube size={16} />
            Try Demo Book
          </button>
        </div>

        {showCreate && (
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-5 mb-6">
            <h3 className="text-sm font-medium text-slate-200 mb-3">Create New Project</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="Project name..."
                autoFocus
                className="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white
                  placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
              />
              <button
                onClick={handleCreate}
                disabled={!newName.trim()}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white text-sm font-medium rounded-lg
                  transition-colors disabled:opacity-50"
              >
                Create
              </button>
              <button
                onClick={() => { setShowCreate(false); setNewName(''); }}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-700/50">
              <h3 className="text-sm font-medium text-slate-300">Recent Projects</h3>
            </div>
            <div className="divide-y divide-slate-700/30">
              {projects.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center px-5 py-3 hover:bg-slate-700/20 transition-colors group"
                >
                  <button
                    onClick={() => onOpenProject(p.id)}
                    className="flex-1 flex items-center gap-3 text-left"
                  >
                    <FolderOpen size={16} className="text-slate-500 group-hover:text-sky-400 transition-colors" />
                    <div>
                      <div className="text-sm text-slate-200">{p.name}</div>
                      <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                        <Clock size={10} />
                        {new Date(p.updatedAt).toLocaleDateString()}
                        {p.sourceFilename && (
                          <span className="text-slate-600">
                            {' '} \u2014 {p.sourceFilename}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                  <span className="text-xs px-2 py-0.5 rounded bg-slate-700 text-slate-400 mr-3">
                    {p.status}
                  </span>
                  {confirmDelete === p.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { onDeleteProject(p.id); setConfirmDelete(null); }}
                        className="text-xs px-2 py-1 bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => setConfirmDelete(null)}
                        className="text-xs px-2 py-1 bg-slate-700 text-slate-300 rounded hover:bg-slate-600 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setConfirmDelete(p.id)}
                      className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                      title="Delete project"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length === 0 && !showCreate && (
          <p className="text-center text-slate-500 text-sm">
            No projects yet. Create one to get started, or try the demo book.
          </p>
        )}
      </div>
    </div>
  );
}
