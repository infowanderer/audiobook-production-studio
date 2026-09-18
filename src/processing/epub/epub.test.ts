import { describe, it, expect } from 'vitest';
import { parseEpub, UserError } from './parser';
import { createSyntheticEpub } from './synthetic-epub';
import JSZip from 'jszip';
import type { DocumentNode } from '@/processing/document/model';

describe('parseEpub with synthetic EPUB', () => {
  it('extracts the correct book title', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    expect(book.title).toMatch(/The Clockmaker.s Apprentice/);
  });

  it('extracts the author', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    expect(book.author).toBe('Synthetic Test Author');
  });

  it('extracts 7 chapters (empty.xhtml skipped)', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    expect(book.chapters.length).toBe(7);
  });

  it('does not create a chapter for empty spine item', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const titles = book.chapters.map((ch) => ch.title);
    expect(titles).not.toContain('Empty Page');
  });

  it('assigns TOC titles from nav', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    expect(book.chapters[0].title).toBe('Front Matter');
    expect(book.chapters[1].title).toBe('Prologue: The Last Midnight');
    expect(book.chapters[2].title).toBe('Chapter One: Gears and Dust');
    expect(book.chapters[3].title).toMatch(/Chapter Two: The Stranger.s Request/);
    expect(book.chapters[4].title).toBe('Chapter Three: Beneath the Clocktower');
    expect(book.chapters[5].title).toBe('Epilogue');
    expect(book.chapters[6].title).toBe('Appendix');
  });

  it('assigns sequential indices', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    for (let i = 0; i < book.chapters.length; i++) {
      expect(book.chapters[i].index).toBe(i);
    }
  });

  it('extracts headings from chapter XHTML', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch1 = book.chapters[2];
    const headings = ch1.nodes.filter((n) => n.type === 'heading');
    expect(headings.length).toBeGreaterThanOrEqual(1);
    const headingText = headings[0].children?.[0]?.content ?? '';
    expect(headingText).toContain('Chapter One');
  });

  it('extracts paragraphs', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch1 = book.chapters[2];
    const paragraphs = ch1.nodes.filter((n) => n.type === 'paragraph');
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it('extracts scene breaks from <hr/> tags', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const prologue = book.chapters[1];
    const sceneBreaks = prologue.nodes.filter((n) => n.type === 'scene_break');
    expect(sceneBreaks.length).toBeGreaterThanOrEqual(1);
  });

  it('extracts blockquotes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch1 = book.chapters[2];
    const blockquotes = ch1.nodes.filter((n) => n.type === 'blockquote');
    expect(blockquotes.length).toBeGreaterThanOrEqual(1);
  });

  it('extracts emphasis (italic) nodes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch1 = book.chapters[2];
    const findEmphasis = (nodes: typeof ch1.nodes): boolean =>
      nodes.some(
        (n) =>
          n.type === 'emphasis' ||
          (n.children ? findEmphasis(n.children) : false),
      );
    expect(findEmphasis(ch1.nodes)).toBe(true);
  });

  it('preserves Unicode smart quotes in content', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const prologue = book.chapters[1];
    const allText = JSON.stringify(prologue.nodes);
    expect(allText).toContain('\u201C');
    expect(allText).toContain('\u201D');
  });
});

describe('footnote handling', () => {
  it('extracts footnote references as footnote_ref nodes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const findFootnoteRefs = (nodes: typeof ch3.nodes): boolean =>
      nodes.some(
        (n) =>
          n.type === 'footnote_ref' ||
          (n.children ? findFootnoteRefs(n.children) : false),
      );
    expect(findFootnoteRefs(ch3.nodes)).toBe(true);
  });

  it('marks footnote_ref as narrationExcluded', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const findExcludedRef = (nodes: typeof ch3.nodes): DocumentNode | null => {
      for (const n of nodes) {
        if (n.type === 'footnote_ref' && n.narrationExcluded) return n;
        if (n.children) {
          const found = findExcludedRef(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const ref = findExcludedRef(ch3.nodes);
    expect(ref).not.toBeNull();
    expect(ref?.exclusionReason).toContain('footnote');
  });

  it('extracts footnote content as footnote nodes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const footnotes = ch3.nodes.filter((n) => n.type === 'footnote');
    expect(footnotes.length).toBeGreaterThanOrEqual(1);
    expect(footnotes[0].narrationExcluded).toBe(true);
    expect(footnotes[0].semanticRole).toBe('footnote');
  });

  it('extracts footnote backlinks as footnote_backlink nodes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const findBacklinks = (nodes: typeof ch3.nodes): DocumentNode | null => {
      for (const n of nodes) {
        if (n.type === 'footnote_backlink') return n;
        if (n.children) {
          const found = findBacklinks(n.children);
          if (found) return found;
        }
      }
      return null;
    };
    const backlink = findBacklinks(ch3.nodes);
    expect(backlink).not.toBeNull();
    expect(backlink?.narrationExcluded).toBe(true);
  });

  it('footnote refs do not appear in plain text export', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const { nodeToPlainText } = await import('@/processing/document/model');
    const text = ch3.nodes.map(nodeToPlainText).join('');
    expect(text).not.toMatch(/\[1\]/);
  });
});

describe('image handling', () => {
  it('extracts images with filename alt as decorative', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch1 = book.chapters[2];
    const images = ch1.nodes.filter((n) => n.type === 'image');
    expect(images.length).toBeGreaterThanOrEqual(1);
    const filenameImg = images.find((img) => img.attributes?.alt === 'chapter_03_final.png');
    expect(filenameImg).toBeDefined();
    expect(filenameImg?.narrationExcluded).toBe(true);
    expect(filenameImg?.semanticRole).toBe('decorative');
  });

  it('extracts images with empty alt as decorative', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch2 = book.chapters[3];
    const images = ch2.nodes.filter((n) => n.type === 'image');
    const emptyAltImg = images.find((img) => img.attributes?.alt === '');
    expect(emptyAltImg).toBeDefined();
    expect(emptyAltImg?.narrationExcluded).toBe(true);
  });

  it('preserves meaningful alt text without excluding', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const images = ch3.nodes.filter((n) => n.type === 'image');
    const meaningfulImg = images.find(
      (img) => img.attributes?.alt?.includes('cross-section diagram'),
    );
    expect(meaningfulImg).toBeDefined();
    expect(meaningfulImg?.narrationExcluded).toBe(false);
    expect(meaningfulImg?.semanticRole).toBe('caption');
  });
});

describe('table handling', () => {
  it('extracts tables as table nodes', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const tables = ch3.nodes.filter((n) => n.type === 'table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('preserves table rows and cells', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const table = ch3.nodes.find((n) => n.type === 'table');
    expect(table).toBeDefined();
    const rows = table?.children?.filter((n) => n.type === 'table_row');
    expect(rows?.length).toBeGreaterThanOrEqual(3);
  });

  it('preserves table caption', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const table = ch3.nodes.find((n) => n.type === 'table');
    const caption = table?.children?.find((n) => n.type === 'caption');
    expect(caption).toBeDefined();
  });
});

describe('hidden content', () => {
  it('extracts hidden elements as non_narratable', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const prologue = book.chapters[1];
    const hidden = prologue.nodes.filter((n) => n.type === 'non_narratable');
    expect(hidden.length).toBeGreaterThanOrEqual(1);
    expect(hidden[0].narrationExcluded).toBe(true);
    expect(hidden[0].semanticRole).toBe('hidden');
  });
});

describe('hyperlink handling', () => {
  it('extracts internal cross-reference links as hyperlinks', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch2 = book.chapters[3];
    const findLinks = (nodes: typeof ch2.nodes): DocumentNode[] => {
      const links: DocumentNode[] = [];
      for (const n of nodes) {
        if (n.type === 'hyperlink') links.push(n);
        if (n.children) links.push(...findLinks(n.children));
      }
      return links;
    };
    const links = findLinks(ch2.nodes);
    expect(links.length).toBeGreaterThanOrEqual(1);
    const crossRef = links.find((l) => l.semanticRole === 'cross_reference');
    expect(crossRef).toBeDefined();
  });

  it('preserves visible text of hyperlinks', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch2 = book.chapters[3];
    const findLinks = (nodes: typeof ch2.nodes): DocumentNode[] => {
      const links: DocumentNode[] = [];
      for (const n of nodes) {
        if (n.type === 'hyperlink') links.push(n);
        if (n.children) links.push(...findLinks(n.children));
      }
      return links;
    };
    const links = findLinks(ch2.nodes);
    const crossRef = links.find((l) => l.semanticRole === 'cross_reference');
    const linkText = crossRef?.children?.map((c: DocumentNode) => c.content ?? '').join('');
    expect(linkText).toContain('tunnels beneath the clocktower');
  });
});

describe('front/back matter', () => {
  it('preserves front matter sections with semantic roles', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const frontMatter = book.chapters[0];
    const sections = frontMatter.nodes.filter((n) => n.type === 'section');
    expect(sections.length).toBeGreaterThanOrEqual(2);
    const roles = sections.map((s) => s.semanticRole);
    expect(roles).toContain('title_page');
    expect(roles).toContain('copyright');
  });

  it('preserves back matter with appendix role', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const backMatter = book.chapters[6];
    const sections = backMatter.nodes.filter((n) => n.type === 'section');
    expect(sections.length).toBeGreaterThanOrEqual(1);
    const roles = sections.map((s) => s.semanticRole);
    expect(roles).toContain('appendix');
  });
});

describe('parseEpub error handling', () => {
  it('throws UserError for non-EPUB files', async () => {
    const file = new File(['not an epub'], 'test.epub', { type: 'application/epub+zip' });
    await expect(parseEpub(file)).rejects.toThrow();
  });

  it('throws UserError for EPUB missing container.xml', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'bad.epub', { type: 'application/epub+zip' });
    await expect(parseEpub(file)).rejects.toThrow(UserError);
  });

  it('throws UserError for EPUB with empty spine', async () => {
    const zip = new JSZip();
    zip.file('mimetype', 'application/epub+zip');
    zip.file(
      'META-INF/container.xml',
      `<?xml version="1.0"?>
      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
        <rootfiles>
          <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>
        </rootfiles>
      </container>`,
    );
    zip.file(
      'content.opf',
      `<?xml version="1.0"?>
      <package xmlns="http://www.idpf.org/2007/opf" version="3.0">
        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">
          <dc:title>Empty</dc:title>
        </metadata>
        <manifest></manifest>
        <spine></spine>
      </package>`,
    );
    const blob = await zip.generateAsync({ type: 'blob' });
    const file = new File([blob], 'empty.epub', { type: 'application/epub+zip' });
    await expect(parseEpub(file)).rejects.toThrow(UserError);
  });
});

describe('createSyntheticEpub', () => {
  it('produces a valid File object', async () => {
    const file = await createSyntheticEpub();
    expect(file).toBeInstanceOf(File);
    expect(file.name).toBe('the-clockmakers-apprentice.epub');
    expect(file.type).toBe('application/epub+zip');
  });

  it('produces a parseable ZIP', async () => {
    const file = await createSyntheticEpub();
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    expect(zip.file('mimetype')).toBeTruthy();
    expect(zip.file('META-INF/container.xml')).toBeTruthy();
    expect(zip.file('OEBPS/content.opf')).toBeTruthy();
  });

  it('contains all expected XHTML chapter files', async () => {
    const file = await createSyntheticEpub();
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const expectedFiles = [
      'OEBPS/frontmatter.xhtml',
      'OEBPS/prologue.xhtml',
      'OEBPS/chapter01.xhtml',
      'OEBPS/chapter02.xhtml',
      'OEBPS/chapter03.xhtml',
      'OEBPS/epilogue.xhtml',
      'OEBPS/empty.xhtml',
      'OEBPS/backmatter.xhtml',
      'OEBPS/nav.xhtml',
    ];
    for (const path of expectedFiles) {
      expect(zip.file(path)).toBeTruthy();
    }
  });

  it('includes known test artifacts in prologue', async () => {
    const file = await createSyntheticEpub();
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const prologue = await zip.file('OEBPS/prologue.xhtml')!.async('string');
    expect(prologue).toContain('<p>1</p>');
    expect(prologue).toContain('<p>2</p>');
    expect(prologue).toContain("THE CLOCKMAKER'S APPRENTICE");
    expect(prologue).toContain('\u00A0');
  });

  it('includes footnote structures in chapter 3', async () => {
    const file = await createSyntheticEpub();
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const ch3 = await zip.file('OEBPS/chapter03.xhtml')!.async('string');
    expect(ch3).toContain('epub:type="noteref"');
    expect(ch3).toContain('epub:type="footnote"');
    expect(ch3).toContain('epub:type="backlink"');
  });

  it('includes empty spine item', async () => {
    const file = await createSyntheticEpub();
    const buffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(buffer);
    const empty = await zip.file('OEBPS/empty.xhtml')!.async('string');
    expect(empty).toContain('<body>');
    expect(empty).toContain('</body>');
    const bodyMatch = empty.match(/<body[^>]*>([\s\S]*)<\/body>/i);
    expect(bodyMatch?.[1].trim()).toBe('');
  });
});
