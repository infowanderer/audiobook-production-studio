/*
# Create Audiobook Production Studio tables

1. New Tables
  - `projects` — audiobook production project metadata
    - `id` (uuid, primary key)
    - `name` (text) — project display name
    - `source_filename` (text) — original EPUB filename
    - `source_hash` (text) — SHA-256 hash of original EPUB
    - `app_version` (text) — application version used
    - `format_version` (integer) — project format version for future migration
    - `status` (text) — overall project status
    - `cleanup_config` (jsonb) — which cleanup rules are enabled
    - `export_settings` (jsonb) — export preferences
    - `metadata` (jsonb) — extensible metadata for processing info
    - `created_at` / `updated_at` (timestamptz)

  - `chapters` — extracted chapters per project
    - `id` (uuid, primary key)
    - `project_id` (uuid, FK to projects)
    - `chapter_index` (integer) — ordering
    - `title` (text) — chapter title
    - `original_content` (jsonb) — structured document model (original)
    - `cleaned_content` (jsonb) — structured document model (after cleanup)
    - `review_status` (text) — not_processed / needs_review / accepted / manually_edited
    - `source_hash` (text) — hash of original content for cache keys
    - `processing_metadata` (jsonb) — version/rule info for reproducibility
    - `created_at` / `updated_at` (timestamptz)

  - `cleanup_changes` — individual tracked changes per chapter
    - `id` (uuid, primary key)
    - `chapter_id` (uuid, FK to chapters)
    - `project_id` (uuid, FK to projects)
    - `rule_id` (text) — which cleanup rule produced this change
    - `operation_type` (text) — the type of operation
    - `location` (jsonb) — where in the document
    - `original_text` (text) — text before change
    - `replacement_text` (text) — text after change
    - `confidence` (text) — high / medium / low
    - `status` (text) — pending / accepted / rejected
    - `created_at` (timestamptz)

2. Security
  - Enable RLS on all tables.
  - Allow anon + authenticated full CRUD (single-tenant, no auth).

3. Indexes
  - chapters.project_id
  - cleanup_changes.chapter_id
  - cleanup_changes.project_id
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  source_filename text,
  source_hash text,
  app_version text NOT NULL DEFAULT '0.1.0',
  format_version integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'created',
  cleanup_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  export_settings jsonb NOT NULL DEFAULT '{}'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_projects" ON projects;
CREATE POLICY "anon_select_projects" ON projects FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_projects" ON projects;
CREATE POLICY "anon_insert_projects" ON projects FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_projects" ON projects;
CREATE POLICY "anon_update_projects" ON projects FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_projects" ON projects;
CREATE POLICY "anon_delete_projects" ON projects FOR DELETE
  TO anon, authenticated USING (true);

-- Chapters table
CREATE TABLE IF NOT EXISTS chapters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  chapter_index integer NOT NULL,
  title text NOT NULL,
  original_content jsonb NOT NULL DEFAULT '[]'::jsonb,
  cleaned_content jsonb,
  review_status text NOT NULL DEFAULT 'not_processed',
  source_hash text,
  processing_metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_chapters" ON chapters;
CREATE POLICY "anon_select_chapters" ON chapters FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_chapters" ON chapters;
CREATE POLICY "anon_insert_chapters" ON chapters FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_chapters" ON chapters;
CREATE POLICY "anon_update_chapters" ON chapters FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_chapters" ON chapters;
CREATE POLICY "anon_delete_chapters" ON chapters FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_chapters_project_id ON chapters(project_id);

-- Cleanup changes table
CREATE TABLE IF NOT EXISTS cleanup_changes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  operation_type text NOT NULL,
  location jsonb NOT NULL DEFAULT '{}'::jsonb,
  original_text text NOT NULL DEFAULT '',
  replacement_text text NOT NULL DEFAULT '',
  confidence text NOT NULL DEFAULT 'high',
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE cleanup_changes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_cleanup_changes" ON cleanup_changes;
CREATE POLICY "anon_select_cleanup_changes" ON cleanup_changes FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_cleanup_changes" ON cleanup_changes;
CREATE POLICY "anon_insert_cleanup_changes" ON cleanup_changes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_cleanup_changes" ON cleanup_changes;
CREATE POLICY "anon_update_cleanup_changes" ON cleanup_changes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_cleanup_changes" ON cleanup_changes;
CREATE POLICY "anon_delete_cleanup_changes" ON cleanup_changes FOR DELETE
  TO anon, authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_cleanup_changes_chapter_id ON cleanup_changes(chapter_id);
CREATE INDEX IF NOT EXISTS idx_cleanup_changes_project_id ON cleanup_changes(project_id);
