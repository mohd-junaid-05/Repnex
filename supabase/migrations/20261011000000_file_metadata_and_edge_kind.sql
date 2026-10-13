-- Add line_count, exports, and functions to files table
-- Add kind to edges table
ALTER TABLE public.files
  ADD COLUMN IF NOT EXISTS line_count integer,
  ADD COLUMN IF NOT EXISTS exports text[],
  ADD COLUMN IF NOT EXISTS functions text[];

ALTER TABLE public.edges
  ADD COLUMN IF NOT EXISTS kind text DEFAULT 'import';
