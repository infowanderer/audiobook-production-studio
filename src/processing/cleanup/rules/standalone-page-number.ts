import type { CleanupRule, CleanupRuleResult } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export const standalonePageNumberRule: CleanupRule = {
  id: 'standalone_page_number',
  name: 'Remove Standalone Page Numbers',
  description: 'Removes paragraphs that contain only a page number.',
  defaultEnabled: true,
  category: 'artifact_removal',

  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult {
    const changes: CleanupChange[] = [];
    const filtered = nodes.filter((node, nodeIndex) => {
      if (node.type !== 'paragraph') return true;

      const text = getPlainText(node).trim();
      if (/^\d{1,5}$/.test(text)) {
        changes.push({
          ruleId: 'standalone_page_number',
          operationType: 'remove',
          location: { chapterIndex, nodeIndex },
          originalText: text,
          replacementText: '',
          confidence: 'high',
          status: 'pending',
        });
        return false;
      }
      return true;
    });

    return { nodes: filtered, changes };
  },
};

function getPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  return (node.children ?? []).map(getPlainText).join('');
}
