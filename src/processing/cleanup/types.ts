import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export interface CleanupRule {
  id: string;
  name: string;
  description: string;
  defaultEnabled: boolean;
  category: 'artifact_removal' | 'whitespace' | 'unicode' | 'structural' | 'advanced';
  apply(nodes: DocumentNode[], chapterIndex: number): CleanupRuleResult;
}

export interface CleanupRuleResult {
  nodes: DocumentNode[];
  changes: CleanupChange[];
}

export interface CleanupConfig {
  [ruleId: string]: boolean;
}

export const DEFAULT_CLEANUP_CONFIG: CleanupConfig = {
  standalone_page_number: true,
  repeated_header: true,
  repeated_footer: true,
  whitespace_normalization: true,
  line_break_normalization: true,
  unicode_normalization: true,
  remove_publisher_ads: false,
  remove_copyright_pages: false,
};
