import { ArrowLeft, Upload, Sparkles, Settings, Download, Save } from 'lucide-react';
import { useRef } from 'react';

interface ToolbarProps {
  projectName: string;
  hasChapters: boolean;
  hasCleanedContent: boolean;
  onGoHome: () => void;
  onImportEpub: (file: File) => void;
  onRunCleanup: () => void;
  onOpenSettings: () => void;
  onExport: () => void;
  loading: boolean;
}

export function Toolbar({
  projectName,
  hasChapters,
  hasCleanedContent,
  onGoHome,
  onImportEpub,
  onRunCleanup,
  onOpenSettings,
  onExport,
  loading,
}: ToolbarProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportEpub(file);
      e.target.value = '';
    }
  };

  return (
    <header className="h-12 bg-slate-900 border-b border-slate-700 flex items-center px-3 gap-2 shrink-0">
      <button
        onClick={onGoHome}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
        title="Back to projects"
      >
        <ArrowLeft size={16} />
      </button>

      <div className="h-5 w-px bg-slate-700" />

      <span className="text-sm font-medium text-slate-200 truncate max-w-xs">
        {projectName}
      </span>

      <div className="flex-1" />

      <input
        ref={fileRef}
        type="file"
        accept=".epub"
        onChange={handleFileChange}
        className="hidden"
      />

      <button
        onClick={() => fileRef.current?.click()}
        disabled={loading}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300
          bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md transition-colors disabled:opacity-50"
      >
        <Upload size={13} />
        Import EPUB
      </button>

      <button
        onClick={onRunCleanup}
        disabled={loading || !hasChapters}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white
          bg-sky-600 hover:bg-sky-500 rounded-md transition-colors disabled:opacity-50"
      >
        <Sparkles size={13} />
        Run Cleanup
      </button>

      <button
        onClick={onOpenSettings}
        disabled={loading}
        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors disabled:opacity-50"
        title="Cleanup settings"
      >
        <Settings size={15} />
      </button>

      <button
        onClick={onExport}
        disabled={loading || !hasCleanedContent}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300
          bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-md transition-colors disabled:opacity-50"
      >
        <Download size={13} />
        Export
      </button>
    </header>
  );
}
