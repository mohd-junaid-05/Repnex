import "./env";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateText, MODEL_NAME } from "../lib/ai/client";
import {
  ASSIGNABLE_ROLES,
  type AssignableRole,
  type NeighbourInfo,
} from "../lib/ai/explain";
import type { RoleEvalItem } from "./datasets/build-role-dataset";

function parseAssignedRole(text: string): AssignableRole {
  const lower = text.toLowerCase();
  for (const role of ASSIGNABLE_ROLES) {
    if (new RegExp(`\\b${role}\\b`).test(lower)) return role;
  }
  return "util";
}

function buildRolePrompt(p: {
  filePath: string;
  repoName: string;
  lineCount: number;
  imports: NeighbourInfo[];
  dependents: NeighbourInfo[];
}): string {
  const lines: string[] = [];
  lines.push(`Assign a role to the file \`${p.filePath}\`.`);
  lines.push(`Repository: ${p.repoName}`);
  lines.push(`Line count: ${p.lineCount}`);
  lines.push(`Current role: unidentified`);
  lines.push("");
  lines.push("It imports these files:");
  if (p.imports.length === 0) lines.push("- none");
  else lines.push(...p.imports.map((n) => `- \`${n.path}\``));
  lines.push("");
  lines.push("These files import it:");
  if (p.dependents.length === 0) lines.push("- none");
  else lines.push(...p.dependents.map((n) => `- \`${n.path}\``));
  lines.push("");
  lines.push(`Choose exactly one of: ${ASSIGNABLE_ROLES.join(", ")}.`);
  return lines.join("\n");
}

async function callWithRetry<T>(fn: () => Promise<T>, maxRetries = 6): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (err: unknown) {
      attempt++;
      if (attempt > maxRetries) throw err;
      const errorObj = err as { status?: number; message?: string } | undefined;
      const isRateLimit =
        errorObj?.status === 429 ||
        errorObj?.message?.includes("429") ||
        errorObj?.message?.includes("quota") ||
        errorObj?.message?.includes("RESOURCE_EXHAUSTED");

      const isTransient =
        errorObj?.status === 503 ||
        errorObj?.status === 500 ||
        errorObj?.status === 502 ||
        errorObj?.message?.includes("503") ||
        errorObj?.message?.includes("UNAVAILABLE");

      if (isRateLimit) {
        let delayMs = 15000;
        const match = errorObj?.message?.match(/retry in ([0-9.]+)s/);
        if (match) {
          delayMs = Math.ceil(parseFloat(match[1])) * 1000 + 2000;
        } else {
          delayMs = 15000 * attempt;
        }
        process.stdout.write(` [rate limit hit, waiting ${(delayMs / 1000).toFixed(0)}s] `);
        await new Promise((r) => setTimeout(r, delayMs));
      } else if (isTransient) {
        const delayMs = 5000 * attempt;
        process.stdout.write(` [service unavailable (503), retrying in ${(delayMs / 1000).toFixed(0)}s] `);
        await new Promise((r) => setTimeout(r, delayMs));
      } else {
        throw err;
      }
    }
  }
}

async function main() {
  console.log("================================================================================");
  console.log("                   EVAL: ROLE ACCURACY (HELD-OUT SET)                           ");
  console.log("================================================================================\n");

  const datasetPath = path.resolve(process.cwd(), "evals/datasets/role-dataset.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}. Run build-role-dataset first.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, "utf-8");
  const dataset = JSON.parse(raw) as RoleEvalItem[];

  if (dataset.length < 30) {
    console.error(`Acceptance check requires at least 30 files; dataset has ${dataset.length}.`);
    process.exit(1);
  }

  // Target >= 30 files per acceptance check
  const targetCount = Math.min(dataset.length, 32);
  const evalSubset = dataset.slice(0, targetCount);

  console.log(`Loaded held-out evaluation dataset: ${dataset.length} files (evaluating ${evalSubset.length}).`);
  console.log("Rules enforced:");
  console.log("  1. Ground-truth role is HIDDEN from the model.");
  console.log("  2. Only files whose conventional role is an assignable non-structural role are evaluated.");
  console.log(`  3. Model pinned to: ${MODEL_NAME}\n`);

  const reportPath = path.resolve(process.cwd(), "evals/results/role-accuracy.json");
  fs.mkdirSync(path.dirname(reportPath), { recursive: true });

  const completedMap = new Map<
    string,
    { filePath: string; groundTruth: string; predicted: string; correct: boolean }
  >();

  const isFresh = process.argv.includes("--fresh");
  if (!isFresh && fs.existsSync(reportPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(reportPath, "utf-8"));
      for (const r of existing.results ?? []) {
        completedMap.set(r.filePath, r);
      }
      if (completedMap.size > 0) {
        console.log(`Resuming from checkpoint with ${completedMap.size} previously evaluated files.\n`);
      }
    } catch {
      // Ignore corrupt checkpoint
    }
  }

  let index = 0;
  for (const item of evalSubset) {
    index++;
    const displayPath = item.filePath.length > 42 ? "..." + item.filePath.slice(-39) : item.filePath.padEnd(42);
    process.stdout.write(`Evaluating [${index}/${evalSubset.length}]: ${displayPath} `);

    let result = completedMap.get(item.filePath);
    if (!result) {
      const prompt = buildRolePrompt({
        filePath: item.filePath,
        repoName: item.repoName,
        lineCount: item.lineCount,
        imports: item.imports,
        dependents: item.dependents,
      });

      const { text } = await callWithRetry(() =>
        generateText({
          system:
            "You are assigning a role to a single file in a real repository. " +
            "Answer with exactly one of these words, nothing else: " +
            ASSIGNABLE_ROLES.join(", ") + ". " +
            "These are the only allowed answers. Never answer with a routable role such as page, route, or controller.",
          prompt,
        })
      );

      const predicted = parseAssignedRole(text);
      const isCorrect = predicted === item.groundTruthRole;
      result = {
        filePath: item.filePath,
        groundTruth: item.groundTruthRole,
        predicted,
        correct: isCorrect,
      };

      completedMap.set(item.filePath, result);

      // Save checkpoint
      fs.writeFileSync(
        reportPath,
        JSON.stringify(
          {
            datasetSize: completedMap.size,
            model: MODEL_NAME,
            timestamp: new Date().toISOString(),
            results: Array.from(completedMap.values()),
          },
          null,
          2
        ),
        "utf-8"
      );

      // Polite delay between calls to respect Gemini Free Tier rate limits (15 RPM)
      await new Promise((r) => setTimeout(r, 4500));
    }

    console.log(result.correct ? `✓ (match: ${result.predicted})` : `✗ (got ${result.predicted}, expected ${result.groundTruth})`);
  }

  const allResults = evalSubset.map((item) => completedMap.get(item.filePath)!);
  const correctCount = allResults.filter((r) => r.correct).length;
  const accuracyPct = (correctCount / allResults.length) * 100;

  const perRoleStats = new Map<string, { total: number; correct: number }>();
  for (const r of allResults) {
    const stats = perRoleStats.get(r.groundTruth) ?? { total: 0, correct: 0 };
    stats.total++;
    if (r.correct) stats.correct++;
    perRoleStats.set(r.groundTruth, stats);
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("PER-ROLE BREAKDOWN");
  console.log("--------------------------------------------------------------------------------");
  console.log(`${"Role".padEnd(16)} ${"Correct".padEnd(12)} ${"Total".padEnd(10)} Accuracy`);
  console.log("-".repeat(50));
  for (const [role, stats] of perRoleStats.entries()) {
    const roleAcc = stats.total > 0 ? (stats.correct / stats.total) * 100 : 0;
    console.log(
      `${role.padEnd(16)} ${String(stats.correct).padEnd(12)} ${String(stats.total).padEnd(10)} ${roleAcc.toFixed(1)}%`
    );
  }

  console.log("\n--------------------------------------------------------------------------------");
  console.log("SUMMARY RESULTS");
  console.log("--------------------------------------------------------------------------------");
  console.log(`Evaluated Dataset Size:  ${allResults.length} files (spec requirement: >= 30)`);
  console.log(`Correct Classifications: ${correctCount} / ${allResults.length}`);
  console.log(`Overall Role Accuracy:   ${accuracyPct.toFixed(1)}%`);
  console.log("================================================================================\n");

  fs.writeFileSync(
    reportPath,
    JSON.stringify(
      {
        datasetSize: allResults.length,
        correctCount,
        accuracyPct: Number(accuracyPct.toFixed(2)),
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
        results: allResults,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`Detailed report written to: ${reportPath}`);
}

main().catch((err) => {
  console.error("[eval] Fatal error in check-role-accuracy:", err);
  process.exit(1);
});
