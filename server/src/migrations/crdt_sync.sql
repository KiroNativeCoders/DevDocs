-- Migration: Real-time update append log & periodic snapshot checkpoint storage
-- This enables a production dual-tier storage strategy:
-- 1. `document_update_log`: High-frequency append-only log of CRDT diffs.
-- 2. `document_snapshot`: Periodic (every 1 min / doc close) compacted full document state checkpoint.

-- 1. Full Snapshot Checkpoints (Compacted Yjs State)
CREATE TABLE IF NOT EXISTS document_snapshot (
  document_id TEXT PRIMARY KEY REFERENCES document(id) ON DELETE CASCADE,
  snapshot BYTEA NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_doc_snapshot_updated ON document_snapshot(updated_at);

-- 2. Incremental CRDT Diff Append Log
CREATE TABLE IF NOT EXISTS document_update_log (
  id BIGSERIAL PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES document(id) ON DELETE CASCADE,
  diff BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_doc_update_log_lookup ON document_update_log(document_id, id);
CREATE INDEX IF NOT EXISTS idx_doc_update_log_created ON document_update_log(created_at);

-- Enable Row Level Security (Service role manages sync; users can read if they have document access)
ALTER TABLE document_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_update_log ENABLE ROW LEVEL SECURITY;

-- Allow users with membership or ownership to read snapshots
CREATE POLICY "Users can read snapshots of their accessible docs"
  ON document_snapshot
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM document d
      LEFT JOIN membership m ON m.document_id = d.id
      WHERE d.id = document_snapshot.document_id
      AND (d.owner_id = auth.uid() OR m.user_id = auth.uid())
    )
  );

-- Service role bypasses RLS automatically for writes in collab.ts.
