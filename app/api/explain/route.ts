import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import * as crypto from "node:crypto";
import { createSupabaseClient } from "@/lib/supabase";
import {
  explainFile,
  explainFolder,
  type ExplainFileParams,
  type ExplainFolderParams,
  type NeighbourInfo,
} from "@/lib/ai/explain";
import { isTracingConfigured } from "@/lib/ai/client";
import { fetchRepositoryHeadCommit } from "@/lib/github";
import type { SupabaseClient } from "@supabase/supabase-js";

interface FolderFileInput {
  path: string;
  role?: string | null;
  fanIn?: number | null;
  fanOut?: number | null;
  contentHash?: string | null;
}

interface CommonCtx {
  analysisId: string;
  orgId: string;
  commitSha: string;
  repoName: string;
  supabase: SupabaseClient;
}

/** Check whether tracing is configured. Visible in developer UI. */
export async function GET() {
  return NextResponse.json({
    tracingConfigured: isTracingConfigured(),
  });
}

/**
 * Generate (or serve from cache) an explanation for a file or a folded folder.
 * The cache read happens inside the traced AI call, so a cache hit records a run
 * with no model call. Staleness is decided here against the live repo head.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const analysisId = body?.analysisId as string | undefined;
    const targetType = body?.targetType as string | undefined;
    const targetKey = body?.targetKey as string | undefined;

    if (!analysisId || !targetKey || (targetType !== "file" && targetType !== "folder")) {
      return NextResponse.json(
        { error: "analysisId, a targetKey, and targetType 'file' or 'folder' are required." },
        { status: 400 }
      );
    }

    const supabase = await createSupabaseClient();

    const { data: analysis } = await supabase
      .from("analyses")
      .select("id, commit_sha, projects(repo_url, name)")
      .eq("id", analysisId)
      .maybeSingle();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const project = Array.isArray(analysis.projects) ? analysis.projects[0] : analysis.projects;
    const repoUrl = (project?.repo_url ?? "") as string;
    const repoName = (project?.name ?? "repository") as string;
    const commitSha = (analysis.commit_sha ?? "") as string;

    const ctx: CommonCtx = { analysisId, orgId, commitSha, repoName, supabase };

    // Staleness: has the repository moved past the commit that was analysed?
    const headSha = await fetchRepositoryHeadCommit(repoUrl);
    const stale = headSha !== null && commitSha !== "" && headSha !== commitSha;

    const result =
      targetType === "file"
        ? await handleFile(targetKey, ctx)
        : await handleFolder(targetKey, body, ctx);

    return NextResponse.json({ ...result, stale, tracingConfigured: isTracingConfigured() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to generate explanation.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

async function handleFile(filePath: string, ctx: CommonCtx) {
  const { supabase, analysisId, orgId, commitSha, repoName } = ctx;

  const { data: fileRow } = await supabase
    .from("files")
    .select("id, path, content_hash")
    .eq("analysis_id", analysisId)
    .eq("path", filePath)
    .maybeSingle();

  if (!fileRow) {
    throw new Error(`File "${filePath}" was not found in this analysis.`);
  }

  const { data: allFiles } = await supabase
    .from("files")
    .select("id, path")
    .eq("analysis_id", analysisId);
  const idToPath = new Map<string, string>((allFiles ?? []).map((f) => [f.id, f.path]));

  const { data: roleRows } = await supabase
    .from("file_roles")
    .select("file_id, role")
    .eq("analysis_id", analysisId);
  const roleByPath = new Map<string, string>();
  for (const r of roleRows ?? []) {
    const p = idToPath.get(r.file_id);
    if (p) roleByPath.set(p, r.role);
  }

  const imports = await neighbourList(supabase, analysisId, idToPath, "source", fileRow.id, roleByPath);
  const dependents = await neighbourList(supabase, analysisId, idToPath, "target", fileRow.id, roleByPath);

  const digest = fileRow.content_hash || filePath;

  const params: ExplainFileParams = {
    analysisId,
    orgId,
    commitSha,
    fileId: fileRow.id,
    filePath,
    digest,
    repoName,
    fileRole: roleByPath.get(filePath),
    imports,
    dependents,
    supabase,
  };

  return explainFile(params);
}

async function neighbourList(
  supabase: SupabaseClient,
  analysisId: string,
  idToPath: Map<string, string>,
  direction: "source" | "target",
  fileId: string,
  roleByPath: Map<string, string>
): Promise<NeighbourInfo[]> {
  const seen = new Set<string>();
  const neighbours: NeighbourInfo[] = [];

  if (direction === "source") {
    const { data: edgeRows } = await supabase
      .from("edges")
      .select("target_id")
      .eq("analysis_id", analysisId)
      .eq("source_id", fileId);

    for (const row of edgeRows ?? []) {
      const neighbourId = row.target_id;
      const path = idToPath.get(neighbourId);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      neighbours.push({ path, role: roleByPath.get(path) });
    }
  } else {
    const { data: edgeRows } = await supabase
      .from("edges")
      .select("source_id")
      .eq("analysis_id", analysisId)
      .eq("target_id", fileId);

    for (const row of edgeRows ?? []) {
      const neighbourId = row.source_id;
      const path = idToPath.get(neighbourId);
      if (!path || seen.has(path)) continue;
      seen.add(path);
      neighbours.push({ path, role: roleByPath.get(path) });
    }
  }

  neighbours.sort((a, b) => a.path.localeCompare(b.path));
  return neighbours;
}
async function handleFolder(
  folderPath: string,
  body: Record<string, unknown>,
  ctx: CommonCtx
) {
  const { supabase, analysisId, orgId, commitSha, repoName } = ctx;

  const rawFiles = (body?.files ?? []) as FolderFileInput[];
  const incomingFrom = (body?.incomingFrom ?? []) as string[];
  const outgoingTo = (body?.outgoingTo ?? []) as string[];

  if (rawFiles.length === 0) {
    throw new Error("Folder contains no files to explain.");
  }

  const contentHashes = rawFiles.map((f) => ({ path: f.path, hash: f.contentHash ?? "" }));
  const digest = computeFolderDigest(contentHashes);

  const files: NeighbourInfo[] = rawFiles.map((f) => ({
    path: f.path,
    role: f.role ?? undefined,
    fanIn: f.fanIn ?? undefined,
    fanOut: f.fanOut ?? undefined,
  }));

  const params: ExplainFolderParams = {
    analysisId,
    orgId,
    commitSha,
    fileId: null,
    folderPath,
    digest,
    repoName,
    files,
    incomingFrom,
    outgoingTo,
    supabase,
  };

  return explainFolder(params);
}

/** Digest of a folder = hash of sorted "path:contentHash" lines, so any file change invalidates it. */
function computeFolderDigest(items: { path: string; hash: string }[]): string {
  const sorted = [...items]
    .sort((a, b) => a.path.localeCompare(b.path))
    .map((i) => `${i.path}:${i.hash || ""}`)
    .join("\n");
  return crypto.createHash("sha256").update(sorted).digest("hex");
}

