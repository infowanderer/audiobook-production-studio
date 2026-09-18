import { describe, it, expect } from 'vitest';
import { prepareNarration, prepareChapterNarration, exclusionToCleanupChange } from './preparation';
import type { DocumentNode, Chapter } from '@/processing/document/model';

function textParagraph(text: string): DocumentNode {
  return { type: 'paragraph', children: [{ type: 'text', content: text }] };
}

function emptyParagraph(): DocumentNode {
  return { type: 'paragraph', children: [{ type: 'text', content: '' }] };
}

describe('prepareNarration', () => {
  it('removes empty paragraphs', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Hello'),
      emptyParagraph(),
      textParagraph('World'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0]).toEqual(textParagraph('Hello'));
    expect(result.nodes[1]).toEqual(textParagraph('World'));
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].operationType).toBe('remove_empty');
    expect(result.changes[0].reason).toBe('empty structural node');
  });

  it('removes empty headings', () => {
    const nodes: DocumentNode[] = [
      { type: 'heading', children: [], attributes: { level: '2' } },
      textParagraph('Content'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
  });

  it('removes empty sections', () => {
    const nodes: DocumentNode[] = [
      { type: 'section', children: [] },
      textParagraph('Content'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
  });

  it('removes empty blockquotes', () => {
    const nodes: DocumentNode[] = [
      { type: 'blockquote', children: [] },
      textParagraph('Content'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
  });

  it('records exclusion for already-excluded nodes', () => {
    const nodes: DocumentNode[] = [
      {
        type: 'footnote_ref',
        content: '1',
        attributes: { ref: '1' },
        narrationExcluded: true,
        exclusionReason: 'footnote reference',
      },
      textParagraph('Content'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].reason).toBe('footnote reference');
    expect(result.changes[0].operationType).toBe('exclude');
  });

  it('preserves non-empty content', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Hello world'),
      { type: 'scene_break' },
      textParagraph('More content'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(3);
    expect(result.changes).toHaveLength(0);
  });

  it('does not mutate original nodes', () => {
    const original: DocumentNode[] = [emptyParagraph(), textParagraph('text')];
    prepareNarration(original, 0);
    expect(original).toHaveLength(2);
  });

  it('removes empty children from nested structures', () => {
    const nodes: DocumentNode[] = [
      {
        type: 'blockquote',
        children: [
          emptyParagraph(),
          textParagraph('quoted'),
          emptyParagraph(),
        ],
      },
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.nodes[0].children).toHaveLength(1);
    expect(result.changes).toHaveLength(2);
  });

  it('handles consecutive empty nodes', () => {
    const nodes: DocumentNode[] = [
      emptyParagraph(),
      emptyParagraph(),
      emptyParagraph(),
      textParagraph('survives'),
    ];
    const result = prepareNarration(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(3);
  });
});

describe('prepareChapterNarration', () => {
  it('returns updated chapter with exclusions', () => {
    const chapter: Chapter = {
      index: 0,
      title: 'Test',
      nodes: [emptyParagraph(), textParagraph('content')],
    };
    const result = prepareChapterNarration(chapter);
    expect(result.chapter.nodes).toHaveLength(1);
    expect(result.exclusions).toHaveLength(1);
  });

  it('preserves chapter metadata', () => {
    const chapter: Chapter = {
      index: 5,
      title: 'Chapter 6',
      nodes: [textParagraph('content')],
      sourceId: 'ch5',
    };
    const result = prepareChapterNarration(chapter);
    expect(result.chapter.index).toBe(5);
    expect(result.chapter.title).toBe('Chapter 6');
    expect(result.chapter.sourceId).toBe('ch5');
  });
});

describe('exclusionToCleanupChange', () => {
  it('converts exclusion to cleanup change format', () => {
    const exclusion = {
      ruleId: 'narration_preparation',
      operationType: 'remove_empty',
      location: { chapterIndex: 0, nodeIndex: 1 },
      originalText: '',
      replacementText: '',
      confidence: 'high' as const,
      status: 'accepted' as const,
      reason: 'empty structural node',
    };
    const change = exclusionToCleanupChange(exclusion);
    expect(change.ruleId).toBe('narration_preparation');
    expect(change.operationType).toBe('remove_empty');
    expect(change.confidence).toBe('high');
    expect(change.status).toBe('accepted');
  });
});
