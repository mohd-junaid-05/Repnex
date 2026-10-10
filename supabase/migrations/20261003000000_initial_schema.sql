-- Phase 2: initial schema
-- Eight tables, each owned by org_id.
-- RLS on all eight: predicate reads org_id claim from the Clerk JWT.
-- No application code enforces tenancy; the policy is the authority.

-- 1. projects
CREATE TABLE public.projects (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  name          text NOT NULL,
  repo_url      text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their projects"
  ON public.projects
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 2. analyses
CREATE TABLE public.analyses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  -- pending | running | complete | failed
  status        text NOT NULL DEFAULT 'pending',
  started_at    timestamptz,
  finished_at   timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their analyses"
  ON public.analyses
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 3. files
CREATE TABLE public.files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  path          text NOT NULL,
  language      text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their files"
  ON public.files
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 4. edges
CREATE TABLE public.edges (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  source_id     uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  target_id     uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  import_path   text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their edges"
  ON public.edges
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 5. routes
CREATE TABLE public.routes (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id       uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  route_path    text NOT NULL,
  http_methods  text[] NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their routes"
  ON public.routes
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 6. explanations
CREATE TABLE public.explanations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id       uuid REFERENCES public.files(id) ON DELETE CASCADE,
  content       text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.explanations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their explanations"
  ON public.explanations
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 7. file_roles
CREATE TABLE public.file_roles (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  file_id       uuid NOT NULL REFERENCES public.files(id) ON DELETE CASCADE,
  role          text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.file_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their file_roles"
  ON public.file_roles
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- 8. insights
CREATE TABLE public.insights (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        text NOT NULL,
  analysis_id   uuid NOT NULL REFERENCES public.analyses(id) ON DELETE CASCADE,
  kind          text NOT NULL,
  payload       jsonb NOT NULL DEFAULT '{}',
  created_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.insights ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org members see their insights"
  ON public.insights
  FOR ALL
  TO authenticated
  USING  ( org_id = (auth.jwt() ->> 'org_id') )
  WITH CHECK ( org_id = (auth.jwt() ->> 'org_id') );

-- Indexes for common join paths
CREATE INDEX ON public.analyses     (org_id);
CREATE INDEX ON public.files        (analysis_id);
CREATE INDEX ON public.edges        (analysis_id);
CREATE INDEX ON public.routes       (analysis_id);
CREATE INDEX ON public.explanations (analysis_id);
CREATE INDEX ON public.file_roles   (analysis_id);
CREATE INDEX ON public.insights     (analysis_id);

-- Grant table access to authenticated role; anon gets nothing
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
