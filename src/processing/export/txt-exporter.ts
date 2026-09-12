import type { DocumentNode } from '@/processing/document/model';
import { nodeToPlainText } from '@/processing/document/model';

export interface ExportedFile {
  filename: string;
  content: string;
}

export function exportChapterAsTxt(
  title: string,
  nodes: DocumentNode[],
  index: number,
): ExportedFile {
  const paddedIndex = String(index + 1).padStart(3, '0');
  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const filename = `${paddedIndex}_${safeTitle}.txt`;

  const text = nodes.map(nodeToPlainText).join('').trim();
  const content = `${title}\n${'='.repeat(title.length)}\n\n${text}\n`;

  return { filename, content };
}

export function exportBookAsTxt(
  bookTitle: string,
  chapters: { title: string; nodes: DocumentNode[]; index: number }[],
): ExportedFile[] {
  const files: ExportedFile[] = [];

  for (const ch of chapters) {
    files.push(exportChapterAsTxt(ch.title, ch.nodes, ch.index));
  }

  const combinedContent = chapters
    .map((ch) => {
      const text = ch.nodes.map(nodeToPlainText).join('').trim();
      return `${ch.title}\n${'='.repeat(ch.title.length)}\n\n${text}`;
    })
    .join('\n\n\n');

  files.push({
    filename: 'Complete_Book.txt',
    content: `${bookTitle}\n${'='.repeat(bookTitle.length)}\n\n${combinedContent}\n`,
  });

  return files;
}
