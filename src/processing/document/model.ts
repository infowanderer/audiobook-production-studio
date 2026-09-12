export type NodeType =
  | 'book'
  | 'chapter'
  | 'section'
  | 'heading'
  | 'paragraph'
  | 'blockquote'
  | 'emphasis'
  | 'strong'
  | 'scene_break'
  | 'footnote_ref'
  | 'text'
  | 'line_break';

export interface DocumentNode {
  type: NodeType;
  content?: string;
  children?: DocumentNode[];
  attributes?: Record<string, string>;
}

export interface Chapter {
  index: number;
  title: string;
  nodes: DocumentNode[];
  sourceId?: string;
}

export interface Book {
  title: string;
  author?: string;
  chapters: Chapter[];
  metadata: Record<string, string>;
}

export interface CleanupChange {
  id?: string;
  chapterId?: string;
  ruleId: string;
  operationType: string;
  location: {
    chapterIndex: number;
    nodeIndex?: number;
    offset?: number;
  };
  originalText: string;
  replacementText: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected';
}

export interface ProcessingMetadata {
  appVersion: string;
  formatVersion: number;
  cleanupRules: string[];
  processorVersion: string;
  timestamp: string;
}

export function nodeToPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  if (node.type === 'line_break') return '\n';
  if (node.type === 'scene_break') return '\n* * *\n';

  const childText = (node.children ?? []).map(nodeToPlainText).join('');

  switch (node.type) {
    case 'heading':
      return `${childText}\n\n`;
    case 'paragraph':
      return `${childText}\n\n`;
    case 'blockquote':
      return childText
        .split('\n')
        .map((line) => (line.trim() ? `> ${line}` : line))
        .join('\n');
    default:
      return childText;
  }
}

export function nodeToHtml(node: DocumentNode): string {
  if (node.type === 'text') return escapeHtml(node.content ?? '');
  if (node.type === 'line_break') return '<br />';
  if (node.type === 'scene_break') return '<hr class="scene-break" />';

  const childHtml = (node.children ?? []).map(nodeToHtml).join('');

  switch (node.type) {
    case 'heading': {
      const level = node.attributes?.level ?? '2';
      return `<h${level}>${childHtml}</h${level}>`;
    }
    case 'paragraph':
      return `<p>${childHtml}</p>`;
    case 'blockquote':
      return `<blockquote>${childHtml}</blockquote>`;
    case 'emphasis':
      return `<em>${childHtml}</em>`;
    case 'strong':
      return `<strong>${childHtml}</strong>`;
    case 'footnote_ref': {
      const ref = node.attributes?.ref ?? '';
      return `<sup class="footnote-ref">[${ref}]</sup>`;
    }
    case 'section':
      return `<section>${childHtml}</section>`;
    case 'chapter':
      return `<div class="chapter">${childHtml}</div>`;
    case 'book':
      return childHtml;
    default:
      return childHtml;
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function cloneNodes(nodes: DocumentNode[]): DocumentNode[] {
  return JSON.parse(JSON.stringify(nodes));
}
