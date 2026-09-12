import { describe, it, expect } from 'vitest';
import type { DocumentNode } from '@/processing/document/model';
import { standalonePageNumberRule } from './rules/standalone-page-number';
import { repeatedHeaderRule } from './rules/repeated-header';
import { repeatedFooterRule } from './rules/repeated-footer';
import { whitespaceNormalizationRule } from './rules/whitespace-normalization';
import { lineBreakNormalizationRule } from './rules/line-break-normalization';
import { unicodeNormalizationRule } from './rules/unicode-normalization';
import { runCleanup } from './engine';
import { ALL_CLEANUP_RULES, getRuleById } from './rules';
import { DEFAULT_CLEANUP_CONFIG } from './types';

function textParagraph(text: string): DocumentNode {
  return { type: 'paragraph', children: [{ type: 'text', content: text }] };
}

function emptyParagraph(): DocumentNode {
  return { type: 'paragraph', children: [{ type: 'text', content: '' }] };
}

describe('standalonePageNumberRule', () => {
  it('removes paragraphs that are just a number', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Some text'),
      textParagraph('42'),
      textParagraph('More text'),
    ];
    const result = standalonePageNumberRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].originalText).toBe('42');
    expect(result.changes[0].ruleId).toBe('standalone_page_number');
    expect(result.changes[0].operationType).toBe('remove');
    expect(result.changes[0].confidence).toBe('high');
  });

  it('keeps paragraphs with non-numeric text', () => {
    const nodes: DocumentNode[] = [textParagraph('Page 42'), textParagraph('123abc')];
    const result = standalonePageNumberRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(0);
  });

  it('removes multi-digit page numbers up to 5 digits', () => {
    const nodes: DocumentNode[] = [textParagraph('99999')];
    const result = standalonePageNumberRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(0);
    expect(result.changes).toHaveLength(1);
  });

  it('ignores 6+ digit numbers', () => {
    const nodes: DocumentNode[] = [textParagraph('123456')];
    const result = standalonePageNumberRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(0);
  });

  it('does not remove headings that are numbers', () => {
    const nodes: DocumentNode[] = [
      { type: 'heading', children: [{ type: 'text', content: '42' }], attributes: { level: '2' } },
    ];
    const result = standalonePageNumberRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(0);
  });
});

describe('repeatedHeaderRule', () => {
  it('removes an all-caps first paragraph that looks like a running header', () => {
    const nodes: DocumentNode[] = [
      textParagraph('THE GREAT BOOK'),
      { type: 'heading', children: [{ type: 'text', content: 'Chapter 1' }], attributes: { level: '2' } },
      textParagraph('Content here'),
    ];
    const result = repeatedHeaderRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.nodes[0].type).toBe('heading');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].confidence).toBe('medium');
  });

  it('keeps normal first paragraphs', () => {
    const nodes: DocumentNode[] = [
      textParagraph('It was a dark and stormy night.'),
      textParagraph('More text'),
    ];
    const result = repeatedHeaderRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(0);
  });

  it('keeps non-paragraph first nodes', () => {
    const nodes: DocumentNode[] = [
      { type: 'heading', children: [{ type: 'text', content: 'CHAPTER 1' }], attributes: { level: '2' } },
      textParagraph('Text'),
    ];
    const result = repeatedHeaderRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(0);
  });

  it('returns unchanged for single-node input', () => {
    const nodes: DocumentNode[] = [textParagraph('HEADER')];
    const result = repeatedHeaderRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(0);
  });

  it('ignores paragraphs longer than 60 chars even if all-caps', () => {
    const longCaps = 'A'.repeat(61);
    const nodes: DocumentNode[] = [textParagraph(longCaps), textParagraph('Text')];
    const result = repeatedHeaderRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(0);
  });
});

describe('repeatedFooterRule', () => {
  it('removes an all-caps last paragraph that looks like a footer', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Content here'),
      textParagraph('THE GREAT BOOK - PAGE 12'),
    ];
    const result = repeatedFooterRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].ruleId).toBe('repeated_footer');
  });

  it('removes a numeric-only last paragraph (page number)', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Content here'),
      textParagraph('103'),
    ];
    const result = repeatedFooterRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(1);
  });

  it('keeps normal last paragraphs', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Start'),
      textParagraph('She walked away quietly.'),
    ];
    const result = repeatedFooterRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(2);
    expect(result.changes).toHaveLength(0);
  });

  it('returns unchanged for single-node input', () => {
    const nodes: DocumentNode[] = [textParagraph('103')];
    const result = repeatedFooterRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(1);
    expect(result.changes).toHaveLength(0);
  });
});

describe('whitespaceNormalizationRule', () => {
  it('collapses multiple spaces to one', () => {
    const nodes: DocumentNode[] = [textParagraph('hello    world')];
    const result = whitespaceNormalizationRule.apply(nodes, 0);
    const text = result.nodes[0].children![0].content;
    expect(text).toBe('hello world');
    expect(result.changes).toHaveLength(1);
    expect(result.changes[0].ruleId).toBe('whitespace_normalization');
  });

  it('collapses tabs', () => {
    const nodes: DocumentNode[] = [textParagraph('hello\t\tworld')];
    const result = whitespaceNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('hello world');
  });

  it('leaves single spaces alone', () => {
    const nodes: DocumentNode[] = [textParagraph('hello world')];
    const result = whitespaceNormalizationRule.apply(nodes, 0);
    expect(result.changes).toHaveLength(0);
  });

  it('normalizes whitespace in nested children', () => {
    const nodes: DocumentNode[] = [
      {
        type: 'paragraph',
        children: [
          { type: 'emphasis', children: [{ type: 'text', content: 'very   important' }] },
        ],
      },
    ];
    const result = whitespaceNormalizationRule.apply(nodes, 0);
    const innerText = result.nodes[0].children![0].children![0].content;
    expect(innerText).toBe('very important');
  });
});

describe('lineBreakNormalizationRule', () => {
  it('allows up to 2 consecutive blank paragraphs', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Text'),
      emptyParagraph(),
      emptyParagraph(),
      textParagraph('More text'),
    ];
    const result = lineBreakNormalizationRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(4);
    expect(result.changes).toHaveLength(0);
  });

  it('removes blank paragraphs beyond the 2nd consecutive', () => {
    const nodes: DocumentNode[] = [
      textParagraph('Text'),
      emptyParagraph(),
      emptyParagraph(),
      emptyParagraph(),
      emptyParagraph(),
      textParagraph('More text'),
    ];
    const result = lineBreakNormalizationRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(4);
    expect(result.changes).toHaveLength(2);
    expect(result.changes[0].ruleId).toBe('line_break_normalization');
  });

  it('does not affect non-paragraph nodes', () => {
    const nodes: DocumentNode[] = [
      { type: 'scene_break' },
      { type: 'scene_break' },
      { type: 'scene_break' },
      { type: 'scene_break' },
    ];
    const result = lineBreakNormalizationRule.apply(nodes, 0);
    expect(result.nodes).toHaveLength(4);
    expect(result.changes).toHaveLength(0);
  });
});

describe('unicodeNormalizationRule', () => {
  it('replaces non-breaking spaces with regular spaces', () => {
    const nodes: DocumentNode[] = [textParagraph('hello\u00A0world')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('hello world');
    expect(result.changes).toHaveLength(1);
  });

  it('removes zero-width spaces', () => {
    const nodes: DocumentNode[] = [textParagraph('hel\u200Blo')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('hello');
  });

  it('removes soft hyphens', () => {
    const nodes: DocumentNode[] = [textParagraph('break\u00ADable')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('breakable');
  });

  it('removes BOM characters', () => {
    const nodes: DocumentNode[] = [textParagraph('\uFEFFhello')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('hello');
  });

  it('preserves em-dashes and en-dashes', () => {
    const nodes: DocumentNode[] = [textParagraph('word\u2014word\u2013word')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('word\u2014word\u2013word');
    expect(result.changes).toHaveLength(0);
  });

  it('preserves ellipsis', () => {
    const nodes: DocumentNode[] = [textParagraph('wait\u2026')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.nodes[0].children![0].content).toBe('wait\u2026');
    expect(result.changes).toHaveLength(0);
  });

  it('does not change clean text', () => {
    const nodes: DocumentNode[] = [textParagraph('Normal text here.')];
    const result = unicodeNormalizationRule.apply(nodes, 0);
    expect(result.changes).toHaveLength(0);
  });
});

describe('runCleanup (engine)', () => {
  it('applies all enabled rules and collects changes', () => {
    const nodes: DocumentNode[] = [
      textParagraph('RUNNING HEADER'),
      { type: 'heading', children: [{ type: 'text', content: 'Chapter' }], attributes: { level: '2' } },
      textParagraph('Some    text with\u00A0nbsp'),
      textParagraph('42'),
    ];
    const result = runCleanup(nodes, 0, DEFAULT_CLEANUP_CONFIG);

    expect(result.changes.length).toBeGreaterThan(0);
    expect(result.metadata.appVersion).toBe('0.1.0');
    expect(result.metadata.cleanupRules.length).toBeGreaterThan(0);

    const ruleIds = result.changes.map((c) => c.ruleId);
    expect(ruleIds).toContain('repeated_header');
  });

  it('skips disabled rules', () => {
    const nodes: DocumentNode[] = [textParagraph('42')];
    const config = { ...DEFAULT_CLEANUP_CONFIG, standalone_page_number: false };
    const result = runCleanup(nodes, 0, config);

    const pageNumChanges = result.changes.filter((c) => c.ruleId === 'standalone_page_number');
    expect(pageNumChanges).toHaveLength(0);
    expect(result.nodes).toHaveLength(1);
  });

  it('does not mutate the original nodes', () => {
    const original: DocumentNode[] = [textParagraph('hello\u00A0world')];
    const contentBefore = original[0].children![0].content;
    runCleanup(original, 0, DEFAULT_CLEANUP_CONFIG);
    expect(original[0].children![0].content).toBe(contentBefore);
  });

  it('applies rules in sequence (later rules see earlier changes)', () => {
    const nodes: DocumentNode[] = [
      textParagraph('HEADER TEXT'),
      textParagraph('Some text'),
      textParagraph('42'),
    ];
    const result = runCleanup(nodes, 0, DEFAULT_CLEANUP_CONFIG);
    const textNodes = result.nodes.filter((n) => n.type === 'paragraph');
    expect(textNodes.length).toBeLessThanOrEqual(1);
  });
});

describe('rule registry', () => {
  it('has 6 rules registered', () => {
    expect(ALL_CLEANUP_RULES).toHaveLength(6);
  });

  it('getRuleById returns the correct rule', () => {
    const rule = getRuleById('standalone_page_number');
    expect(rule).toBeDefined();
    expect(rule!.id).toBe('standalone_page_number');
  });

  it('getRuleById returns undefined for unknown id', () => {
    expect(getRuleById('nonexistent_rule')).toBeUndefined();
  });

  it('all rules have required properties', () => {
    for (const rule of ALL_CLEANUP_RULES) {
      expect(rule.id).toBeTruthy();
      expect(rule.name).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(typeof rule.defaultEnabled).toBe('boolean');
      expect(rule.category).toBeTruthy();
      expect(typeof rule.apply).toBe('function');
    }
  });
});
