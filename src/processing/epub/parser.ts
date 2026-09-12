import JSZip from 'jszip';
import type { Book, Chapter, DocumentNode } from '@/processing/document/model';

interface SpineItem {
  id: string;
  href: string;
  title?: string;
}

interface TocItem {
  title: string;
  href: string;
  children?: TocItem[];
}

export async function parseEpub(file: File): Promise<Book> {
  const buffer = await file.arrayBuffer();
  const zip = await JSZip.loadAsync(buffer);

  const containerXml = await readZipFile(zip, 'META-INF/container.xml');
  if (!containerXml) throw new UserError('This file does not appear to be a valid EPUB.');

  const rootfilePath = extractRootfilePath(containerXml);
  if (!rootfilePath) throw new UserError('Could not find the content description in this EPUB.');

  const opfContent = await readZipFile(zip, rootfilePath);
  if (!opfContent) throw new UserError('The EPUB content file is missing or unreadable.');

  const opfDir = rootfilePath.includes('/') ? rootfilePath.substring(0, rootfilePath.lastIndexOf('/') + 1) : '';

  const opfDoc = parseXml(opfContent);
  const title = extractMetadata(opfDoc, 'title') || file.name.replace(/\.epub$/i, '');
  const author = extractMetadata(opfDoc, 'creator');

  const manifest = extractManifest(opfDoc);
  const spineItems = extractSpine(opfDoc, manifest);
  const tocItems = await extractToc(zip, opfDoc, manifest, opfDir);

  const chapters: Chapter[] = [];
  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i];
    const fullPath = opfDir + item.href;
    const content = await readZipFile(zip, fullPath);
    if (!content) continue;

    const chapterTitle = findTocTitle(tocItems, item.href) || item.title || `Section ${i + 1}`;
    const nodes = parseXhtmlToNodes(content);

    if (nodes.length === 0) continue;

    chapters.push({
      index: chapters.length,
      title: chapterTitle,
      nodes,
      sourceId: item.id,
    });
  }

  if (chapters.length === 0) {
    throw new UserError('No readable chapters were found in this EPUB.');
  }

  return { title, author, chapters, metadata: {} };
}

export class UserError extends Error {
  constructor(message: string, public details?: string) {
    super(message);
    this.name = 'UserError';
  }
}

async function readZipFile(zip: JSZip, path: string): Promise<string | null> {
  const file = zip.file(path) || zip.file(decodeURIComponent(path));
  if (!file) return null;
  return file.async('string');
}

function parseXml(xmlString: string): Document {
  const parser = new DOMParser();
  return parser.parseFromString(xmlString, 'application/xml');
}

function extractRootfilePath(containerXml: string): string | null {
  const doc = parseXml(containerXml);
  const rootfile = doc.querySelector('rootfile');
  return rootfile?.getAttribute('full-path') ?? null;
}

function extractMetadata(opfDoc: Document, name: string): string | undefined {
  let el = opfDoc.getElementsByTagNameNS('http://purl.org/dc/elements/1.1/', name)[0];
  if (!el) {
    el = opfDoc.querySelector(`metadata > ${name}`) ?? undefined!;
  }
  if (!el) {
    const allEls = opfDoc.querySelectorAll('metadata *');
    for (const candidate of Array.from(allEls)) {
      const localName = candidate.localName || candidate.tagName.split(':').pop();
      if (localName === name) {
        el = candidate;
        break;
      }
    }
  }
  return el?.textContent?.trim() || undefined;
}

function extractManifest(opfDoc: Document): Map<string, { href: string; mediaType: string }> {
  const manifest = new Map<string, { href: string; mediaType: string }>();
  const items = opfDoc.querySelectorAll('manifest > item');
  items.forEach((item) => {
    const id = item.getAttribute('id') ?? '';
    const href = item.getAttribute('href') ?? '';
    const mediaType = item.getAttribute('media-type') ?? '';
    if (id && href) manifest.set(id, { href, mediaType });
  });
  return manifest;
}

function extractSpine(opfDoc: Document, manifest: Map<string, { href: string; mediaType: string }>): SpineItem[] {
  const items: SpineItem[] = [];
  const spineRefs = opfDoc.querySelectorAll('spine > itemref');
  spineRefs.forEach((ref) => {
    const idref = ref.getAttribute('idref') ?? '';
    const entry = manifest.get(idref);
    if (entry) {
      items.push({ id: idref, href: entry.href });
    }
  });
  return items;
}

async function extractToc(
  zip: JSZip,
  opfDoc: Document,
  manifest: Map<string, { href: string; mediaType: string }>,
  opfDir: string,
): Promise<TocItem[]> {
  // Try EPUB3 nav first
  for (const [, entry] of manifest) {
    if (entry.mediaType === 'application/xhtml+xml') {
      const path = opfDir + entry.href;
      const content = await readZipFile(zip, path);
      if (content && content.includes('epub:type="toc"')) {
        return parseNavToc(content);
      }
    }
  }

  // Fall back to EPUB2 NCX
  const spine = opfDoc.querySelector('spine');
  const tocId = spine?.getAttribute('toc');
  if (tocId) {
    const ncxEntry = manifest.get(tocId);
    if (ncxEntry) {
      const ncxContent = await readZipFile(zip, opfDir + ncxEntry.href);
      if (ncxContent) return parseNcxToc(ncxContent);
    }
  }

  return [];
}

function parseNavToc(htmlContent: string): TocItem[] {
  const doc = parseXml(htmlContent);
  const allNavs = doc.querySelectorAll('nav');
  let nav: Element | null = null;
  for (const n of Array.from(allNavs)) {
    if (n.getAttribute('epub:type') === 'toc' || n.getAttributeNS('http://www.idpf.org/2007/ops', 'type') === 'toc') {
      nav = n;
      break;
    }
  }
  if (!nav) nav = allNavs[0] ?? null;
  if (!nav) return [];

  const items: TocItem[] = [];
  const lis = nav.querySelectorAll(':scope > ol > li');
  lis.forEach((li) => {
    const a = li.querySelector('a');
    if (a) {
      items.push({
        title: (a.textContent ?? '').trim(),
        href: (a.getAttribute('href') ?? '').split('#')[0],
      });
    }
  });
  return items;
}

function parseNcxToc(ncxContent: string): TocItem[] {
  const doc = parseXml(ncxContent);
  const items: TocItem[] = [];
  const navPoints = doc.querySelectorAll('navMap > navPoint');
  navPoints.forEach((np) => {
    const text = np.querySelector('navLabel > text');
    const content = np.querySelector('content');
    if (text && content) {
      items.push({
        title: (text.textContent ?? '').trim(),
        href: (content.getAttribute('src') ?? '').split('#')[0],
      });
    }
  });
  return items;
}

function findTocTitle(tocItems: TocItem[], href: string): string | undefined {
  const normalizedHref = href.split('#')[0];
  for (const item of tocItems) {
    if (item.href === normalizedHref || decodeURIComponent(item.href) === decodeURIComponent(normalizedHref)) {
      return item.title;
    }
  }
  return undefined;
}

function parseXhtmlToNodes(xhtml: string): DocumentNode[] {
  const bodyMatch = xhtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : xhtml;

  const doc = new DOMParser().parseFromString(
    `<div>${bodyHtml}</div>`,
    'text/html',
  );

  const root = doc.querySelector('div');
  if (!root) return [];

  return convertDomToNodes(root);
}

function convertDomToNodes(element: Element): DocumentNode[] {
  const nodes: DocumentNode[] = [];

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text.trim()) {
        nodes.push({ type: 'text', content: text });
      }
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (isHeading(tag)) {
      const level = tag.charAt(1);
      nodes.push({
        type: 'heading',
        children: convertInlineNodes(el),
        attributes: { level },
      });
    } else if (tag === 'p' || tag === 'div') {
      const children = convertInlineNodes(el);
      if (children.length > 0) {
        nodes.push({ type: 'paragraph', children });
      }
    } else if (tag === 'blockquote') {
      nodes.push({ type: 'blockquote', children: convertDomToNodes(el) });
    } else if (tag === 'hr') {
      nodes.push({ type: 'scene_break' });
    } else if (tag === 'br') {
      nodes.push({ type: 'line_break' });
    } else if (tag === 'section' || tag === 'article') {
      nodes.push({ type: 'section', children: convertDomToNodes(el) });
    } else if (tag === 'sup' || tag === 'a') {
      const ref = el.getAttribute('id') || el.getAttribute('href') || el.textContent || '';
      if (el.classList.contains('footnote') || el.getAttribute('epub:type') === 'noteref') {
        nodes.push({
          type: 'footnote_ref',
          content: el.textContent ?? '',
          attributes: { ref },
        });
      } else {
        const children = convertInlineNodes(el);
        nodes.push(...children);
      }
    } else {
      const nested = convertDomToNodes(el);
      nodes.push(...nested);
    }
  }

  return nodes;
}

function convertInlineNodes(element: Element): DocumentNode[] {
  const nodes: DocumentNode[] = [];

  for (const child of Array.from(element.childNodes)) {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text) {
        nodes.push({ type: 'text', content: text });
      }
      continue;
    }

    if (child.nodeType !== Node.ELEMENT_NODE) continue;
    const el = child as Element;
    const tag = el.tagName.toLowerCase();

    if (tag === 'em' || tag === 'i') {
      nodes.push({ type: 'emphasis', children: convertInlineNodes(el) });
    } else if (tag === 'strong' || tag === 'b') {
      nodes.push({ type: 'strong', children: convertInlineNodes(el) });
    } else if (tag === 'br') {
      nodes.push({ type: 'line_break' });
    } else if (tag === 'sup') {
      const ref = el.textContent ?? '';
      nodes.push({ type: 'footnote_ref', content: ref, attributes: { ref } });
    } else if (tag === 'span') {
      nodes.push(...convertInlineNodes(el));
    } else {
      nodes.push(...convertInlineNodes(el));
    }
  }

  return nodes;
}

function isHeading(tag: string): boolean {
  return /^h[1-6]$/.test(tag);
}

export async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}
