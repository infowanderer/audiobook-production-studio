import { useState } from 'react';
import { Download, X, FileText, Code } from 'lucide-react';
import type { ChapterRecord } from '@/project/types';
import { exportBookAsTxt } from '@/processing/export/txt-exporter';
import { exportBookAsHtml } from '@/processing/export/html-exporter';
import type { ExportedFile } from '@/processing/export/txt-exporter';

interface ExportDialogProps {
  bookTitle: string;
  chapters: ChapterRecord[];
  onClose: () => void;
  onShowStatus: (text: string, type: 'info' | 'success' | 'error') => void;
}

export function ExportDialog({ bookTitle, chapters, onClose, onShowStatus }: ExportDialogProps) {
  const [format, setFormat] = useState<'txt' | 'html' | 'both'>('both');
  const [exporting, setExporting] = useState(false);

  const doExport = async () => {
    setExporting(true);
    try {
      const chapterData = chapters.map((ch) => ({
        title: ch.title,
        nodes: ch.cleanedContent ?? ch.originalContent,
        index: ch.chapterIndex,
      }));

      let files: ExportedFile[] = [];
      if (format === 'txt' || format === 'both') {
        files = files.concat(exportBookAsTxt(bookTitle, chapterData));
      }
      if (format === 'html' || format === 'both') {
        files = files.concat(exportBookAsHtml(bookTitle, chapterData));
      }

      for (const file of files) {
        downloadFile(file.filename, file.content);
        await new Promise((r) => setTimeout(r, 100));
      }

      onShowStatus(`Exported ${files.length} files`, 'success');
      onClose();
    } catch {
      onShowStatus('Export failed', 'error');
    } finally {
      setExporting(false);
    }
  };

  const readyChapters = chapters.filter(
    (c) => c.reviewStatus === 'accepted' || c.reviewStatus === 'manually_edited',
  );

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-slate-800 border border-slate-700 rounded-xl w-full max-w-md shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-base font-semibold text-white">Export Book</h2>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-slate-400">
            {readyChapters.length} of {chapters.length} chapters are reviewed. All chapters will be
            included in the export using their best available version.
          </p>

          <div className="space-y-2">
            <label className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Format
            </label>
            {([
              { value: 'txt', label: 'Plain Text', icon: FileText, desc: 'One .txt file per chapter plus a combined file' },
              { value: 'html', label: 'Structured HTML', icon: Code, desc: 'HTML preserving headings, emphasis, and block quotes' },
              { value: 'both', label: 'Both formats', icon: Download, desc: 'Export in both TXT and HTML' },
            ] as const).map((opt) => (
              <label
                key={opt.value}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer border transition-colors
                  ${format === opt.value
                    ? 'border-sky-500/50 bg-sky-500/5'
                    : 'border-transparent hover:bg-slate-700/30'
                  }`}
              >
                <input
                  type="radio"
                  name="format"
                  value={opt.value}
                  checked={format === opt.value}
                  onChange={() => setFormat(opt.value)}
                  className="mt-1 text-sky-500 focus:ring-sky-500"
                />
                <div>
                  <div className="text-sm text-slate-200 flex items-center gap-1.5">
                    <opt.icon size={14} className="text-slate-400" />
                    {opt.label}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 bg-slate-700 hover:bg-slate-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={doExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-white
              bg-sky-600 hover:bg-sky-500 rounded-lg transition-colors disabled:opacity-50"
          >
            <Download size={14} />
            {exporting ? 'Exporting...' : 'Export'}
          </button>
        </div>
      </div>
    </div>
  );
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
