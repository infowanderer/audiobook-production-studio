import { useState } from 'react';
import { Check, X, PenLine, Eye, EyeOff, Info } from 'lucide-react';
import type { ChapterRecord } from '@/project/types';
import type { DocumentNode } from '@/processing/document/model';
import { nodeToPlainText } from '@/processing/document/model';

function countExcludedNodes(nodes: DocumentNode[]): number {
  let count = 0;
  for (const node of nodes) {
    if (node.narrationExcluded) count++;
    if (node.children) count += countExcludedNodes(node.children);
    if (node.type === 'non_narratable') count++;
  }
  return count;
}

interface ReviewPanelProps {
  chapter: ChapterRecord | null;
  onAcceptAll: (chapterId: string) => void;
  onRejectAll: (chapterId: string) => void;
  onSaveEdit: (chapterId: string, content: DocumentNode[], status: 'accepted' | 'manually_edited') => void;
}

export function ReviewPanel({ chapter, onAcceptAll, onRejectAll, onSaveEdit }: ReviewPanelProps) {
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState('');
  const [showDiff, setShowDiff] = useState(true);

  if (!chapter) {
    return (
      <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
        Select a chapter to review
      </div>
    );
  }

  const originalText = chapter.originalContent.map(nodeToPlainText).join('').trim();
  const cleanedText = chapter.cleanedContent
    ? chapter.cleanedContent.map(nodeToPlainText).join('').trim()
    : null;

  const hasChanges = cleanedText !== null && cleanedText !== originalText;

  const startEditing = () => {
    setEditText(cleanedText ?? originalText);
    setEditing(true);
  };

  const saveEdit = () => {
    const nodes: DocumentNode[] = editText.split('\n\n').filter(Boolean).map((para) => ({
      type: 'paragraph' as const,
      children: [{ type: 'text' as const, content: para.trim() }],
    }));
    onSaveEdit(chapter.id, nodes, 'manually_edited');
    setEditing(false);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditText('');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Review toolbar */}
      <div className="h-10 bg-slate-800/50 border-b border-slate-700 flex items-center px-4 gap-2 shrink-0">
        <span className="text-sm font-medium text-slate-300 truncate">{chapter.title}</span>

        <StatusBadge status={chapter.reviewStatus} />

        {(() => {
          const excludedCount = countExcludedNodes(chapter.originalContent);
          return excludedCount > 0 ? (
            <span className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-400/10 text-sky-400"
              title={`${excludedCount} content element(s) excluded from narration during preparation`}
            >
              <Info size={9} />
              {excludedCount} excluded
            </span>
          ) : null;
        })()}

        <div className="flex-1" />

        {!editing && cleanedText !== null && (
          <>
            <button
              onClick={() => setShowDiff(!showDiff)}
              className="p-1 text-slate-400 hover:text-white transition-colors"
              title={showDiff ? 'Hide original' : 'Show original'}
            >
              {showDiff ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>

            <button
              onClick={() => onAcceptAll(chapter.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-emerald-400
                hover:bg-emerald-400/10 rounded transition-colors"
            >
              <Check size={13} />
              Accept All
            </button>

            <button
              onClick={() => onRejectAll(chapter.id)}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-red-400
                hover:bg-red-400/10 rounded transition-colors"
            >
              <X size={13} />
              Reject All
            </button>
          </>
        )}

        {!editing && (
          <button
            onClick={startEditing}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-sky-400
              hover:bg-sky-400/10 rounded transition-colors"
          >
            <PenLine size={13} />
            Edit
          </button>
        )}

        {editing && (
          <>
            <button
              onClick={saveEdit}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-white
                bg-sky-600 hover:bg-sky-500 rounded transition-colors"
            >
              <Check size={13} />
              Save
            </button>
            <button
              onClick={cancelEdit}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium text-slate-300
                bg-slate-700 hover:bg-slate-600 rounded transition-colors"
            >
              Cancel
            </button>
          </>
        )}
      </div>

      {/* Content area */}
      {editing ? (
        <div className="flex-1 p-4 overflow-hidden">
          <textarea
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            className="w-full h-full bg-slate-900 border border-slate-600 rounded-lg p-4 text-sm text-slate-200
              font-serif leading-relaxed resize-none focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"
          />
        </div>
      ) : (
        <div className="flex-1 overflow-hidden flex">
          {showDiff && cleanedText !== null ? (
            <>
              {/* Original side */}
              <div className="flex-1 overflow-y-auto border-r border-slate-700">
                <div className="px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 sticky top-0">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Original</span>
                </div>
                <div className="p-6">
                  <TextContent text={originalText} />
                </div>
              </div>
              {/* Cleaned side */}
              <div className="flex-1 overflow-y-auto">
                <div className="px-3 py-1.5 bg-slate-800/80 border-b border-slate-700 sticky top-0">
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Cleaned</span>
                </div>
                <div className="p-6">
                  <TextContent text={cleanedText} highlight />
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 overflow-y-auto">
              <div className="p-6 max-w-3xl mx-auto">
                <TextContent text={cleanedText ?? originalText} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TextContent({ text, highlight }: { text: string; highlight?: boolean }) {
  const paragraphs = text.split('\n\n').filter(Boolean);
  return (
    <div className="space-y-4">
      {paragraphs.map((para, i) => {
        const isHeading = para.endsWith('\n') || (para.length < 60 && !para.includes('.'));
        if (isHeading && i === 0) {
          return (
            <h2 key={i} className="text-lg font-semibold text-slate-200 leading-snug">
              {para.trim()}
            </h2>
          );
        }
        if (para.trim() === '* * *') {
          return (
            <div key={i} className="text-center text-slate-500 py-2">* * *</div>
          );
        }
        return (
          <p key={i} className={`text-sm leading-relaxed font-serif ${highlight ? 'text-slate-100' : 'text-slate-300'}`}>
            {para.trim()}
          </p>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    not_processed: 'bg-slate-700 text-slate-400',
    needs_review: 'bg-amber-400/10 text-amber-400',
    accepted: 'bg-emerald-400/10 text-emerald-400',
    manually_edited: 'bg-sky-400/10 text-sky-400',
  };
  const labels: Record<string, string> = {
    not_processed: 'Not processed',
    needs_review: 'Needs review',
    accepted: 'Accepted',
    manually_edited: 'Edited',
  };

  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${styles[status] ?? styles.not_processed}`}>
      {labels[status] ?? status}
    </span>
  );
}
