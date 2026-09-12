import { AlertCircle, CheckCircle, Info, Loader2 } from 'lucide-react';
import type { StatusMessage } from '@/hooks/useProject';

interface StatusBarProps {
  status: StatusMessage | null;
  projectStatus?: string;
}

const ICON_MAP = {
  info: Info,
  success: CheckCircle,
  error: AlertCircle,
  progress: Loader2,
};

const COLOR_MAP = {
  info: 'text-slate-400',
  success: 'text-emerald-400',
  error: 'text-red-400',
  progress: 'text-sky-400',
};

export function StatusBar({ status, projectStatus }: StatusBarProps) {
  const Icon = status ? ICON_MAP[status.type] : null;

  return (
    <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center px-4 text-xs text-slate-400 shrink-0">
      {status && Icon && (
        <div className={`flex items-center gap-1.5 ${COLOR_MAP[status.type]}`}>
          <Icon size={13} className={status.type === 'progress' ? 'animate-spin' : ''} />
          <span>{status.text}</span>
        </div>
      )}
      {!status && projectStatus && (
        <span className="text-slate-500">Project: {projectStatus}</span>
      )}
      <div className="ml-auto text-slate-600">Audiobook Production Studio v0.1.0</div>
    </div>
  );
}
