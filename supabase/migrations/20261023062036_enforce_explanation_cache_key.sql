-- Upgrade databases that already ran phase 10 with a non-unique cache index.
-- Keep the newest explanation when previous inserts produced duplicate keys.
BEGIN;

LOCK TABLE public.explanations IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM public.explanations
WHERE id IN (
  SELECT id
  FROM (
    SELECT id, row_number() OVER (
      PARTITION BY analysis_id, target_type, target_key, model
      ORDER BY created_at DESC, id DESC
    ) AS position
    FROM public.explanations
    WHERE model IS NOT NULL
  ) AS ranked
  WHERE position > 1
);

DROP INDEX IF EXISTS public.idx_explanations_cache_lookup;
CREATE UNIQUE INDEX idx_explanations_cache_lookup
  ON public.explanations (analysis_id, target_type, target_key, model);

COMMIT;
