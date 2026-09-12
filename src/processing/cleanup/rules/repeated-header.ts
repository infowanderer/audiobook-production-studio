import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const repeatedHeaderRule: CleanupRule = {
  id: 'repeated_header',
  name: 'Detect Repeated Headers',
  description: 'Removes paragraphs at the start of a chapter that appear to be repeated running headers.',
  defaultEnabled: true,
  category: 'artifact_removal',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    if (nodes.length < 2) return { nodes, changes };

    const firstNode = nodes[0];
    if (firstNode.type !== 'paragraph') return { nodes, changes };

    const text = getPlainText(firstNode).trim();
    if (text.length === 0 || text.length > 80) return { nodes, changes };

    const isLikelyHeader =
      text === text.toUpperCase() && /^[A-Z\s\d\-:.]+$/.test(text) && text.length <= 60;

    if (isLikelyHeader) {
      changes.push({
        ruleId: 'repeated_header',
        operationType: 'remove',
        location: { chapterIndex, nodeIndex: 0 },
        originalText: text,
        replacementText: '',
        confidence: 'medium',
        status: 'pending',
      });
      return { nodes: nodes.slice(1), changes };
    }

    return { nodes, changes };
  },
};

function getPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  return (node.children ?? []).map(getPlainText).join('');
}
