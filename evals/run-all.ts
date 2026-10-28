import "./env";
import { execSync } from "node:child_process";

console.log("================================================================================");
console.log("                   REPNEX EVALUATION SUITE (PHASE 11)                           ");
console.log("================================================================================\n");

function run(cmd: string, title: string) {
  console.log(`\n>>> STARTING: ${title} (${cmd})\n`);
  try {
    execSync(cmd, { stdio: "inherit" });
  } catch {
    console.error(`\n>>> FAILED: ${title}`);
    process.exit(1);
  }
}

// 1. Invented-path check
run("npx tsx evals/check-invented-paths.ts", "Invented-Path Check (Deterministic)");

// 2. Role accuracy
run("npx tsx evals/check-role-accuracy.ts", "Role Accuracy (Held-out Conventional Set)");

// 3. Prompt version comparison
run("npx tsx evals/compare-prompts.ts", "Prompt Version Comparison (Model-as-Judge Side-by-Side)");

console.log("\n================================================================================");
console.log("                   ALL PHASE 11 EVALUATIONS COMPLETE                            ");
console.log("================================================================================\n");
