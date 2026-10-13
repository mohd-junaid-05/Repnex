# Progress Tracker

## Phase 01: Auth and teams
- [x] Integrate Clerk Authentication
- [x] Configure middleware to protect routes
- [x] Setup Organization support and UI switcher
- [x] Implement system/light/dark theme switcher
- [x] Auto-create default organization on first sign-in
- [x] Create Supabase client wrapper with Clerk token injection
- [x] Validate environment variables on startup

## Phase 02: Dashboard and schema
- [x] Migration: 8 tables (projects, analyses, files, edges, routes, explanations, file_roles, insights)
- [x] RLS on all 8 tables — predicate reads `org_id` from Clerk JWT, no application-level tenant filter
- [x] Seed data for two fake organizations (org_alpha, org_beta) with projects and analyses
- [x] Dashboard: lists analyses for the active organization with status badges and empty state
- [x] Fixed `lib/supabase.ts` — removed `any` types, used `CookieOptions` from `@supabase/ssr`

## Phase 03: The parser
- [x] Defined parser output types as a strict contract (`parser/types.ts`)
- [x] Implemented structural directory walker excluding `node_modules`, build output, and `.d.ts` files (`parser/walker.ts`)
- [x] Built import extractor using `ts-morph` parsing plain imports, re-exports, and dynamic string imports (`parser/extractor.ts`)
- [x] Implemented ESM JS to TS extension resolution to support barrel files accurately
- [x] Wrote pure functions for calculating per-file fan-in and fan-out metrics (`parser/metrics.ts`)
- [x] Orchestrated a standalone parser CLI command capable of generating a typed coverage report and exporting to JSON (`parser/cli.ts`)
- [x] Validated acceptance checks (repo walking with explanations, folder nesting, barrel file re-exports, broken import renaming, JSON round-trips)

## Phase 04: The canvas
- [x] Generated a static parser output for development (`parser-output-mantine.json`)
- [x] Implemented preview route with a stable three-column layout (categories, canvas, details)
- [x] Display category counts in the left rail
- [x] Implemented deterministic directory folding algorithm keeping node count manageable
- [x] Implemented custom React Flow nodes for folders, acting as expandable panels
- [x] Display per-file dependency counts (imports `<- N` and exports `N ->`) within expanded panels using bezier curves for edges
- [x] Added interactivity (multi-folder expansion, file selection, edge highlighting with dimming)
- [x] Filtered out internal module edges to focus exclusively on cross-file import/export connections
- [x] Thinned and color-coded connecting edges (Emerald green for imports, Amber gold for exports, Sky blue for direct open-folder links)
- [x] Fixed handle vertical alignment (`top: 50%`, `translateY(-50%)`) for exact line targeting to file rows
- [x] Added dynamic file swatch color coding (Emerald for index/barrel entry files, Rose for test files, Cyan for selected files, Indigo for standard files)
- [x] Validated acceptance checks (Node count, Edge termination, Panel expansion/collapse, Canvas usage)

## Phase 05: Detail pane
- [x] Pure file classification, convention detection, framework and route detection (`lib/classification.ts`)
- [x] Repository summary resting state: repository name, framework badge, files/imports/routes/unidentified counts, top depended-on files list, and where reading starts list
- [x] Selected file state: monospace path, detected kind, line count, exact dependent and dependency counts matching listed rows
- [x] Selected folder state: folder composition breakdown by kind and full files list with fan-in/fan-out
- [x] Persistent two-tab navigation (Structure and Explanation) that preserves active tab across selection changes
- [x] Bidirectional hover and selection synchronization between DetailPane and GraphView canvas
- [x] Pure in-memory calculation with zero network requests on interaction or selection
- [x] Validated types (`tsc`), lint (`eslint`), and production build (`next build`)

## Phase 06: Graph maths, the rail, and insights
- [x] Pure transitive walk over edge list with direction and depth limit (`lib/graph-math.ts`)
- [x] Instant Blast radius and Dependency chain buttons in DetailPane returning 2 levels deep with no network requests or spinners
- [x] Iterative cycle detection preventing call-stack recursion on large/dense graphs
- [x] Four kinds of insights from edge facts using fixed sentences: files nothing imports (excluding framework-reached files), heavily depended-on files, import cycles, and oversized files
- [x] Collapsible Insights section in DetailPane starting collapsed per spec
- [x] Active left rail category filtering that dims non-matching files and folders rather than removing them
- [x] Match count badges on open and collapsed folder nodes summing to the category total in the rail
- [x] Validated types (`tsc`), lint (`eslint`), and production build (`next build`)

## Phase 07: Ingestion pipeline
- [x] Fetch public repository as archive from GitHub API without repository scope or storing tokens
- [x] Record commit hash with archive to track upstream freshness
- [x] Multi-stage analysis pipeline (fetch, select, parse, store) with fail-safe error recording
- [x] Prevent duplicate analyses: redirect to existing analysis for already-analyzed repositories
- [x] Realtime progress page driven by Supabase Postgres triggers broadcasting stage updates
- [x] Channel declaration and subscription authorization policy in Supabase migration
- [x] Replace checked-in static preview with database-backed explorer
- [x] Stale analysis detection for interrupted runs and collapsible coverage banner
- [x] Validated types (`tsc`), lint (`eslint`), and production build (`next build`)

## Phase 08: Framework adapters
- [x] Pure rail taxonomy separated from parser/filesystem code (`lib/taxonomy.ts`)
- [x] Next.js adapter: path convention roles (Page routes, API endpoints, Server actions) and exact App/Pages router route extraction
- [x] NestJS adapter: suffix-based roles (Controllers, Services, Modules, etc.) and decorator-based exact route extraction (`@Controller`, HTTP methods)
- [x] React adapter: view, hook, component, and utility roles
- [x] Generic fallback adapter: entry, module, config, and test roles with empty route extraction
- [x] Adapter registry with deterministic detection order (Next.js -> NestJS -> React -> Fallback)
- [x] Strict route constraint: emit only exact recoverable method and path pattern without guessing or inference
- [x] Persist extracted routes to `routes` table and file roles to `file_roles` table
- [x] Reshape left rail with concrete framework roles in fixed reading order (routable surfaces -> internal layers -> plumbing)
- [x] Interactive DetailPane route table with HTTP method badges, exact paths, and click-to-open file navigation
- [x] Zero references to framework strings in parser core (verified acceptance check 5)
- [x] Validated types (`tsc`), lint (`eslint`), and production build (`next build`)
