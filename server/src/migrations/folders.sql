-- Migration: Create tables for persisting folder metadata and doc-folder assignments
-- Execute this SQL in your Supabase SQL Editor if creating directly in Supabase Postgres.

CREATE TABLE IF NOT EXISTS app_folder (
  id TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  parent_id TEXT REFERENCES app_folder(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_app_folder_user ON app_folder(user_id);
CREATE INDEX IF NOT EXISTS idx_app_folder_parent ON app_folder(parent_id);

CREATE TABLE IF NOT EXISTS app_doc_folder (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_id TEXT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  folder_id TEXT NOT NULL REFERENCES app_folder(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  UNIQUE(user_id, document_id)
);

CREATE INDEX IF NOT EXISTS idx_app_doc_folder_lookup ON app_doc_folder(user_id, document_id);
CREATE INDEX IF NOT EXISTS idx_app_doc_folder_folder ON app_doc_folder(folder_id);

-- Enable Row Level Security
ALTER TABLE app_folder ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_doc_folder ENABLE ROW LEVEL SECURITY;

-- RLS Policies: users manage only their own folders and assignments
CREATE POLICY "Users can manage their own folders"
  ON app_folder
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can manage their own doc folder assignments"
  ON app_doc_folder
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
