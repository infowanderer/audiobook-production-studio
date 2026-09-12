import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const unicodeNormalizationRule: CleanupRule = {
  id: 'unicode_normalization',
  name: 'Normalize Unicode',
  description: 'Normalizes Unicode characters: smart quotes, dashes, ellipses, and non-breaking spaces.',
  defaultEnabled: true,
  category: 'unicode',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    const result = nodes.map((node, nodeIndex) =>
      normalizeUnicodeInNode(node, chapterIndex, nodeIndex, changes),
    );
    return { nodes: result, changes };
  },
};

const UNICODE_REPLACEMENTS: [RegExp, string, string][] = [
  [/\u00A0/g, ' ', 'non-breaking space to space'],
  [/\u2013/g, '\u2013', 'en-dash preserved'],
  [/\u2014/g, '\u2014', 'em-dash preserved'],
  [/\u2026/g, '\u2026', 'ellipsis preserved'],
  [/\ufeff/g, '', 'BOM removed'],
  [/\u200B/g, '', 'zero-width space removed'],
  [/\u200C/g, '', 'zero-width non-joiner removed'],
  [/\u200D/g, '', 'zero-width joiner removed'],
  [/\u00AD/g, '', 'soft hyphen removed'],
];

function normalizeUnicodeInNode(
  node: DocumentNode,
  chapterIndex: number,
  nodeIndex: number,
  changes: CleanupChange[],
): DocumentNode {
  if (node.type === 'text' && node.content) {
    const original = node.content;
    let normalized = original;

    for (const [pattern, replacement] of UNICODE_REPLACEMENTS) {
      normalized = normalized.replace(pattern, replacement);
    }

    if (normalized !== original) {
      changes.push({
        ruleId: 'unicode_normalization',
        operationType: 'replace',
        location: { chapterIndex, nodeIndex },
        originalText: original,
        replacementText: normalized,
        confidence: 'high',
        status: 'pending',
      });
      return { ...node, content: normalized };
    }
    return node;
  }

  if (node.children) {
    return {
      ...node,
      children: node.children.map((child, ci) =>
        normalizeUnicodeInNode(child, chapterIndex, ci, changes),
      ),
    };
  }

  return node;
}
