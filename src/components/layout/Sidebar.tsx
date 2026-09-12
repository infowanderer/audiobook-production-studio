import { BookOpen, Check, Circle, AlertCircle, PenLine } from 'lucide-react';
import type { ChapterRecord } from '@/project/types';

interface SidebarProps {
  chapters: ChapterRecord[];
  selectedIndex: number;
  onSelect: (index: number) => void;
  bookTitle?: string;
}

const STATUS_ICON = {
  not_processed: Circle,
  needs_review: AlertCircle,
  accepted: Check,
  manually_edited: PenLine,
};

const STATUS_COLOR = {
  not_processed: 'text-slate-500',
  needs_review: 'text-amber-400',
  accepted: 'text-emerald-400',
  manually_edited: 'text-sky-400',
};

const STATUS_LABEL = {
  not_processed: 'Not processed',
  needs_review: 'Needs review',
  accepted: 'Accepted',
  manually_edited: 'Manually edited',
};

export function Sidebar({ chapters, selectedIndex, onSelect, bookTitle }: SidebarProps) {
  return (
    <aside className="w-64 bg-slate-850 border-r border-slate-700 flex flex-col shrink-0 overflow-hidden"
      style={{ backgroundColor: '#151c2c' }}>
      <div className="p-3 border-b border-slate-700">
        <div className="flex items-center gap-2 text-slate-300">
          <BookOpen size={16} />
          <span className="text-sm font-medium truncate">
            {bookTitle || 'No book imported'}
          </span>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-1">
        {chapters.length === 0 && (
          <p className="text-xs text-slate-500 px-3 py-4">
            Import an ebook to see chapters here.
          </p>
        )}
        {chapters.map((ch, i) => {
          const Icon = STATUS_ICON[ch.reviewStatus];
          const selected = i === selectedIndex;
          return (
            <button
              key={ch.id}
              onClick={() => onSelect(i)}
              title={STATUS_LABEL[ch.reviewStatus]}
              className={`w-full text-left px-3 py-2 flex items-center gap-2 text-sm transition-colors
                ${selected
                  ? 'bg-slate-700/60 text-white'
                  : 'text-slate-400 hover:bg-slate-700/30 hover:text-slate-200'
                }`}
            >
              <Icon size={14} className={`shrink-0 ${STATUS_COLOR[ch.reviewStatus]}`} />
              <span className="truncate">{ch.title}</span>
            </button>
          );
        })}
      </nav>

      {chapters.length > 0 && (
        <div className="p-3 border-t border-slate-700 text-xs text-slate-500">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Check size={11} className="text-emerald-400" />
              {chapters.filter((c) => c.reviewStatus === 'accepted' || c.reviewStatus === 'manually_edited').length}
            </span>
            <span className="flex items-center gap-1">
              <AlertCircle size={11} className="text-amber-400" />
              {chapters.filter((c) => c.reviewStatus === 'needs_review').length}
            </span>
            <span className="flex items-center gap-1">
              <Circle size={11} className="text-slate-500" />
              {chapters.filter((c) => c.reviewStatus === 'not_processed').length}
            </span>
          </div>
        </div>
      )}
    </aside>
  );
}
