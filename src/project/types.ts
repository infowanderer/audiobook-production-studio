import type { CleanupConfig } from '@/processing/cleanup/types';
import type { DocumentNode, CleanupChange } from '@/processing/document/model';

export interface Project {
  id: string;
  name: string;
  sourceFilename: string | null;
  sourceHash: string | null;
  appVersion: string;
  formatVersion: number;
  status: ProjectStatus;
  cleanupConfig: CleanupConfig;
  exportSettings: ExportSettings;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ProjectStatus =
  | 'created'
  | 'importing'
  | 'imported'
  | 'extracting'
  | 'extracted'
  | 'preparing_narration'
  | 'narration_prepared'
  | 'cleaning'
  | 'cleaned'
  | 'reviewing'
  | 'reviewed'
  | 'exporting'
  | 'exported';

export interface ChapterRecord {
  id: string;
  projectId: string;
  chapterIndex: number;
  title: string;
  originalContent: DocumentNode[];
  cleanedContent: DocumentNode[] | null;
  reviewStatus: ReviewStatus;
  sourceHash: string | null;
  processingMetadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type ReviewStatus = 'not_processed' | 'needs_review' | 'accepted' | 'manually_edited';

export interface ExportSettings {
  format: 'txt' | 'html' | 'both';
  perChapter: boolean;
  combined: boolean;
}

export interface ChangeRecord {
  id: string;
  chapterId: string;
  projectId: string;
  ruleId: string;
  operationType: string;
  location: Record<string, unknown>;
  originalText: string;
  replacementText: string;
  confidence: string;
  status: string;
}

export function dbToProject(row: Record<string, unknown>): Project {
  return {
    id: row.id as string,
    name: row.name as string,
    sourceFilename: row.source_filename as string | null,
    sourceHash: row.source_hash as string | null,
    appVersion: row.app_version as string,
    formatVersion: row.format_version as number,
    status: row.status as ProjectStatus,
    cleanupConfig: (row.cleanup_config ?? {}) as CleanupConfig,
    exportSettings: (row.export_settings ?? { format: 'both', perChapter: true, combined: true }) as ExportSettings,
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbToChapter(row: Record<string, unknown>): ChapterRecord {
  return {
    id: row.id as string,
    projectId: row.project_id as string,
    chapterIndex: row.chapter_index as number,
    title: row.title as string,
    originalContent: (row.original_content ?? []) as DocumentNode[],
    cleanedContent: row.cleaned_content as DocumentNode[] | null,
    reviewStatus: row.review_status as ReviewStatus,
    sourceHash: row.source_hash as string | null,
    processingMetadata: (row.processing_metadata ?? {}) as Record<string, unknown>,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

export function dbToChange(row: Record<string, unknown>): ChangeRecord {
  return {
    id: row.id as string,
    chapterId: row.chapter_id as string,
    projectId: row.project_id as string,
    ruleId: row.rule_id as string,
    operationType: row.operation_type as string,
    location: (row.location ?? {}) as Record<string, unknown>,
    originalText: row.original_text as string,
    replacementText: row.replacement_text as string,
    confidence: row.confidence as string,
    status: row.status as string,
  };
}
