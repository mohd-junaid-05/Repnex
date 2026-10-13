import { notFound, redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { createSupabaseClient } from "@/lib/supabase";
import { computeFoldedGraph } from "@/lib/folding";
import { computeFanMetrics } from "@/parser/metrics";
import { computeRailCategories } from "@/lib/taxonomy";
import type {
  ParseResult,
  ParsedFile,
  ParsedEdge,
  CoverageReport,
  FileLanguage,
  ExtractedRoute,
} from "@/parser/types";
import { AnalysisProgress } from "@/components/analysis-progress";
import { AnalysisExplorer } from "@/components/analysis-explorer";
import * as path from "node:path";

interface AnalysisPageProps {
  params: Promise<{ id: string }>;
}

export default async function AnalysisPage({ params }: AnalysisPageProps) {
  const { id } = await params;
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  const supabase = await createSupabaseClient();

  // 1. Fetch analysis details. RLS policy handles tenancy.
  const { data: analysis, error } = await supabase
    .from("analyses")
    .select("id, status, stage, commit_sha, error_message, coverage, created_at, started_at, finished_at, projects(name, repo_url)")
    .eq("id", id)
    .maybeSingle();

  if (error || !analysis) {
    notFound();
  }

  const projectRelation = analysis.projects;
  const project = Array.isArray(projectRelation) ? projectRelation[0] : projectRelation;
  const projectName = project?.name ?? "Unknown repository";
  const repoUrl = project?.repo_url ?? "";

  // 2. If not complete, render the live progress view
  if (analysis.status !== "complete") {
    return (
      <AnalysisProgress
        initialAnalysis={{
          id: analysis.id,
          status: analysis.status,
          stage: analysis.stage,
          repoUrl,
          projectName,
          errorMessage: analysis.error_message,
        }}
      />
    );
  }

  // 3. Status is complete: fetch files, edges, routes, roles, and insights to build ParseResult
  const [
    { data: fileRows },
    { data: edgeRows },
    { data: routeRows },
    { data: roleRows },
    { data: insightRows },
  ] = await Promise.all([
    supabase.from("files").select("id, path, language").eq("analysis_id", id),
    supabase.from("edges").select("id, source_id, target_id, import_path").eq("analysis_id", id),
    supabase.from("routes").select("id, file_id, route_path, http_methods").eq("analysis_id", id),
    supabase.from("file_roles").select("id, file_id, role").eq("analysis_id", id),
    supabase.from("insights").select("kind, payload").eq("analysis_id", id),
  ]);

  const filesList = fileRows ?? [];
  const edgesList = edgeRows ?? [];

  // Map file IDs to file paths
  const idToPath = new Map<string, string>();
  for (const f of filesList) {
    idToPath.set(f.id, f.path);
  }

  const parsedFiles: ParsedFile[] = filesList.map((f) => {
    const rawFolder = path.posix.dirname(f.path);
    const folder = rawFolder === "." ? "" : rawFolder;
    return {
      path: f.path,
      folder,
      language: (f.language as FileLanguage) || "typescript",
      lineCount: 0,
      contentHash: "",
    };
  });

  const parsedEdges: ParsedEdge[] = edgesList
    .map((e): ParsedEdge | null => {
      const sourcePath = idToPath.get(e.source_id);
      const targetPath = idToPath.get(e.target_id);
      if (!sourcePath || !targetPath) return null;

      return {
        sourcePath,
        targetPath,
        importSpecifier: e.import_path,
        kind: "import",
      };
    })
    .filter((e): e is ParsedEdge => e !== null);

  // Reconstruct extracted routes
  const routes: ExtractedRoute[] = (routeRows ?? [])
    .map((r): ExtractedRoute | null => {
      const filePath = idToPath.get(r.file_id);
      if (!filePath) return null;
      return {
        filePath,
        routePath: r.route_path,
        httpMethods: (r.http_methods as string[]) || [],
      };
    })
    .filter((r): r is ExtractedRoute => r !== null);

  // Reconstruct file roles map
  const fileRoles: Record<string, string> = {};
  for (const r of roleRows ?? []) {
    const filePath = idToPath.get(r.file_id);
    if (filePath) {
      fileRoles[filePath] = r.role;
    }
  }

  // Determine framework: from insights or from roles
  let framework = "generic";
  const fwInsight = (insightRows ?? []).find((i) => i.kind === "framework");
  if (
    fwInsight?.payload &&
    typeof fwInsight.payload === "object" &&
    "framework" in fwInsight.payload
  ) {
    framework = String((fwInsight.payload as { framework: string }).framework);
  } else {
    const rolesList = Object.values(fileRoles);
    if (
      rolesList.includes("Page routes") ||
      rolesList.includes("API endpoints") ||
      rolesList.includes("Server actions")
    ) {
      framework = "nextjs";
    } else if (
      rolesList.includes("Controllers") ||
      rolesList.includes("Services") ||
      rolesList.includes("Modules")
    ) {
      framework = "nestjs";
    } else if (rolesList.includes("Views") || rolesList.includes("Components")) {
      framework = "react";
    }
  }

  // Collect distinct folders
  const folderSet = new Set<string>();
  for (const file of parsedFiles) {
    if (file.folder) {
      folderSet.add(file.folder);
      let parent = path.posix.dirname(file.folder);
      while (parent && parent !== ".") {
        folderSet.add(parent);
        parent = path.posix.dirname(parent);
      }
    }
  }
  const folders = [...folderSet].sort();

  // Compute fan metrics
  const fanMetrics = computeFanMetrics(parsedFiles, parsedEdges);

  // Coverage report
  const defaultCoverage: CoverageReport = {
    totalFilesFound: parsedFiles.length,
    filesParsed: parsedFiles.length,
    filesSkipped: 0,
    skippedFiles: [],
    totalImports: parsedEdges.length,
    resolvedImports: parsedEdges.length,
    externalImports: 0,
    unresolvedImports: [],
  };

  const coverage: CoverageReport =
    (analysis.coverage as unknown as CoverageReport) || defaultCoverage;

  const parseResult: ParseResult = {
    repoRoot: repoUrl,
    parsedAt: analysis.finished_at || analysis.created_at,
    framework,
    files: parsedFiles,
    edges: parsedEdges,
    fanMetrics,
    coverage,
    folders,
    routes,
    fileRoles,
  };

  // Compute folded graph
  const { nodes, edges, fileToNode } = computeFoldedGraph(parseResult);

  // Compute framework categories for left rail
  const categories = computeRailCategories(framework, fileRoles);

  const fileToNodeObj = Object.fromEntries(fileToNode.entries());

  return (
    <AnalysisExplorer
      data={parseResult}
      nodes={nodes}
      edges={edges}
      fileToNode={fileToNodeObj}
      categories={categories}
    />
  );
}
