import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const whitespaceNormalizationRule: CleanupRule = {
  id: 'whitespace_normalization',
  name: 'Normalize Whitespace',
  description: 'Collapses excessive whitespace within text while preserving paragraph breaks.',
  defaultEnabled: true,
  category: 'whitespace',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    const result = nodes.map((node, nodeIndex) =>
      normalizeWhitespaceInNode(node, chapterIndex, nodeIndex, changes),
    );
    return { nodes: result, changes };
  },
};

function normalizeWhitespaceInNode(
  node: DocumentNode,
  chapterIndex: number,
  nodeIndex: number,
  changes: CleanupChange[],
): DocumentNode {
  if (node.type === 'text' && node.content) {
    const original = node.content;
    const normalized = original.replace(/[ \t]+/g, ' ');
    if (normalized !== original) {
      changes.push({
        ruleId: 'whitespace_normalization',
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
        normalizeWhitespaceInNode(child, chapterIndex, ci, changes),
      ),
    };
  }

  return node;
}
