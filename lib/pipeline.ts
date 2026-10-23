import type { SupabaseClient } from "@supabase/supabase-js";
import { parseGitHubUrl, fetchRepositoryArchive } from "./github";
import { parseRepository, type ParseResult } from "@/parser";

export type PipelineStage = "fetching" | "parsing" | "storing" | "complete" | "failed";
export type PipelineStatus = "pending" | "running" | "complete" | "failed";

export interface PipelineResult {
  analysisId: string;
  projectId: string;
  projectName?: string;
  isExisting: boolean;
  status: PipelineStatus;
  stage?: PipelineStage;
}

export interface RunPipelineOptions {
  analysisId: string;
  orgId: string;
  repoUrl: string;
  supabase: SupabaseClient;
}

/**
 * Execute the full pipeline for an analysis: fetch -> parse -> store.
 * Catches any top-level error and writes a failed status & stage message to the database.
 */
export async function runAnalysisPipeline({
  analysisId,
  orgId,
  repoUrl,
  supabase,
}: RunPipelineOptions): Promise<void> {
  let currentStage: PipelineStage = "fetching";
  let cleanupArchive: (() => Promise<void>) | null = null;

  try {
    // 1. Stage: Fetching archive
    currentStage = "fetching";
    await supabase
      .from("analyses")
      .update({
        status: "running",
        stage: "fetching",
        started_at: new Date().toISOString(),
        error_message: null,
      })
      .eq("id", analysisId);

    const { destDir, commitSha, cleanup } = await fetchRepositoryArchive(repoUrl);
    cleanupArchive = cleanup;

    // 2. Stage: Parsing repository AST
    currentStage = "parsing";
    await supabase
      .from("analyses")
      .update({
        stage: "parsing",
      })
      .eq("id", analysisId);

    const parseResult: ParseResult = parseRepository({ repoRoot: destDir });

    // 3. Stage: Storing files, edges, and insights
    currentStage = "storing";
    await supabase
      .from("analyses")
      .update({
        stage: "storing",
      })
      .eq("id", analysisId);

    await storeAnalysisData({
      supabase,
      analysisId,
      orgId,
      commitSha,
      parseResult,
    });

    // 4. Stage: Complete
    currentStage = "complete";
    await supabase
      .from("analyses")
      .update({
        status: "complete",
        stage: "complete",
        commit_sha: commitSha,
        coverage: parseResult.coverage,
        finished_at: new Date().toISOString(),
      })
      .eq("id", analysisId);
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "An unexpected error occurred during analysis.";
    console.error(`[pipeline] Analysis ${analysisId} failed at stage "${currentStage}":`, errorMessage);

    await supabase
      .from("analyses")
      .update({
        status: "failed",
        stage: currentStage,
        error_message: errorMessage,
        finished_at: new Date().toISOString(),
      })
      .eq("id", analysisId);
  } finally {
    if (cleanupArchive) {
      await cleanupArchive();
    }
  }
}

interface StoreAnalysisDataOptions {
  supabase: SupabaseClient;
  analysisId: string;
  orgId: string;
  commitSha: string;
  parseResult: ParseResult;
}

/**
 * Persist parsed files, dependency edges, and coverage metrics into Supabase tables.
 */
async function storeAnalysisData({
  supabase,
  analysisId,
  orgId,
  parseResult,
}: StoreAnalysisDataOptions): Promise<void> {
  // 1. Insert files in chunks and retrieve assigned IDs
  const fileRowsToInsert = parseResult.files.map((file) => ({
    analysis_id: analysisId,
    org_id: orgId,
    path: file.path,
    language: file.language,
    line_count: file.lineCount,
    content_hash: file.contentHash,
    exports: file.exports ?? [],
    functions: file.functions ?? [],
  }));

  const pathToId = new Map<string, string>();
  const CHUNK_SIZE = 400;

  for (let i = 0; i < fileRowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = fileRowsToInsert.slice(i, i + CHUNK_SIZE);
    const { data: insertedFiles, error: fileError } = await supabase
      .from("files")
      .insert(chunk)
      .select("id, path");

    if (fileError) {
      throw new Error(`Failed to store files: ${fileError.message}`);
    }

    if (insertedFiles) {
      for (const f of insertedFiles) {
        pathToId.set(f.path, f.id);
      }
    }
  }

  // 2. Map and insert dependency edges
  const edgeRowsToInsert = parseResult.edges
    .map((edge) => {
      const sourceId = pathToId.get(edge.sourcePath);
      const targetId = pathToId.get(edge.targetPath);
      if (!sourceId || !targetId) return null;

      return {
        analysis_id: analysisId,
        org_id: orgId,
        source_id: sourceId,
        target_id: targetId,
        import_path: edge.importSpecifier,
        kind: edge.kind,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  for (let i = 0; i < edgeRowsToInsert.length; i += CHUNK_SIZE) {
    const chunk = edgeRowsToInsert.slice(i, i + CHUNK_SIZE);
    const { error: edgeError } = await supabase.from("edges").insert(chunk);

    if (edgeError) {
      throw new Error(`Failed to store edges: ${edgeError.message}`);
    }
  }

  // 3. Store extracted routes
  if (parseResult.routes.length > 0) {
    const routeRowsToInsert = parseResult.routes
      .map((route) => {
        const fileId = pathToId.get(route.filePath);
        if (!fileId) return null;
        return {
          analysis_id: analysisId,
          org_id: orgId,
          file_id: fileId,
          route_path: route.routePath,
          http_methods: route.httpMethods,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (let i = 0; i < routeRowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = routeRowsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: routeError } = await supabase.from("routes").insert(chunk);
      if (routeError) {
        console.warn(`[pipeline] Warning: Failed to insert routes chunk:`, routeError.message);
      }
    }
  }

  // 4. Store file roles
  const roleEntries = Object.entries(parseResult.fileRoles);
  if (roleEntries.length > 0) {
    const roleRowsToInsert = roleEntries
      .map(([filePath, role]) => {
        const fileId = pathToId.get(filePath);
        if (!fileId) return null;
        return {
          analysis_id: analysisId,
          org_id: orgId,
          file_id: fileId,
          role,
        };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null);

    for (let i = 0; i < roleRowsToInsert.length; i += CHUNK_SIZE) {
      const chunk = roleRowsToInsert.slice(i, i + CHUNK_SIZE);
      const { error: roleError } = await supabase.from("file_roles").insert(chunk);
      if (roleError) {
        console.warn(`[pipeline] Warning: Failed to insert file roles chunk:`, roleError.message);
      }
    }
  }

  // 5. Store insights (coverage and framework)
  const insightsToInsert = [
    {
      analysis_id: analysisId,
      org_id: orgId,
      kind: "coverage",
      payload: parseResult.coverage as unknown as Record<string, unknown>,
    },
    {
      analysis_id: analysisId,
      org_id: orgId,
      kind: "framework",
      payload: { framework: parseResult.framework } as unknown as Record<string, unknown>,
    },
  ];

  const { error: insightError } = await supabase.from("insights").insert(insightsToInsert);

  if (insightError) {
    console.warn(`[pipeline] Warning: Failed to insert insights:`, insightError.message);
  }
}

export interface SubmitRepositoryOptions {
  supabase: SupabaseClient;
  orgId: string;
  repoUrlInput: string;
  forceRerun?: boolean;
}

/**
 * Handle repository submission enforcing "one analysis per repository" policy.
 * Returns existing analysis if already analyzed, or initializes a new analysis run.
 */
export async function submitRepositoryForAnalysis({
  supabase,
  orgId,
  repoUrlInput,
  forceRerun = false,
}: SubmitRepositoryOptions): Promise<PipelineResult> {
  const parsed = parseGitHubUrl(repoUrlInput);
  if (!parsed) {
    throw new Error(`Invalid GitHub repository URL: "${repoUrlInput}"`);
  }

  const { canonicalUrl, owner, repo } = parsed;
  const projectName = `${owner}/${repo}`;

  // 1. Find or create project for this organization
  const { data: existingProject } = await supabase
    .from("projects")
    .select("id, name, repo_url")
    .eq("repo_url", canonicalUrl)
    .maybeSingle();

  let projectId = existingProject?.id;

  if (!projectId) {
    const { data: newProject, error: projectError } = await supabase
      .from("projects")
      .insert({
        org_id: orgId,
        name: projectName,
        repo_url: canonicalUrl,
      })
      .select("id")
      .single();

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }
    projectId = newProject.id;
  }

  // 2. Check for existing analysis on this project
  if (!forceRerun) {
    const { data: existingAnalysis } = await supabase
      .from("analyses")
      .select("id, status, stage")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAnalysis) {
      if (
        existingAnalysis.status === "complete" ||
        existingAnalysis.status === "running" ||
        existingAnalysis.status === "pending"
      ) {
        return {
          analysisId: existingAnalysis.id,
          projectId,
          projectName,
          isExisting: true,
          status: existingAnalysis.status as PipelineStatus,
          stage: existingAnalysis.stage as PipelineStage,
        };
      }
    }
  }

  // Remove previous analysis records for this project so each repository only ever has one analysis in this account
  if (projectId) {
    await supabase.from("analyses").delete().eq("project_id", projectId);
  }

  // 3. Create new pending analysis row
  const { data: newAnalysis, error: analysisError } = await supabase
    .from("analyses")
    .insert({
      org_id: orgId,
      project_id: projectId,
      status: "pending",
      stage: "fetching",
    })
    .select("id")
    .single();

  if (analysisError) {
    throw new Error(`Failed to create analysis record: ${analysisError.message}`);
  }

  return {
    analysisId: newAnalysis.id,
    projectId,
    projectName,
    isExisting: false,
    status: "pending",
    stage: "fetching",
  };
}
