import type { DocumentNode, CleanupChange, ProcessingMetadata } from '@/processing/document/model';
import { cloneNodes } from '@/processing/document/model';
import type { CleanupConfig } from './types';
import { ALL_CLEANUP_RULES } from './rules';

export interface CleanupResult {
  nodes: DocumentNode[];
  changes: CleanupChange[];
  metadata: ProcessingMetadata;
}

export function runCleanup(
  originalNodes: DocumentNode[],
  chapterIndex: number,
  config: CleanupConfig,
): CleanupResult {
  let nodes = cloneNodes(originalNodes);
  const allChanges: CleanupChange[] = [];
  const appliedRules: string[] = [];

  for (const rule of ALL_CLEANUP_RULES) {
    if (config[rule.id] !== true) continue;

    const result = rule.apply(nodes, chapterIndex);
    nodes = result.nodes;
    allChanges.push(...result.changes);
    appliedRules.push(rule.id);
  }

  return {
    nodes,
    changes: allChanges,
    metadata: {
      appVersion: '0.1.0',
      formatVersion: 1,
      cleanupRules: appliedRules,
      processorVersion: '0.1.0',
      timestamp: new Date().toISOString(),
    },
  };
}
