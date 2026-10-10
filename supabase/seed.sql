-- Seed: two fake organizations with projects and analyses.
-- org_alpha and org_beta are placeholder Clerk org IDs.
-- Replace with real Clerk org IDs to test against a live account.

-- Project A (org_alpha)
INSERT INTO public.projects (id, org_id, name, repo_url)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000001',
  'org_alpha',
  'Alpha Frontend',
  'https://github.com/org-alpha/frontend'
);

-- Analysis for org_alpha - completed
INSERT INTO public.analyses (id, org_id, project_id, status, started_at, finished_at)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000002',
  'org_alpha',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'complete',
  now() - interval '10 minutes',
  now() - interval '2 minutes'
);

-- Analysis for org_alpha - pending
INSERT INTO public.analyses (id, org_id, project_id, status)
VALUES (
  'aaaaaaaa-0000-0000-0000-000000000003',
  'org_alpha',
  'aaaaaaaa-0000-0000-0000-000000000001',
  'pending'
);

-- Project B (org_beta)
INSERT INTO public.projects (id, org_id, name, repo_url)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000001',
  'org_beta',
  'Beta API Service',
  'https://github.com/org-beta/api'
);

-- Analysis for org_beta - running
INSERT INTO public.analyses (id, org_id, project_id, status, started_at)
VALUES (
  'bbbbbbbb-0000-0000-0000-000000000002',
  'org_beta',
  'bbbbbbbb-0000-0000-0000-000000000001',
  'running',
  now() - interval '1 minute'
);
