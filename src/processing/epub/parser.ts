import JSZip from 'jszip';
import type { Book, Chapter, DocumentNode, SemanticRole } from '@/processing/document/model';
import { hasNarratableContent } from '@/processing/document/model';

interface SpineItem {
  id: string;
  href: string;
  title?: string;
  properties?: string;
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
  const navHrefs = new Set(tocItems.map((t) => t.href.split('#')[0]));

  const chapters: Chapter[] = [];
  for (let i = 0; i < spineItems.length; i++) {
    const item = spineItems[i];
    const fullPath = opfDir + item.href;
    const content = await readZipFile(zip, fullPath);
    if (!content) continue;

    const chapterTitle = findTocTitle(tocItems, item.href) || item.title || `Section ${i + 1}`;
    const nodes = parseXhtmlToNodes(content);

    if (!hasNarratableContent(nodes)) continue;

    const isNav = item.properties?.includes('nav') || isNavigationOnly(content);

    chapters.push({
      index: chapters.length,
      title: chapterTitle,
      nodes,
      sourceId: item.id,
      narrationEligible: !isNav,
      exclusionReason: isNav ? 'navigation-only content' : undefined,
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

function extractManifest(opfDoc: Document): Map<string, { href: string; mediaType: string; properties?: string }> {
  const manifest = new Map<string, { href: string; mediaType: string; properties?: string }>();
  const items = opfDoc.querySelectorAll('manifest > item');
  items.forEach((item) => {
    const id = item.getAttribute('id') ?? '';
    const href = item.getAttribute('href') ?? '';
    const mediaType = item.getAttribute('media-type') ?? '';
    const properties = item.getAttribute('properties') ?? undefined;
    if (id && href) manifest.set(id, { href, mediaType, properties });
  });
  return manifest;
}

function extractSpine(opfDoc: Document, manifest: Map<string, { href: string; mediaType: string; properties?: string }>): SpineItem[] {
  const items: SpineItem[] = [];
  const spineRefs = opfDoc.querySelectorAll('spine > itemref');
  spineRefs.forEach((ref) => {
    const idref = ref.getAttribute('idref') ?? '';
    const entry = manifest.get(idref);
    if (entry) {
      items.push({ id: idref, href: entry.href, properties: entry.properties });
    }
  });
  return items;
}

async function extractToc(
  zip: JSZip,
  opfDoc: Document,
  manifest: Map<string, { href: string; mediaType: string; properties?: string }>,
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

function isNavigationOnly(content: string): boolean {
  const bodyMatch = content.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (!bodyMatch) return false;
  const bodyHtml = bodyMatch[1];
  if (!bodyHtml.includes('epub:type="toc"') && !bodyHtml.includes('epub:type="landmarks"') && !bodyHtml.includes('epub:type="page-list")) {
    return false;
  }
  const doc = new DOMParser().parseFromString(`<div>${bodyHtml}</div>`, 'text/html');
  const root = doc.querySelector('div');
  if (!root) return false;
  for (const child of Array.from(root.children)) {
    const tag = child.tagName.toLowerCase();
    if (tag === 'nav') continue;
    if (child.getAttribute('epub:type') === 'toc' || child.getAttribute('epub:type') === 'landmarks' || child.getAttribute('epub:type') === 'page-list') continue;
    const text = child.textContent?.trim() ?? '';
    if (text) return false;
  }
  return true;
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

function getEpubType(el: Element): string | null {
  return el.getAttribute('epub:type') || el.getAttributeNS('http://www.idpf.org/2007/ops', 'type') || null;
}

function isHidden(el: Element): boolean {
  const style = el.getAttribute('style') ?? '';
  if (/display\s*:\s*none/i.test(style)) return true;
  if (/visibility\s*:\s*hidden/i.test(style)) return true;
  if (el.getAttribute('aria-hidden') === 'true') return true;
  return false;
}

function isFilenameAlt(alt: string): boolean {
  const trimmed = alt.trim().toLowerCase();
  if (!trimmed) return true;
  if (/\.(jpg|jpeg|png|gif|svg|webp)$/i.test(trimmed)) return true;
  if (/^image\d+/i.test(trimmed)) return true;
  if (/^chapter_?\d+/i.test(trimmed)) return true;
  if (/^[a-z0-9_\-]+\.(jpg|png|gif|svg)$/i.test(trimmed)) return true;
  return false;
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

    if (isHidden(el)) {
      const text = el.textContent?.trim() ?? '';
      if (text) {
        nodes.push({
          type: 'non_narratable',
          children: [{ type: 'text', content: text }],
          semanticRole: 'hidden',
          narrationExcluded: true,
          exclusionReason: 'hidden element (display:none, visibility:hidden, or aria-hidden)',
        });
      }
      continue;
    }

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
      const role = inferSectionRole(el);
      const sectionNode: DocumentNode = {
        type: 'section',
        children: convertDomToNodes(el),
      };
      if (role) {
        sectionNode.semanticRole = role;
      }
      nodes.push(sectionNode);
    } else if (tag === 'aside') {
      const epubType = getEpubType(el);
      if (epubType === 'footnote' || el.classList.contains('footnote') || el.getAttribute('role') === 'footnote') {
        const id = el.getAttribute('id') ?? el.getAttribute('data-id') ?? '';
        nodes.push({
          type: 'footnote',
          children: convertInlineNodes(el),
          attributes: { id },
          semanticRole: 'footnote',
          narrationExcluded: true,
          exclusionReason: 'footnote content (not narrated by default)',
        });
      } else {
        const nested = convertDomToNodes(el);
        nodes.push(...nested);
      }
    } else if (tag === 'sup' || tag === 'a') {
      const epubType = getEpubType(el);
      if (tag === 'sup' && (epubType === 'noteref' || el.classList.contains('footnote') || el.classList.contains('noteref'))) {
        const ref = el.textContent ?? '';
        const href = el.querySelector('a')?.getAttribute('href') ?? '';
        nodes.push({
          type: 'footnote_ref',
          content: ref,
          attributes: { ref, href },
          semanticRole: 'footnote_ref',
          narrationExcluded: true,
          exclusionReason: 'footnote reference',
        });
      } else if (tag === 'a') {
        const href = el.getAttribute('href') ?? '';
        const epubTypeA = getEpubType(el);
        if (epubTypeA === 'noteref' || el.classList.contains('footnote') || el.classList.contains('noteref')) {
          const ref = el.textContent ?? '';
          nodes.push({
            type: 'footnote_ref',
            content: ref,
            attributes: { ref, href },
            semanticRole: 'footnote_ref',
            narrationExcluded: true,
            exclusionReason: 'footnote reference',
          });
        } else if (epubTypeA === 'backlink' || isBacklink(el)) {
          nodes.push({
            type: 'footnote_backlink',
            content: el.textContent ?? '',
            attributes: { href },
            semanticRole: 'footnote_backlink',
            narrationExcluded: true,
            exclusionReason: 'footnote backlink (navigation aid)',
          });
        } else if (isInternalLink(href)) {
          const linkChildren = convertInlineNodes(el);
          const linkNode: DocumentNode = {
            type: 'hyperlink',
            children: linkChildren,
            attributes: { href },
          };
          if (isNavigationLink(el, epubTypeA)) {
            linkNode.semanticRole = 'navigation';
            linkNode.narrationExcluded = true;
            linkNode.exclusionReason = 'navigation-only link';
          } else {
            linkNode.semanticRole = 'cross_reference';
          }
          nodes.push(linkNode);
        } else {
          const linkChildren = convertInlineNodes(el);
          if (linkChildren.length > 0) {
            nodes.push({
              type: 'hyperlink',
              children: linkChildren,
              attributes: { href },
            });
          }
        }
      } else {
        const ref = el.textContent ?? '';
        nodes.push({
          type: 'footnote_ref',
          content: ref,
          attributes: { ref },
          semanticRole: 'footnote_ref',
          narrationExcluded: true,
          exclusionReason: 'footnote reference (superscript)',
        });
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      const isDecorative = alt.trim() === '' || isFilenameAlt(alt);
      nodes.push({
        type: 'image',
        attributes: { src, alt },
        semanticRole: isDecorative ? 'decorative' : 'caption',
        narrationExcluded: isDecorative,
        exclusionReason: isDecorative ? (alt.trim() === '' ? 'decorative image (no alt text)' : 'image alt text appears to be a filename') : undefined,
      });
    } else if (tag === 'table') {
      nodes.push(convertTable(el));
    } else if (tag === 'figure') {
      const figNodes: DocumentNode[] = [];
      const img = el.querySelector('img');
      const figcaption = el.querySelector('figcaption');
      if (img) {
        const src = img.getAttribute('src') ?? '';
        const alt = img.getAttribute('alt') ?? '';
        const isDecorative = alt.trim() === '' || isFilenameAlt(alt);
        figNodes.push({
          type: 'image',
          attributes: { src, alt },
          semanticRole: isDecorative ? 'decorative' : 'caption',
          narrationExcluded: isDecorative,
          exclusionReason: isDecorative ? (alt.trim() === '' ? 'decorative image (no alt text)' : 'image alt text appears to be a filename') : undefined,
        });
      }
      if (figcaption) {
        const capText = figcaption.textContent?.trim() ?? '';
        if (capText) {
          figNodes.push({
            type: 'caption',
            children: [{ type: 'text', content: capText }],
            semanticRole: 'caption',
          });
        }
      }
      nodes.push(...figNodes);
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

    if (isHidden(el)) {
      continue;
    }

    if (tag === 'em' || tag === 'i') {
      nodes.push({ type: 'emphasis', children: convertInlineNodes(el) });
    } else if (tag === 'strong' || tag === 'b') {
      nodes.push({ type: 'strong', children: convertInlineNodes(el) });
    } else if (tag === 'br') {
      nodes.push({ type: 'line_break' });
    } else if (tag === 'sup') {
      const epubType = getEpubType(el);
      if (epubType === 'noteref' || el.classList.contains('footnote') || el.classList.contains('noteref')) {
        const ref = el.textContent ?? '';
        const href = el.querySelector('a')?.getAttribute('href') ?? '';
        nodes.push({
          type: 'footnote_ref',
          content: ref,
          attributes: { ref, href },
          semanticRole: 'footnote_ref',
          narrationExcluded: true,
          exclusionReason: 'footnote reference',
        });
      } else {
        const ref = el.textContent ?? '';
        if (ref.trim()) {
          nodes.push({ type: 'text', content: ref });
        }
      }
    } else if (tag === 'a') {
      const href = el.getAttribute('href') ?? '';
      const epubType = getEpubType(el);
      if (epubType === 'noteref' || el.classList.contains('footnote') || el.classList.contains('noteref')) {
        const ref = el.textContent ?? '';
        nodes.push({
          type: 'footnote_ref',
          content: ref,
          attributes: { ref, href },
          semanticRole: 'footnote_ref',
          narrationExcluded: true,
          exclusionReason: 'footnote reference',
        });
      } else if (epubType === 'backlink' || isBacklink(el)) {
        nodes.push({
          type: 'footnote_backlink',
          content: el.textContent ?? '',
          attributes: { href },
          semanticRole: 'footnote_backlink',
          narrationExcluded: true,
          exclusionReason: 'footnote backlink (navigation aid)',
        });
      } else if (isInternalLink(href)) {
        const linkChildren = convertInlineNodes(el);
        const linkNode: DocumentNode = {
          type: 'hyperlink',
          children: linkChildren,
          attributes: { href },
        };
        if (isNavigationLink(el, epubType)) {
          linkNode.semanticRole = 'navigation';
          linkNode.narrationExcluded = true;
          linkNode.exclusionReason = 'navigation-only link';
        } else {
          linkNode.semanticRole = 'cross_reference';
        }
        nodes.push(linkNode);
      } else {
        const linkChildren = convertInlineNodes(el);
        if (linkChildren.length > 0) {
          nodes.push({
            type: 'hyperlink',
            children: linkChildren,
            attributes: { href },
          });
        }
      }
    } else if (tag === 'img') {
      const src = el.getAttribute('src') ?? '';
      const alt = el.getAttribute('alt') ?? '';
      const isDecorative = alt.trim() === '' || isFilenameAlt(alt);
      nodes.push({
        type: 'image',
        attributes: { src, alt },
        semanticRole: isDecorative ? 'decorative' : 'caption',
        narrationExcluded: isDecorative,
        exclusionReason: isDecorative ? (alt.trim() === '' ? 'decorative image (no alt text)' : 'image alt text appears to be a filename') : undefined,
      });
    } else if (tag === 'span') {
      const epubType = getEpubType(el);
      if (epubType === 'noteref') {
        const ref = el.textContent ?? '';
        nodes.push({
          type: 'footnote_ref',
          content: ref,
          attributes: { ref },
          semanticRole: 'footnote_ref',
          narrationExcluded: true,
          exclusionReason: 'footnote reference',
        });
      } else {
        nodes.push(...convertInlineNodes(el));
      }
    } else {
      nodes.push(...convertInlineNodes(el));
    }
  }

  return nodes;
}

function convertTable(tableEl: Element): DocumentNode {
  const rows: DocumentNode[] = [];
  let caption: DocumentNode | null = null;

  const capEl = tableEl.querySelector('caption');
  if (capEl && capEl.textContent?.trim()) {
    caption = {
      type: 'caption',
      children: [{ type: 'text', content: capEl.textContent.trim() }],
      semanticRole: 'caption',
    };
  }

  const trs = tableEl.querySelectorAll('tr');
  for (const tr of Array.from(trs)) {
    const cells: DocumentNode[] = [];
    const tds = tr.querySelectorAll('td, th');
    for (const td of Array.from(tds)) {
      const cellChildren = convertInlineNodes(td);
      cells.push({
        type: 'table_cell',
        children: cellChildren.length > 0 ? cellChildren : [{ type: 'text', content: '' }],
      });
    }
    if (cells.length > 0) {
      rows.push({ type: 'table_row', children: cells });
    }
  }

  const children: DocumentNode[] = [];
  if (caption) children.push(caption);
  children.push(...rows);

  return {
    type: 'table',
    children,
  };
}

function isBacklink(el: Element): boolean {
  const epubType = getEpubType(el);
  if (epubType === 'backlink') return true;
  const href = el.getAttribute('href') ?? '';
  if (/^#/.test(href) && (el.classList.contains('backlink') || el.classList.contains('return'))) return true;
  const text = el.textContent?.trim().toLowerCase() ?? '';
  if (href.startsWith('#') && (text === '\u21A9' || text === '\u2190' || text === 'back' || text === 'return')) return true;
  return false;
}

function isInternalLink(href: string): boolean {
  return href.startsWith('#') || href.startsWith('../') || (!href.startsWith('http://') && !href.startsWith('https://') && !href.startsWith('mailto:') && href.length > 0);
}

function isNavigationLink(el: Element, epubType: string | null): boolean {
  if (epubType === 'toc' || epubType === 'landmarks' || epubType === 'page-list') return true;
  const parent = el.parentElement;
  if (!parent) return false;
  const parentTag = parent.tagName.toLowerCase();
  if (parentTag === 'nav') return true;
  const parentEpubType = getEpubType(parent);
  if (parentEpubType === 'toc' || parentEpubType === 'landmarks' || parentEpubType === 'page-list') return true;
  return false;
}

function inferSectionRole(el: Element): SemanticRole | undefined {
  const epubType = getEpubType(el);
  if (epubType === 'frontmatter') return 'front_matter';
  if (epubType === 'backmatter') return 'back_matter';
  if (epubType === 'titlepage') return 'title_page';
  if (epubType === 'dedication') return 'dedication';
  if (epubType === 'epigraph') return 'epigraph';
  if (epubType === 'copyright-page') return 'copyright';
  if (epubType === 'acknowledgments') return 'acknowledgments';
  if (epubType === 'appendix') return 'appendix';
  if (epubType === 'references') return 'references';
  if (epubType === 'contributors') return 'author_bio';
  if (epubType === 'toc') return 'table_of_contents';
  return undefined;
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
