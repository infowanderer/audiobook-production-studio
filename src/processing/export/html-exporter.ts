import type { DocumentNode } from '@/processing/document/model';
import { nodeToHtml } from '@/processing/document/model';
import type { ExportedFile } from './txt-exporter';

const HTML_TEMPLATE = (title: string, bodyContent: string) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { max-width: 42em; margin: 2em auto; padding: 0 1em; font-family: Georgia, serif; line-height: 1.6; color: #1a1a1a; }
    h1, h2, h3 { margin-top: 1.5em; line-height: 1.2; }
    blockquote { margin: 1em 2em; padding-left: 1em; border-left: 3px solid #ccc; font-style: italic; }
    hr.scene-break { border: none; text-align: center; margin: 2em 0; }
    hr.scene-break::before { content: "* * *"; color: #666; }
    .footnote-ref { color: #0066cc; font-size: 0.85em; }
    .chapter { margin-bottom: 3em; }
  </style>
</head>
<body>
${bodyContent}
</body>
</html>`;

export function exportChapterAsHtml(
  title: string,
  nodes: DocumentNode[],
  index: number,
): ExportedFile {
  const paddedIndex = String(index + 1).padStart(3, '0');
  const safeTitle = title.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/\s+/g, '_');
  const filename = `${paddedIndex}_${safeTitle}.html`;

  const body = nodes.map(nodeToHtml).join('\n');
  const content = HTML_TEMPLATE(title, `<h1>${title}</h1>\n${body}`);

  return { filename, content };
}

export function exportBookAsHtml(
  bookTitle: string,
  chapters: { title: string; nodes: DocumentNode[]; index: number }[],
): ExportedFile[] {
  const files: ExportedFile[] = [];

  for (const ch of chapters) {
    files.push(exportChapterAsHtml(ch.title, ch.nodes, ch.index));
  }

  const combinedBody = chapters
    .map((ch) => {
      const body = ch.nodes.map(nodeToHtml).join('\n');
      return `<div class="chapter"><h1>${ch.title}</h1>\n${body}</div>`;
    })
    .join('\n');

  files.push({
    filename: 'Complete_Book.html',
    content: HTML_TEMPLATE(bookTitle, combinedBody),
  });

  return files;
}
