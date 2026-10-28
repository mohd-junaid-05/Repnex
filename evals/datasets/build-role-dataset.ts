import "../env";
import * as fs from "node:fs";
import * as path from "node:path";
import { getEvalSupabaseClient } from "../client";
import { ASSIGNABLE_ROLES, type AssignableRole, type NeighbourInfo } from "../../lib/ai/explain";

export interface RoleEvalItem {
  id: string;
  filePath: string;
  repoName: string;
  lineCount: number;
  groundTruthRole: AssignableRole;
  imports: NeighbourInfo[];
  dependents: NeighbourInfo[];
}

const ROLE_MAP: Record<string, AssignableRole> = {
  components: "component",
  component: "component",
  utilities: "util",
  util: "util",
  configuration: "config",
  config: "config",
  hooks: "hook",
  hook: "hook",
  services: "service",
  service: "service",
  models: "model",
  model: "model",
  repositories: "repository",
  repository: "repository",
};

async function buildRoleDataset() {
  const supabase = await getEvalSupabaseClient();

  console.log("Fetching held-out conventional files from database...");

  const { data: roleRows, error } = await supabase
    .from("file_roles")
    .select("file_id, role, analysis_id")
    .limit(300);

  if (error || !roleRows) {
    console.error("Failed to fetch file_roles:", error?.message);
    process.exit(1);
  }

  // Filter only roles that map to ASSIGNABLE_ROLES
  const eligible = roleRows.filter((r) => {
    const norm = r.role?.toLowerCase();
    return norm && ROLE_MAP[norm] && ASSIGNABLE_ROLES.includes(ROLE_MAP[norm]);
  });

  console.log(`Found ${eligible.length} eligible conventional role entries.`);

  // Group by role to pick a balanced distribution
  const byRole = new Map<AssignableRole, typeof eligible>();
  for (const item of eligible) {
    const mapped = ROLE_MAP[item.role.toLowerCase()];
    if (!byRole.has(mapped)) byRole.set(mapped, []);
    byRole.get(mapped)!.push(item);
  }

  // Pick up to 8 per role to get at least 35 diverse items
  const selectedEntries: typeof eligible = [];
  for (const [, items] of byRole) {
    selectedEntries.push(...items.slice(0, 8));
  }

  // If we still need more to reach 35+, top up from remaining
  if (selectedEntries.length < 35) {
    for (const item of eligible) {
      if (!selectedEntries.includes(item)) {
        selectedEntries.push(item);
        if (selectedEntries.length >= 35) break;
      }
    }
  }

  console.log(`Selected ${selectedEntries.length} files across roles:`);
  for (const [r, items] of byRole) {
    console.log(`  ${r}: ${items.length} available`);
  }

  // Enrich with file paths, repo names, and neighbours
  const dataset: RoleEvalItem[] = [];

  for (const entry of selectedEntries) {
    interface FileQueryResult {
      id: string;
      path: string;
      line_count: number | null;
      analysis_id: string;
      analyses?: {
        projects?: {
          name?: string;
        } | Array<{ name?: string }>;
      };
    }

    const { data: fileData } = await supabase
      .from("files")
      .select("id, path, line_count, analysis_id, analyses(projects(name))")
      .eq("id", entry.file_id)
      .maybeSingle();

    if (!fileData) continue;
    const fileRow = fileData as unknown as FileQueryResult;

    const rawProjects = fileRow.analyses?.projects;
    const project = Array.isArray(rawProjects) ? rawProjects[0] : rawProjects;
    const repoName = project?.name ?? "repository";
    const groundTruthRole = ROLE_MAP[entry.role.toLowerCase()];

    // Fetch neighbours
    const { data: outEdges } = await supabase
      .from("edges")
      .select("target_id")
      .eq("analysis_id", fileRow.analysis_id)
      .eq("source_id", fileRow.id);

    const { data: inEdges } = await supabase
      .from("edges")
      .select("source_id")
      .eq("analysis_id", fileRow.analysis_id)
      .eq("target_id", fileRow.id);

    const targetIds = ((outEdges ?? []) as Array<{ target_id: string }>).map((e) => e.target_id);
    const sourceIds = ((inEdges ?? []) as Array<{ source_id: string }>).map((e) => e.source_id);
    const neighbourIds = Array.from(new Set([...targetIds, ...sourceIds]));

    const idToPath = new Map<string, string>();
    if (neighbourIds.length > 0) {
      const { data: nFiles } = await supabase
        .from("files")
        .select("id, path")
        .in("id", neighbourIds);
      for (const nf of nFiles ?? []) {
        idToPath.set(nf.id, nf.path);
      }
    }

    const imports: NeighbourInfo[] = targetIds
      .map((id: string) => idToPath.get(id))
      .filter((p): p is string => Boolean(p))
      .map((path: string) => ({ path }));

    const dependents: NeighbourInfo[] = sourceIds
      .map((id: string) => idToPath.get(id))
      .filter((p): p is string => Boolean(p))
      .map((path: string) => ({ path }));

    dataset.push({
      id: fileRow.id,
      filePath: fileRow.path,
      repoName,
      lineCount: fileRow.line_count ?? 42,
      groundTruthRole,
      imports,
      dependents,
    });
  }

  const outDir = path.resolve(process.cwd(), "evals/datasets");
  fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "role-dataset.json");
  fs.writeFileSync(outPath, JSON.stringify(dataset, null, 2), "utf-8");

  console.log(`\nSaved role dataset with ${dataset.length} items to ${outPath}`);
}

buildRoleDataset().catch(console.error);
