-- Phase 7: The pipeline
-- Add columns for named stages, commit SHA, error message, and coverage report.
-- Add unique constraint on projects (org_id, repo_url).
-- Add trigger to broadcast stage changes to private realtime channels.
-- Add RLS policy on realtime.messages for analysis channel authorization.

-- 1. Alter analyses table
ALTER TABLE public.analyses
  ADD COLUMN IF NOT EXISTS stage text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS commit_sha text,
  ADD COLUMN IF NOT EXISTS error_message text,
  ADD COLUMN IF NOT EXISTS coverage jsonb;

-- 2. Unique index on projects per org_id and repo_url
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_org_id_repo_url ON public.projects (org_id, repo_url);

-- 3. Broadcast function with safe search_path
CREATE OR REPLACE FUNCTION public.broadcast_analysis_stage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF (TG_OP = 'INSERT') OR 
     (OLD.stage IS DISTINCT FROM NEW.stage) OR 
     (OLD.status IS DISTINCT FROM NEW.status) OR 
     (OLD.error_message IS DISTINCT FROM NEW.error_message) THEN
    PERFORM realtime.send(
      jsonb_build_object(
        'analysis_id', NEW.id,
        'status', NEW.status,
        'stage', NEW.stage,
        'error_message', NEW.error_message
      ),
      'stage_change',
      'analysis:' || NEW.id::text,
      true
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_broadcast_analysis_stage ON public.analyses;
CREATE TRIGGER trg_broadcast_analysis_stage
AFTER INSERT OR UPDATE OF stage, status, error_message
ON public.analyses
FOR EACH ROW
EXECUTE FUNCTION public.broadcast_analysis_stage();

-- 4. Realtime Authorization Policy on realtime.messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'realtime' AND tablename = 'messages' AND policyname = 'org members receive analysis broadcasts'
  ) THEN
    CREATE POLICY "org members receive analysis broadcasts"
    ON "realtime"."messages"
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.analyses a
        WHERE ('analysis:' || a.id::text) = (SELECT realtime.topic())
          AND a.org_id = (auth.jwt() ->> 'org_id')
          AND realtime.messages.extension = 'broadcast'
      )
    );
  END IF;
END $$;
