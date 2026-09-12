import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const lineBreakNormalizationRule: CleanupRule = {
  id: 'line_break_normalization',
  name: 'Normalize Line Breaks',
  description: 'Removes excessive blank lines and normalizes line break patterns.',
  defaultEnabled: true,
  category: 'whitespace',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    const filtered: DocumentNode[] = [];
    let consecutiveBreaks = 0;

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      if (node.type === 'paragraph') {
        const text = getPlainText(node).trim();
        if (text === '') {
          consecutiveBreaks++;
          if (consecutiveBreaks > 2) {
            changes.push({
              ruleId: 'line_break_normalization',
              operationType: 'remove',
              location: { chapterIndex, nodeIndex: i },
              originalText: '(blank line)',
              replacementText: '',
              confidence: 'high',
              status: 'pending',
            });
            continue;
          }
        } else {
          consecutiveBreaks = 0;
        }
      } else {
        consecutiveBreaks = 0;
      }

      filtered.push(node);
    }

    return { nodes: filtered, changes };
  },
};

function getPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  return (node.children ?? []).map(getPlainText).join('');
}
