import { describe, it, expect } from 'vitest';
import { parseEpub, UserError } from './parser';
import { createSyntheticEpub } from './synthetic-epub';
import JSZip from 'jszip';

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

  it('extracts all 6 chapters from spine', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    expect(book.chapters.length).toBe(6);
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

  it('extracts footnote references', async () => {
    const file = await createSyntheticEpub();
    const book = await parseEpub(file);
    const ch3 = book.chapters[4];
    const findFootnotes = (nodes: typeof ch3.nodes): boolean =>
      nodes.some(
        (n) =>
          n.type === 'footnote_ref' ||
          (n.children ? findFootnotes(n.children) : false),
      );
    expect(findFootnotes(ch3.nodes)).toBe(true);
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
      `<?xml version="1.0"?>\n      <container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">\n        <rootfiles>\n          <rootfile full-path="content.opf" media-type="application/oebps-package+xml"/>\n        </rootfiles>\n      </container>`,
    );
    zip.file(
      'content.opf',
      `<?xml version="1.0"?>\n      <package xmlns="http://www.idpf.org/2007/opf" version="3.0">\n        <metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n          <dc:title>Empty</dc:title>\n        </metadata>\n        <manifest></manifest>\n        <spine></spine>\n      </package>`,
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
});
