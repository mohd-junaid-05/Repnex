import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { assignRole, type AssignRoleParams, type NeighbourInfo } from "@/lib/ai/explain";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Assign a role to a file that no adapter could identify. The model may only
 * answer with a non-structural role. The cache read happens inside the traced
 * call, so an already-stored acceptable role returns without a model call.
 */
export async function POST(req: Request) {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = (await req.json()) as Record<string, unknown>;
    const analysisId = body?.analysisId as string | undefined;
    const filePath = body?.filePath as string | undefined;

    if (!analysisId || !filePath) {
      return NextResponse.json({ error: "analysisId and filePath are required." }, { status: 400 });
    }

    const supabase = await createSupabaseClient();

    const { data: analysis } = await supabase
      .from("analyses")
      .select("id, projects(repo_url, name)")
      .eq("id", analysisId)
      .maybeSingle();

    if (!analysis) {
      return NextResponse.json({ error: "Analysis not found" }, { status: 404 });
    }

    const project = Array.isArray(analysis.projects) ? analysis.projects[0] : analysis.projects;
    const repoName = (project?.name ?? "repository") as string;

    const { data: fileRow } = await supabase
      .from("files")
      .select("id, path, line_count")
      .eq("analysis_id", analysisId)
      .eq("path", filePath)
      .maybeSingle();

    if (!fileRow) {
      return NextResponse.json({ error: `File "${filePath}" not found.` }, { status: 404 });
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

    const params: AssignRoleParams = {
      analysisId,
      orgId,
      filePath,
      repoName,
      fileRole: roleByPath.get(filePath),
      fileId: fileRow.id,
      lineCount: fileRow.line_count ?? 0,
      imports,
      dependents,
      supabase,
    };

    const result = await assignRole(params);
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to assign a role.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
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

