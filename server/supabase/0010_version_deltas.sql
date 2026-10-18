-- Delta versioning with keyframes (supersedes the full-snapshot model in 0003).
--
-- A document's history is an ordered chain of Yjs updates:
--   * a KEYFRAME row stores a full Y.encodeStateAsUpdate(doc)
--   * a DELTA row stores Y.encodeStateAsUpdate(doc, previousStateVector) —
--     only the ops added since the previous version.
-- Every Nth version (KEYFRAME_EVERY, default 25) is a keyframe, so restoring
-- version S replays only from the nearest keyframe <= S forward, never the
-- whole history. `state_vector` is the Yjs fingerprint at that row, used both
-- to compute the NEXT delta and to detect "nothing changed since last save"
-- (the timer skips an unchanged doc).
--
-- Rows are produced either by a user ('manual') or the server snapshot timer
-- ('timer'). Content is read from the live relay doc and written here through
-- the service-role server endpoint, which authorizes the caller; the RLS
-- policies below are a defense-in-depth backstop.

-- 1. Rename the old full-snapshot column to the new name.
alter table document_version rename column update_blob to delta_blob;

-- 2. New columns. seq/state_vector are NOT NULL conceptually but we add them
--    nullable first so we can backfill existing rows, then enforce.
alter table document_version add column if not exists seq           int;
alter table document_version add column if not exists state_vector  bytea;
alter table document_version add column if not exists is_keyframe   boolean not null default false;
alter table document_version add column if not exists source        text    not null default 'manual';

alter table document_version
  drop constraint if exists document_version_source_check;
alter table document_version
  add constraint document_version_source_check check (source in ('manual', 'timer'));

-- 3. Backfill any pre-existing rows: each old full snapshot becomes a keyframe,
--    numbered per document by creation order. state_vector is unknown for these
--    (the blob is self-contained / full), so it stays null — the save path
--    treats a null previous state_vector as "no bookmark" => next save is a
--    keyframe, which is safe (never produces an unrootable delta).
with ranked as (
  select id,
         row_number() over (partition by document_id order by created_at asc) as rn
  from document_version
)
update document_version v
set    seq = r.rn,
       is_keyframe = true
from   ranked r
where  v.id = r.id
  and  v.seq is null;

-- 4. Enforce ordering: seq required and unique within a document.
alter table document_version alter column seq set not null;
alter table document_version
  drop constraint if exists document_version_doc_seq_uniq;
alter table document_version
  add constraint document_version_doc_seq_uniq unique (document_id, seq);

-- 5. Replace the created_at index with a seq-ordered one (restore walks by seq).
drop index if exists document_version_doc_idx;
create index if not exists document_version_doc_seq_idx
  on document_version(document_id, seq desc);

-- Index to find the nearest keyframe <= a target seq quickly.
create index if not exists document_version_keyframe_idx
  on document_version(document_id, seq desc) where is_keyframe;

-- RLS policies carry over unchanged (defined in 0003), they reference the table
-- not the renamed column, so nothing to redo here.
