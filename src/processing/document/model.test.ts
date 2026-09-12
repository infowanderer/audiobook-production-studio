import { describe, it, expect } from 'vitest';
import {
  nodeToPlainText,
  nodeToHtml,
  cloneNodes,
  type DocumentNode,
} from './model';

describe('nodeToPlainText', () => {
  it('renders a text node', () => {
    expect(nodeToPlainText({ type: 'text', content: 'hello' })).toBe('hello');
  });

  it('renders a text node with no content as empty string', () => {
    expect(nodeToPlainText({ type: 'text' })).toBe('');
  });

  it('renders a line_break as newline', () => {
    expect(nodeToPlainText({ type: 'line_break' })).toBe('\n');
  });

  it('renders a scene_break', () => {
    expect(nodeToPlainText({ type: 'scene_break' })).toBe('\n* * *\n');
  });

  it('renders a paragraph with trailing double newline', () => {
    const node: DocumentNode = {
      type: 'paragraph',
      children: [{ type: 'text', content: 'Some text' }],
    };
    expect(nodeToPlainText(node)).toBe('Some text\n\n');
  });

  it('renders a heading with trailing double newline', () => {
    const node: DocumentNode = {
      type: 'heading',
      children: [{ type: 'text', content: 'Title' }],
      attributes: { level: '2' },
    };
    expect(nodeToPlainText(node)).toBe('Title\n\n');
  });

  it('renders a blockquote with > prefix', () => {
    const node: DocumentNode = {
      type: 'blockquote',
      children: [
        {
          type: 'paragraph',
          children: [{ type: 'text', content: 'Quoted text' }],
        },
      ],
    };
    const result = nodeToPlainText(node);
    expect(result).toContain('> Quoted text');
  });

  it('renders nested emphasis and strong as plain text', () => {
    const node: DocumentNode = {
      type: 'paragraph',
      children: [
        { type: 'text', content: 'Hello ' },
        { type: 'emphasis', children: [{ type: 'text', content: 'world' }] },
        { type: 'text', content: ' and ' },
        { type: 'strong', children: [{ type: 'text', content: 'bold' }] },
      ],
    };
    expect(nodeToPlainText(node)).toBe('Hello world and bold\n\n');
  });
});

describe('nodeToHtml', () => {
  it('renders a text node with HTML escaping', () => {
    expect(nodeToHtml({ type: 'text', content: '<script>alert("xss")</script>' })).toBe(
      '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;',
    );
  });

  it('renders a line_break as <br />', () => {
    expect(nodeToHtml({ type: 'line_break' })).toBe('<br />');
  });

  it('renders a scene_break as <hr />', () => {
    expect(nodeToHtml({ type: 'scene_break' })).toBe('<hr class="scene-break" />');
  });

  it('renders headings with correct level', () => {
    const node: DocumentNode = {
      type: 'heading',
      children: [{ type: 'text', content: 'Title' }],
      attributes: { level: '3' },
    };
    expect(nodeToHtml(node)).toBe('<h3>Title</h3>');
  });

  it('defaults heading level to 2', () => {
    const node: DocumentNode = {
      type: 'heading',
      children: [{ type: 'text', content: 'Title' }],
    };
    expect(nodeToHtml(node)).toBe('<h2>Title</h2>');
  });

  it('renders paragraph', () => {
    const node: DocumentNode = {
      type: 'paragraph',
      children: [{ type: 'text', content: 'Hello' }],
    };
    expect(nodeToHtml(node)).toBe('<p>Hello</p>');
  });

  it('renders emphasis and strong', () => {
    const node: DocumentNode = {
      type: 'paragraph',
      children: [
        { type: 'emphasis', children: [{ type: 'text', content: 'italic' }] },
        { type: 'text', content: ' and ' },
        { type: 'strong', children: [{ type: 'text', content: 'bold' }] },
      ],
    };
    expect(nodeToHtml(node)).toBe('<p><em>italic</em> and <strong>bold</strong></p>');
  });

  it('renders blockquote', () => {
    const node: DocumentNode = {
      type: 'blockquote',
      children: [
        { type: 'paragraph', children: [{ type: 'text', content: 'Quoted' }] },
      ],
    };
    expect(nodeToHtml(node)).toBe('<blockquote><p>Quoted</p></blockquote>');
  });

  it('renders footnote_ref', () => {
    const node: DocumentNode = {
      type: 'footnote_ref',
      content: '1',
      attributes: { ref: '1' },
    };
    expect(nodeToHtml(node)).toBe('<sup class="footnote-ref">[1]</sup>');
  });

  it('renders section wrapper', () => {
    const node: DocumentNode = {
      type: 'section',
      children: [
        { type: 'paragraph', children: [{ type: 'text', content: 'Inner' }] },
      ],
    };
    expect(nodeToHtml(node)).toBe('<section><p>Inner</p></section>');
  });

  it('renders chapter wrapper', () => {
    const node: DocumentNode = {
      type: 'chapter',
      children: [
        { type: 'paragraph', children: [{ type: 'text', content: 'Text' }] },
      ],
    };
    expect(nodeToHtml(node)).toBe('<div class="chapter"><p>Text</p></div>');
  });
});

describe('cloneNodes', () => {
  it('produces a deep copy', () => {
    const original: DocumentNode[] = [
      {
        type: 'paragraph',
        children: [{ type: 'text', content: 'hello' }],
      },
    ];
    const clone = cloneNodes(original);

    expect(clone).toEqual(original);
    expect(clone).not.toBe(original);
    expect(clone[0]).not.toBe(original[0]);
    expect(clone[0].children![0]).not.toBe(original[0].children![0]);

    clone[0].children![0].content = 'modified';
    expect(original[0].children![0].content).toBe('hello');
  });

  it('handles empty arrays', () => {
    expect(cloneNodes([])).toEqual([]);
  });
});
