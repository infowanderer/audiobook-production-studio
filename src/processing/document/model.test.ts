import { describe, it, expect } from 'vitest';
import {
  nodeToPlainText,
  nodeToHtml,
  cloneNodes,
  isNodeEmpty,
  hasNarratableContent,
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

  it('returns empty string for footnote_ref', () => {
    expect(nodeToPlainText({ type: 'footnote_ref', content: '1', attributes: { ref: '1' } })).toBe('');
  });

  it('returns empty string for footnote_backlink', () => {
    expect(nodeToPlainText({ type: 'footnote_backlink', content: '\u21A9', attributes: { href: '#ref' } })).toBe('');
  });

  it('returns empty string for image', () => {
    expect(nodeToPlainText({ type: 'image', attributes: { src: 'img.png', alt: 'description' } })).toBe('');
  });

  it('returns empty string for non_narratable', () => {
    expect(nodeToPlainText({ type: 'non_narratable', children: [{ type: 'text', content: 'hidden' }] })).toBe('');
  });

  it('renders hyperlink children as visible text', () => {
    const node: DocumentNode = {
      type: 'hyperlink',
      children: [{ type: 'text', content: 'click here' }],
      attributes: { href: 'http://example.com' },
    };
    expect(nodeToPlainText(node)).toBe('click here');
  });

  it('returns empty for narrationExcluded nodes', () => {
    const node: DocumentNode = {
      type: 'paragraph',
      children: [{ type: 'text', content: 'excluded text' }],
      narrationExcluded: true,
    };
    expect(nodeToPlainText(node)).toBe('');
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

  it('renders footnote as aside', () => {
    const node: DocumentNode = {
      type: 'footnote',
      attributes: { id: 'fn1' },
      children: [{ type: 'text', content: 'Footnote text' }],
    };
    expect(nodeToHtml(node)).toBe('<aside class="footnote" id="fn1">Footnote text</aside>');
  });

  it('renders footnote_backlink as empty', () => {
    const node: DocumentNode = {
      type: 'footnote_backlink',
      content: '\u21A9',
      attributes: { href: '#ref' },
    };
    expect(nodeToHtml(node)).toBe('');
  });

  it('renders hyperlink as <a>', () => {
    const node: DocumentNode = {
      type: 'hyperlink',
      children: [{ type: 'text', content: 'link text' }],
      attributes: { href: 'http://example.com' },
    };
    expect(nodeToHtml(node)).toBe('<a href="http://example.com">link text</a>');
  });

  it('renders image as <img>', () => {
    const node: DocumentNode = {
      type: 'image',
      attributes: { src: 'img.png', alt: 'description' },
    };
    expect(nodeToHtml(node)).toBe('<img src="img.png" alt="description" />');
  });

  it('renders table', () => {
    const node: DocumentNode = {
      type: 'table',
      children: [
        { type: 'table_row', children: [
          { type: 'table_cell', children: [{ type: 'text', content: 'A' }] },
          { type: 'table_cell', children: [{ type: 'text', content: 'B' }] },
        ] },
      ],
    };
    const html = nodeToHtml(node);
    expect(html).toContain('<table>');
    expect(html).toContain('<tr>');
    expect(html).toContain('<td>A</td>');
    expect(html).toContain('<td>B</td>');
  });

  it('renders non_narratable as empty', () => {
    const node: DocumentNode = {
      type: 'non_narratable',
      children: [{ type: 'text', content: 'hidden' }],
    };
    expect(nodeToHtml(node)).toBe('');
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

describe('isNodeEmpty', () => {
  it('returns true for empty text', () => {
    expect(isNodeEmpty({ type: 'text', content: '' })).toBe(true);
  });

  it('returns true for whitespace-only text', () => {
    expect(isNodeEmpty({ type: 'text', content: '   ' })).toBe(true);
  });

  it('returns false for non-empty text', () => {
    expect(isNodeEmpty({ type: 'text', content: 'hello' })).toBe(false);
  });

  it('returns false for scene_break', () => {
    expect(isNodeEmpty({ type: 'scene_break' })).toBe(false);
  });

  it('returns false for image', () => {
    expect(isNodeEmpty({ type: 'image', attributes: { src: 'x', alt: '' } })).toBe(false);
  });

  it('returns true for paragraph with no children', () => {
    expect(isNodeEmpty({ type: 'paragraph', children: [] })).toBe(true);
  });

  it('returns true for paragraph with empty children', () => {
    expect(isNodeEmpty({ type: 'paragraph', children: [{ type: 'text', content: '' }] })).toBe(true);
  });

  it('returns false for paragraph with content', () => {
    expect(isNodeEmpty({ type: 'paragraph', children: [{ type: 'text', content: 'hi' }] })).toBe(false);
  });
});

describe('hasNarratableContent', () => {
  it('returns true for text content', () => {
    expect(hasNarratableContent([{ type: 'text', content: 'hello' }])).toBe(true);
  });

  it('returns false for empty array', () => {
    expect(hasNarratableContent([])).toBe(false);
  });

  it('returns false for only excluded nodes', () => {
    expect(hasNarratableContent([
      { type: 'footnote_ref', content: '1', narrationExcluded: true },
    ])).toBe(false);
  });

  it('returns true for nested text content', () => {
    expect(hasNarratableContent([
      { type: 'paragraph', children: [{ type: 'text', content: 'hi' }] },
    ])).toBe(true);
  });

  it('returns false for only empty nodes', () => {
    expect(hasNarratableContent([
      { type: 'paragraph', children: [{ type: 'text', content: '' }] },
    ])).toBe(false);
  });

  it('returns true for scene_break', () => {
    expect(hasNarratableContent([{ type: 'scene_break' }])).toBe(true);
  });
});
