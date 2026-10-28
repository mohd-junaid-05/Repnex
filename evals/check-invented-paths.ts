import "./env";
import { getEvalSupabaseClient } from "./client";
import { checkInventedPaths } from "../lib/ai/invented-paths";
import type { SupabaseClient } from "@supabase/supabase-js";

interface ExplanationRow {
  id: string;
  analysis_id: string;
  target_type: string;
  target_key: string;
  content: string;
  created_at: string;
}

interface FileRow {
  id: string;
  path: string;
}

interface EdgeRow {
  source_id: string;
  target_id: string;
}

async function main() {
  console.log("================================================================================");
  console.log("                   EVAL: INVENTED-PATH CHECK (DETERMINISTIC)                    ");
  console.log("================================================================================\n");

  const supabase = await getEvalSupabaseClient();

  // 1. Fetch recent explanations from database (real traffic)
  const { data: explanations, error } = await supabase
    .from("explanations")
    .select("id, analysis_id, target_type, target_key, content, created_at")
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    console.error("[eval] Failed to query explanations:", error.message);
    process.exit(1);
  }

  const rows = (explanations ?? []) as ExplanationRow[];
  console.log(`Loaded ${rows.length} recent explanations from database.\n`);

  let totalExplanations = 0;
  let cleanExplanations = 0;
  let totalPathsChecked = 0;
  let totalInventedPaths = 0;
  const flaggedItems: Array<{
    targetKey: string;
    invented: string[];
    shownCount: number;
    shownSamples: string[];
  }> = [];

  for (const row of rows) {
    if (!row.content || !row.target_key) continue;

    totalExplanations++;

    // Reconstruct the exact shown paths for this explanation from the graph
    const shownPaths = await reconstructShownPaths(supabase, row.analysis_id, row.target_type, row.target_key);

    const result = checkInventedPaths(row.content, shownPaths);
    totalPathsChecked += result.totalTokensChecked;

    if (result.passed) {
      cleanExplanations++;
    } else {
      totalInventedPaths += result.inventedPaths.length;
      flaggedItems.push({
        targetKey: row.target_key,
        invented: result.inventedPaths,
        shownCount: shownPaths.length,
        shownSamples: shownPaths.slice(0, 5),
      });
    }
  }

  const explanationScore =
    totalExplanations > 0 ? (cleanExplanations / totalExplanations) * 100 : 100;

  console.log("--------------------------------------------------------------------------------");
  console.log("REAL TRAFFIC RESULTS");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Explanations Evaluated:        ${totalExplanations}`);
  console.log(`Clean (0 invented paths):      ${cleanExplanations} / ${totalExplanations} (${explanationScore.toFixed(1)}%)`);
  console.log(`Total Path Tokens Checked:     ${totalPathsChecked}`);
  console.log(`Invented Paths Flagged:        ${totalInventedPaths}`);
  console.log(`Overall Hallucination-free:    ${explanationScore.toFixed(1)}%\n`);

  if (flaggedItems.length > 0) {
    console.log("--------------------------------------------------------------------------------");
    console.log("FLAGGED FAILURES (Hand-verifiable in 10 seconds):");
    console.log("--------------------------------------------------------------------------------");
    for (const flag of flaggedItems) {
      console.log(`Target: ${flag.targetKey}`);
      console.log(`  Invented tokens:  ${flag.invented.map((i) => `"${i}"`).join(", ")}`);
      console.log(`  Shown paths (${flag.shownCount} total): ${flag.shownSamples.join(", ")}${flag.shownCount > 5 ? "..." : ""}`);
      console.log("");
    }
  } else {
    console.log("✓ All recent real explanations passed: 100% of mentioned paths were in the shown set.\n");
  }

  // 2. Acceptance Check 2: Spliced made-up filename test
  console.log("--------------------------------------------------------------------------------");
  console.log("ACCEPTANCE CHECK 2: SPLICED MADE-UP FILENAME DETECTION TEST");
  console.log("--------------------------------------------------------------------------------");

  const sampleExplanation =
    "The file `lib/ai.action.ts` coordinates AI operations. It imports `lib/constants.ts` for " +
    "configuration and delegates state changes to `src/auth/fake-token-manager.ts` before rendering.";
  const sampleShown = ["lib/ai.action.ts", "lib/constants.ts", "app/root.tsx"];

  console.log("Feeding explanation with spliced fake file: `src/auth/fake-token-manager.ts`");
  console.log(`Shown paths: ${sampleShown.join(", ")}`);

  const testResult = checkInventedPaths(sampleExplanation, sampleShown);

  console.log(`Result passed:  ${testResult.passed}`);
  console.log(`Score:          ${testResult.score}`);
  console.log(`Valid paths:    ${testResult.validPaths.join(", ")}`);
  console.log(`Invented paths: ${testResult.inventedPaths.join(", ")}`);

  if (!testResult.passed && testResult.inventedPaths.includes("src/auth/fake-token-manager.ts")) {
    console.log("\n✓ PASS: Acceptance Check 2 verified! Successfully caught spliced made-up filename.");
  } else {
    console.error("\n✗ FAIL: Failed to catch spliced made-up filename.");
    process.exit(1);
  }

  console.log("================================================================================\n");
}

async function reconstructShownPaths(
  supabase: SupabaseClient,
  analysisId: string,
  targetType: string,
  targetKey: string
): Promise<string[]> {
  const shown = new Set<string>();
  shown.add(targetKey);

  const { data: files } = await supabase
    .from("files")
    .select("id, path")
    .eq("analysis_id", analysisId);

  const fileRows = (files ?? []) as FileRow[];
  const idToPath = new Map<string, string>(fileRows.map((f) => [f.id, f.path]));
  const pathToId = new Map<string, string>(fileRows.map((f) => [f.path, f.id]));

  if (targetType === "file") {
    const fileId = pathToId.get(targetKey);
    if (!fileId) return Array.from(shown);

    const { data: outEdges } = await supabase
      .from("edges")
      .select("target_id")
      .eq("analysis_id", analysisId)
      .eq("source_id", fileId);

    for (const e of (outEdges ?? []) as { target_id: string }[]) {
      const p = idToPath.get(e.target_id);
      if (p) shown.add(p);
    }

    const { data: inEdges } = await supabase
      .from("edges")
      .select("source_id")
      .eq("analysis_id", analysisId)
      .eq("target_id", fileId);

    for (const e of (inEdges ?? []) as { source_id: string }[]) {
      const p = idToPath.get(e.source_id);
      if (p) shown.add(p);
    }
  } else {
    // Folder: all files in folder, plus cross-folder edges (incomingFrom and outgoingTo)
    const folderPrefix = targetKey === "." || targetKey === "" ? "" : targetKey.endsWith("/") ? targetKey : `${targetKey}/`;
    const folderFileIds = new Set<string>();

    for (const f of fileRows) {
      if (folderPrefix === "" || f.path.startsWith(folderPrefix)) {
        shown.add(f.path);
        folderFileIds.add(f.id);
      }
    }

    if (folderFileIds.size > 0) {
      const { data: edges } = await supabase
        .from("edges")
        .select("source_id, target_id")
        .eq("analysis_id", analysisId);

      for (const e of (edges ?? []) as EdgeRow[]) {
        const sourceInFolder = folderFileIds.has(e.source_id);
        const targetInFolder = folderFileIds.has(e.target_id);

        if (sourceInFolder && !targetInFolder) {
          // outgoingTo
          const p = idToPath.get(e.target_id);
          if (p) shown.add(p);
        } else if (!sourceInFolder && targetInFolder) {
          // incomingFrom
          const p = idToPath.get(e.source_id);
          if (p) shown.add(p);
        }
      }
    }
  }

  return Array.from(shown);
}

main().catch((err) => {
  console.error("[eval] Fatal error in check-invented-paths:", err);
  process.exit(1);
});
