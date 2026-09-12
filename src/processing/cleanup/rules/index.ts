import type { CleanupRule } from '@/processing/cleanup/types';
import { standalonePageNumberRule } from './standalone-page-number';
import { repeatedHeaderRule } from './repeated-header';
import { repeatedFooterRule } from './repeated-footer';
import { whitespaceNormalizationRule } from './whitespace-normalization';
import { lineBreakNormalizationRule } from './line-break-normalization';
import { unicodeNormalizationRule } from './unicode-normalization';

export const ALL_CLEANUP_RULES: CleanupRule[] = [
  standalonePageNumberRule,
  repeatedHeaderRule,
  repeatedFooterRule,
  whitespaceNormalizationRule,
  lineBreakNormalizationRule,
  unicodeNormalizationRule,
];

export function getRuleById(id: string): CleanupRule | undefined {
  return ALL_CLEANUP_RULES.find((r) => r.id === id);
}
