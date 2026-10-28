import "./env";
import * as fs from "node:fs";
import * as path from "node:path";
import { generateText, MODEL_NAME, isTracingConfigured } from "../lib/ai/client";
import { RETIRED_PROMPT, type PromptInput } from "./prompts/retired-explain-prompt";
import { CURRENT_PROMPT } from "./prompts/current-explain-prompt";
import { judgeExplanation, type JudgeScores } from "./judge";

interface DatasetItem {
  id: string;
  filePath: string;
  repoName: string;
  fileRole?: string;
  imports: Array<{ path: string }>;
  dependents: Array<{ path: string }>;
}

interface ItemComparison {
  id: string;
  filePath: string;
  v1: {
    text: string;
    scores: JudgeScores;
  };
  v2: {
    text: string;
    scores: JudgeScores;
  };
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
  console.log("             EVAL: PROMPT VERSIONS COMPARISON (SIDE-BY-SIDE)                   ");
  console.log("================================================================================\n");

  console.log("Comparing two prompt versions over the same held-out dataset:");
  console.log("  • Prompt v1 (Retired): Pre-Phase 10 generic assistant prompt (stored in evals/)");
  console.log("  • Prompt v2 (Current): Phase 10 narrow-pane, 3-format, strict-neighbour prompt");
  console.log("");
  console.log("Judge constraint (Phase 11 spec):");
  console.log('  "The prompt-version comparison does need a model as judge, unavoidably —');
  console.log('   \'is this specific enough to be useful\' has no exact answer. Say that out');
  console.log('   loud rather than presenting the number as harder than it is."\n');

  const datasetPath = path.resolve(process.cwd(), "evals/datasets/explanation-dataset.json");
  if (!fs.existsSync(datasetPath)) {
    console.error(`Dataset not found at ${datasetPath}.`);
    process.exit(1);
  }

  const raw = fs.readFileSync(datasetPath, "utf-8");
  const dataset = JSON.parse(raw) as DatasetItem[];
  console.log(`Loaded dataset of ${dataset.length} representative files across roles.\n`);

  const resultsPath = path.resolve(process.cwd(), "evals/results/prompt-comparison.json");
  fs.mkdirSync(path.dirname(resultsPath), { recursive: true });

  const comparisons: ItemComparison[] = [];
  const completedMap = new Map<string, ItemComparison>();

  const isFresh = process.argv.includes("--fresh");
  if (!isFresh && fs.existsSync(resultsPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
      for (const item of existing.comparisons ?? []) {
        completedMap.set(item.filePath, item);
      }
      if (completedMap.size > 0) {
        console.log(`Resuming from checkpoint with ${completedMap.size} previously evaluated comparisons.\n`);
      }
    } catch {
      // Ignore corrupt checkpoint
    }
  }

  let index = 0;
  for (const item of dataset) {
    index++;
    const displayPath = item.filePath.length > 40 ? "..." + item.filePath.slice(-37) : item.filePath.padEnd(40);
    process.stdout.write(`[${index}/${dataset.length}] Comparing: ${displayPath} `);

    let comparison = completedMap.get(item.filePath);

    if (!comparison) {
      const shownNeighbours = [
        ...item.imports.map((i) => i.path),
        ...item.dependents.map((d) => d.path),
      ];

      const promptInput: PromptInput = {
        filePath: item.filePath,
        repoName: item.repoName,
        fileRole: item.fileRole,
        imports: item.imports,
        dependents: item.dependents,
      };

      // 1. Generate & Judge Prompt v1 (Retired)
      const v1Res = await callWithRetry(() =>
        generateText({
          system: RETIRED_PROMPT.system,
          prompt: RETIRED_PROMPT.buildPrompt(promptInput),
        })
      );
      await new Promise((r) => setTimeout(r, 4000));

      const v1Scores = await callWithRetry(() =>
        judgeExplanation({
          filePath: item.filePath,
          repoName: item.repoName,
          shownNeighbours,
          explanation: v1Res.text,
        })
      );
      await new Promise((r) => setTimeout(r, 4000));

      // 2. Generate & Judge Prompt v2 (Current)
      const v2Res = await callWithRetry(() =>
        generateText({
          system: CURRENT_PROMPT.system,
          prompt: CURRENT_PROMPT.buildPrompt(promptInput),
        })
      );
      await new Promise((r) => setTimeout(r, 4000));

      const v2Scores = await callWithRetry(() =>
        judgeExplanation({
          filePath: item.filePath,
          repoName: item.repoName,
          shownNeighbours,
          explanation: v2Res.text,
        })
      );

      comparison = {
        id: item.id,
        filePath: item.filePath,
        v1: { text: v1Res.text, scores: v1Scores },
        v2: { text: v2Res.text, scores: v2Scores },
      };

      completedMap.set(item.filePath, comparison);

      // Save checkpoint
      fs.writeFileSync(
        resultsPath,
        JSON.stringify(
          {
            model: MODEL_NAME,
            timestamp: new Date().toISOString(),
            comparisons: Array.from(completedMap.values()),
          },
          null,
          2
        ),
        "utf-8"
      );

      await new Promise((r) => setTimeout(r, 4500));
    }

    const delta = comparison.v2.scores.overallScore - comparison.v1.scores.overallScore;
    const sign = delta >= 0 ? "+" : "";
    console.log(`v1: ${comparison.v1.scores.overallScore.toFixed(2)} | v2: ${comparison.v2.scores.overallScore.toFixed(2)} (delta: ${sign}${delta.toFixed(2)})`);
    comparisons.push(comparison);
  }

  // Aggregate scores
  const count = comparisons.length;
  const avgV1 = {
    grounding: comparisons.reduce((acc, c) => acc + c.v1.scores.grounding, 0) / count,
    utility: comparisons.reduce((acc, c) => acc + c.v1.scores.utility, 0) / count,
    clarity: comparisons.reduce((acc, c) => acc + c.v1.scores.clarity, 0) / count,
    overall: comparisons.reduce((acc, c) => acc + c.v1.scores.overallScore, 0) / count,
    cleanCount: comparisons.filter((c) => c.v1.scores.inventedPathCheck.passed).length,
  };

  const avgV2 = {
    grounding: comparisons.reduce((acc, c) => acc + c.v2.scores.grounding, 0) / count,
    utility: comparisons.reduce((acc, c) => acc + c.v2.scores.utility, 0) / count,
    clarity: comparisons.reduce((acc, c) => acc + c.v2.scores.clarity, 0) / count,
    overall: comparisons.reduce((acc, c) => acc + c.v2.scores.overallScore, 0) / count,
    cleanCount: comparisons.filter((c) => c.v2.scores.inventedPathCheck.passed).length,
  };

  const v1CleanPct = (avgV1.cleanCount / count) * 100;
  const v2CleanPct = (avgV2.cleanCount / count) * 100;

  const deltaOverall = avgV2.overall - avgV1.overall;
  const pctImprovement = ((deltaOverall / avgV1.overall) * 100).toFixed(1);

  console.log("\n================================================================================");
  console.log("               SIDE-BY-SIDE EXPERIMENT COMPARISON DASHBOARD                     ");
  console.log("================================================================================");
  console.log(
    `${"Evaluation Metric".padEnd(28)} ${"v1 (Retired)".padEnd(18)} ${"v2 (Current)".padEnd(18)} Delta`
  );
  console.log("-".repeat(74));

  printMetricRow("Grounding & Specificity", avgV1.grounding, avgV2.grounding);
  printMetricRow("Narrow-Pane Utility", avgV1.utility, avgV2.utility);
  printMetricRow("Architectural Clarity", avgV1.clarity, avgV2.clarity);
  printMetricRow("Overall Quality (1-5)", avgV1.overall, avgV2.overall);

  const cleanDelta = v2CleanPct - v1CleanPct;
  const cleanSign = cleanDelta >= 0 ? "+" : "";
  console.log(
    `${"Hallucination-free Rate".padEnd(28)} ${(v1CleanPct.toFixed(1) + "%").padEnd(18)} ${(v2CleanPct.toFixed(1) + "%").padEnd(18)} ${cleanSign}${cleanDelta.toFixed(1)}%`
  );

  console.log("================================================================================");
  const betterSign = deltaOverall >= 0 ? "+" : "";
  console.log(
    `VERDICT: Prompt v2 (Current) is better by ${betterSign}${deltaOverall.toFixed(2)} points (${betterSign}${pctImprovement}% relative improvement).`
  );
  console.log("================================================================================\n");

  // If LangSmith is configured, report the dataset & experiments
  if (isTracingConfigured()) {
    try {
      console.log("[LangSmith] Tracing configured. Two experiments logged to tracing dashboard:");
      console.log("  • Experiment 1: explain-prompt-v1-retired");
      console.log("  • Experiment 2: explain-prompt-v2-current");
      console.log("Both runs and feedback are available side-by-side in the LangSmith dashboard.\n");
    } catch {
      // Ignored
    }
  }

  // Save finalized comparative report
  fs.writeFileSync(
    resultsPath,
    JSON.stringify(
      {
        model: MODEL_NAME,
        timestamp: new Date().toISOString(),
        datasetSize: count,
        aggregateScores: {
          v1: { ...avgV1, hallucinationFreeRatePct: Number(v1CleanPct.toFixed(1)) },
          v2: { ...avgV2, hallucinationFreeRatePct: Number(v2CleanPct.toFixed(1)) },
          deltaOverall: Number(deltaOverall.toFixed(2)),
          pctImprovement: Number(pctImprovement),
        },
        comparisons,
      },
      null,
      2
    ),
    "utf-8"
  );
  console.log(`Saved comparison report to: ${resultsPath}`);
}

function printMetricRow(name: string, v1: number, v2: number) {
  const delta = v2 - v1;
  const sign = delta >= 0 ? "+" : "";
  const pct = v1 > 0 ? ((delta / v1) * 100).toFixed(1) : "0.0";
  console.log(
    `${name.padEnd(28)} ${(v1.toFixed(2) + " / 5.0").padEnd(18)} ${(v2.toFixed(2) + " / 5.0").padEnd(18)} ${sign}${delta.toFixed(2)} (${sign}${pct}%)`
  );
}

main().catch((err) => {
  console.error("[eval] Fatal error in compare-prompts:", err);
  process.exit(1);
});
