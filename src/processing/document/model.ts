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
  | 'footnote'
  | 'footnote_backlink'
  | 'hyperlink'
  | 'image'
  | 'table'
  | 'table_row'
  | 'table_cell'
  | 'caption'
  | 'non_narratable'
  | 'text'
  | 'line_break';

export type SemanticRole =
  | 'footnote_ref'
  | 'footnote'
  | 'footnote_backlink'
  | 'navigation'
  | 'backlink'
  | 'cross_reference'
  | 'decorative'
  | 'hidden'
  | 'caption'
  | 'front_matter'
  | 'back_matter'
  | 'title_page'
  | 'dedication'
  | 'epigraph'
  | 'copyright'
  | 'acknowledgments'
  | 'appendix'
  | 'references'
  | 'author_bio'
  | 'table_of_contents';

export interface DocumentNode {
  type: NodeType;
  content?: string;
  children?: DocumentNode[];
  attributes?: Record<string, string>;
  semanticRole?: SemanticRole;
  narrationExcluded?: boolean;
  exclusionReason?: string;
}

export interface Chapter {
  index: number;
  title: string;
  nodes: DocumentNode[];
  sourceId?: string;
  narrationEligible?: boolean;
  exclusionReason?: string;
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
  narrationPreparationApplied?: boolean;
  narrationExclusionCount?: number;
}

export function nodeToPlainText(node: DocumentNode): string {
  if (node.narrationExcluded) return '';
  if (node.type === 'text') return node.content ?? '';
  if (node.type === 'line_break') return '\n';
  if (node.type === 'scene_break') return '\n* * *\n';
  if (node.type === 'footnote_ref') return '';
  if (node.type === 'footnote_backlink') return '';
  if (node.type === 'image') return '';
  if (node.type === 'non_narratable') return '';
  if (node.type === 'hyperlink') {
    const childText = (node.children ?? []).map(nodeToPlainText).join('');
    return childText;
  }

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
    case 'table':
      return childText;
    case 'table_row':
      return `${childText}\n`;
    case 'table_cell':
      return `${childText}\t`;
    case 'caption':
      return `${childText}\n\n`;
    case 'footnote':
      return '';
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
    case 'footnote': {
      const id = node.attributes?.id ?? '';
      return `<aside class="footnote" id="${id}">${childHtml}</aside>`;
    }
    case 'footnote_backlink':
      return '';
    case 'hyperlink': {
      const href = node.attributes?.href ?? '';
      return `<a href="${escapeHtml(href)}">${childHtml}</a>`;
    }
    case 'image': {
      const src = node.attributes?.src ?? '';
      const alt = escapeHtml(node.attributes?.alt ?? '');
      return `<img src="${escapeHtml(src)}" alt="${alt}" />`;
    }
    case 'table':
      return `<table>${childHtml}</table>`;
    case 'table_row':
      return `<tr>${childHtml}</tr>`;
    case 'table_cell':
      return `<td>${childHtml}</td>`;
    case 'caption':
      return `<caption>${childHtml}</caption>`;
    case 'non_narratable':
      return '';
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

export function isNodeEmpty(node: DocumentNode): boolean {
  if (node.type === 'text') return !node.content?.trim();
  if (node.type === 'scene_break' || node.type === 'line_break') return false;
  if (node.type === 'image') return false;
  if (node.type === 'table') return false;
  if (!node.children || node.children.length === 0) return true;
  return node.children.every(isNodeEmpty);
}

export function hasNarratableContent(nodes: DocumentNode[]): boolean {
  for (const node of nodes) {
    if (node.narrationExcluded) continue;
    if (node.type === 'text' && node.content?.trim()) return true;
    if (node.type === 'scene_break') return true;
    if (node.type === 'image' && node.attributes?.alt?.trim()) return true;
    if (node.children && hasNarratableContent(node.children)) return true;
  }
  return false;
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
