import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const repeatedFooterRule: CleanupRule = {
  id: 'repeated_footer',
  name: 'Detect Repeated Footers',
  description: 'Removes paragraphs at the end of a chapter that appear to be repeated running footers.',
  defaultEnabled: true,
  category: 'artifact_removal',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    if (nodes.length < 2) return { nodes, changes };

    const lastNode = nodes[nodes.length - 1];
    if (lastNode.type !== 'paragraph') return { nodes, changes };

    const text = getPlainText(lastNode).trim();
    if (text.length === 0 || text.length > 80) return { nodes, changes };

    const isLikelyFooter =
      (text === text.toUpperCase() && /^[A-Z\s\d\-:.]+$/.test(text) && text.length <= 60) ||
      /^\d{1,5}$/.test(text);

    if (isLikelyFooter) {
      changes.push({
        ruleId: 'repeated_footer',
        operationType: 'remove',
        location: { chapterIndex, nodeIndex: nodes.length - 1 },
        originalText: text,
        replacementText: '',
        confidence: 'medium',
        status: 'pending',
      });
      return { nodes: nodes.slice(0, -1), changes };
    }

    return { nodes, changes };
  },
};

function getPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  return (node.children ?? []).map(getPlainText).join('');
}
