import type { DocumentNode, CleanupChange, Chapter } from '@/processing/document/model';
import { cloneNodes, isNodeEmpty } from '@/processing/document/model';

export interface NarrationPreparationResult {
  nodes: DocumentNode[];
  changes: NarrationExclusion[];
}

export interface NarrationExclusion {
  ruleId: string;
  operationType: string;
  location: {
    chapterIndex: number;
    nodeIndex?: number;
    offset?: number;
  };
  originalText: string;
  replacementText: string;
  confidence: 'high' | 'medium' | 'low';
  status: 'pending' | 'accepted' | 'rejected';
  reason: string;
}

export function prepareNarration(
  originalNodes: DocumentNode[],
  chapterIndex: number,
): NarrationPreparationResult {
  const nodes = cloneNodes(originalNodes);
  const exclusions: NarrationExclusion[] = [];

  const result = processNodes(nodes, chapterIndex, exclusions);

  return {
    nodes: result,
    changes: exclusions,
  };
}

export function prepareChapterNarration(chapter: Chapter): {
  chapter: Chapter;
  exclusions: NarrationExclusion[];
} {
  const result = prepareNarration(chapter.nodes, chapter.index);
  return {
    chapter: {
      ...chapter,
      nodes: result.nodes,
    },
    exclusions: result.changes,
  };
}

function processNodes(
  nodes: DocumentNode[],
  chapterIndex: number,
  exclusions: NarrationExclusion[],
): DocumentNode[] {
  const result: DocumentNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (node.narrationExcluded) {
      exclusions.push({
        ruleId: 'narration_preparation',
        operationType: 'exclude',
        location: { chapterIndex, nodeIndex: i },
        originalText: getPlainText(node),
        replacementText: '',
        confidence: 'high',
        status: 'accepted',
        reason: node.exclusionReason ?? 'excluded from narration',
      });
    }

    if (isNodeEmpty(node) && !node.narrationExcluded) {
      exclusions.push({
        ruleId: 'narration_preparation',
        operationType: 'remove_empty',
        location: { chapterIndex, nodeIndex: i },
        originalText: getPlainText(node),
        replacementText: '',
        confidence: 'high',
        status: 'accepted',
        reason: 'empty structural node',
      });
      continue;
    }

    if (node.children && node.children.length > 0) {
      node.children = processChildren(node.children, chapterIndex, i, exclusions);
    }

    result.push(node);
  }

  return result;
}

function processChildren(
  nodes: DocumentNode[],
  chapterIndex: number,
  parentIndex: number,
  exclusions: NarrationExclusion[],
): DocumentNode[] {
  const result: DocumentNode[] = [];

  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];

    if (isNodeEmpty(node) && !node.narrationExcluded) {
      exclusions.push({
        ruleId: 'narration_preparation',
        operationType: 'remove_empty',
        location: { chapterIndex, nodeIndex: parentIndex, offset: i },
        originalText: getPlainText(node),
        replacementText: '',
        confidence: 'high',
        status: 'accepted',
        reason: 'empty structural node',
      });
      continue;
    }

    if (node.children && node.children.length > 0) {
      node.children = processChildren(node.children, chapterIndex, parentIndex, exclusions);
    }

    result.push(node);
  }

  return result;
}

function getPlainText(node: DocumentNode): string {
  if (node.type === 'text') return node.content ?? '';
  if (!node.children) return '';
  return node.children.map(getPlainText).join('');
}

export function exclusionToCleanupChange(
  exclusion: NarrationExclusion,
): CleanupChange {
  return {
    ruleId: exclusion.ruleId,
    operationType: exclusion.operationType,
    location: exclusion.location,
    originalText: exclusion.originalText,
    replacementText: exclusion.replacementText,
    confidence: exclusion.confidence,
    status: exclusion.status,
  };
}
