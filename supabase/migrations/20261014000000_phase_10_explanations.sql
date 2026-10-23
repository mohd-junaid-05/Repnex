-- Phase 10: Explain, cached and traced
-- Store per-file content hashes so staleness can be checked.
-- Extend explanations to hold a cache key (model + target + content hash) and the
-- analysed commit, so a cached explanation can be proven stale and re-pinned.

-- 1. Keep the parser's content hash on each file, unchanged from the walk.
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS content_hash text;

-- 2. Explanations become a cache as well as a store.
--    target_type: 'file' | 'folder' (folder explanations have file_id NULL).
--    target_key:  the file path, or the folder path ('' for the repository root).
--    model:       the pinned model name; part of the cache key.
--    content_hash: the hash of the thing that was explained (file hash, or a
--                  digest of the folder's files).
--    commit_sha:  the analysed commit when the explanation was generated, so we
--                 can tell when the repository has moved past it.
ALTER TABLE public.explanations
  ADD COLUMN IF NOT EXISTS target_type text NOT NULL DEFAULT 'file',
  ADD COLUMN IF NOT EXISTS target_key text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS model text,
  ADD COLUMN IF NOT EXISTS content_hash text,
  ADD COLUMN IF NOT EXISTS commit_sha text;

-- Lookup path for a cache hit: one analysis, one target, one model.
CREATE INDEX IF NOT EXISTS idx_explanations_cache_lookup
  ON public.explanations (analysis_id, target_type, target_key, model);
