import { describe, it, expect } from 'vitest';
import type { DocumentNode } from '@/processing/document/model';
import { exportChapterAsTxt, exportBookAsTxt } from './txt-exporter';
import { exportChapterAsHtml, exportBookAsHtml } from './html-exporter';

function textParagraph(text: string): DocumentNode {
  return { type: 'paragraph', children: [{ type: 'text', content: text }] };
}

const sampleNodes: DocumentNode[] = [
  {
    type: 'heading',
    children: [{ type: 'text', content: 'The Beginning' }],
    attributes: { level: '2' },
  },
  textParagraph('It was a fine morning.'),
  { type: 'scene_break' },
  textParagraph('Later that day, things changed.'),
];

describe('exportChapterAsTxt', () => {
  it('produces a .txt file with correct filename', () => {
    const result = exportChapterAsTxt('Chapter One', sampleNodes, 0);
    expect(result.filename).toBe('001_Chapter_One.txt');
  });

  it('pads the chapter index to 3 digits', () => {
    const result = exportChapterAsTxt('Test', [], 99);
    expect(result.filename).toMatch(/^100_/);
  });

  it('includes the title as a header with underline', () => {
    const result = exportChapterAsTxt('My Chapter', sampleNodes, 0);
    expect(result.content).toContain('My Chapter');
    expect(result.content).toContain('='.repeat('My Chapter'.length));
  });

  it('includes text content from nodes', () => {
    const result = exportChapterAsTxt('Test', sampleNodes, 0);
    expect(result.content).toContain('It was a fine morning.');
    expect(result.content).toContain('Later that day, things changed.');
  });

  it('includes scene breaks as * * *', () => {
    const result = exportChapterAsTxt('Test', sampleNodes, 0);
    expect(result.content).toContain('* * *');
  });

  it('sanitizes special characters in filename', () => {
    const result = exportChapterAsTxt('Chapter: "The End?"', [], 0);
    expect(result.filename).toBe('001_Chapter_The_End.txt');
  });
});

describe('exportBookAsTxt', () => {
  const chapters = [
    { title: 'Chapter One', nodes: sampleNodes, index: 0 },
    { title: 'Chapter Two', nodes: [textParagraph('Second chapter text.')], index: 1 },
  ];

  it('returns per-chapter files plus a combined file', () => {
    const files = exportBookAsTxt('My Book', chapters);
    expect(files).toHaveLength(3);
    expect(files[0].filename).toBe('001_Chapter_One.txt');
    expect(files[1].filename).toBe('002_Chapter_Two.txt');
    expect(files[2].filename).toBe('Complete_Book.txt');
  });

  it('combined file starts with the book title', () => {
    const files = exportBookAsTxt('My Book', chapters);
    const combined = files[2];
    expect(combined.content.startsWith('My Book')).toBe(true);
  });

  it('combined file contains all chapter content', () => {
    const files = exportBookAsTxt('My Book', chapters);
    const combined = files[2];
    expect(combined.content).toContain('It was a fine morning.');
    expect(combined.content).toContain('Second chapter text.');
  });
});

describe('exportChapterAsHtml', () => {
  it('produces a .html file with correct filename', () => {
    const result = exportChapterAsHtml('Chapter One', sampleNodes, 0);
    expect(result.filename).toBe('001_Chapter_One.html');
  });

  it('produces valid HTML structure', () => {
    const result = exportChapterAsHtml('Test Chapter', sampleNodes, 0);
    expect(result.content).toContain('<!DOCTYPE html>');
    expect(result.content).toContain('<html lang="en">');
    expect(result.content).toContain('</html>');
    expect(result.content).toContain('<title>Test Chapter</title>');
  });

  it('includes styled content', () => {
    const result = exportChapterAsHtml('Test', sampleNodes, 0);
    expect(result.content).toContain('<style>');
    expect(result.content).toContain('Georgia');
  });

  it('renders paragraphs as <p> tags', () => {
    const result = exportChapterAsHtml('Test', sampleNodes, 0);
    expect(result.content).toContain('<p>It was a fine morning.</p>');
  });

  it('renders scene breaks as <hr />', () => {
    const result = exportChapterAsHtml('Test', sampleNodes, 0);
    expect(result.content).toContain('<hr class="scene-break" />');
  });

  it('renders emphasis and strong in HTML', () => {
    const nodes: DocumentNode[] = [
      {
        type: 'paragraph',
        children: [
          { type: 'emphasis', children: [{ type: 'text', content: 'italic' }] },
          { type: 'text', content: ' and ' },
          { type: 'strong', children: [{ type: 'text', content: 'bold' }] },
        ],
      },
    ];
    const result = exportChapterAsHtml('Test', nodes, 0);
    expect(result.content).toContain('<em>italic</em>');
    expect(result.content).toContain('<strong>bold</strong>');
  });
});

describe('exportBookAsHtml', () => {
  const chapters = [
    { title: 'Chapter One', nodes: sampleNodes, index: 0 },
    { title: 'Chapter Two', nodes: [textParagraph('Second chapter.')], index: 1 },
  ];

  it('returns per-chapter files plus a combined file', () => {
    const files = exportBookAsHtml('My Book', chapters);
    expect(files).toHaveLength(3);
    expect(files[2].filename).toBe('Complete_Book.html');
  });

  it('combined file wraps chapters in div.chapter', () => {
    const files = exportBookAsHtml('My Book', chapters);
    const combined = files[2];
    expect(combined.content).toContain('<div class="chapter">');
  });

  it('combined file has book title in <title>', () => {
    const files = exportBookAsHtml('My Book', chapters);
    expect(files[2].content).toContain('<title>My Book</title>');
  });
});
