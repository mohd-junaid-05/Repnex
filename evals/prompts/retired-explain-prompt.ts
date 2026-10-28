import type { NeighbourInfo } from "../../lib/ai/explain";

export interface PromptInput {
  filePath: string;
  repoName: string;
  fileRole?: string;
  imports: NeighbourInfo[];
  dependents: NeighbourInfo[];
}

/**
 * The previous (retired) explanation prompt from before Phase 10.
 * Lives strictly in evals/, not in the application code.
 *
 * Notice the differences from current prompt:
 * - Unconstrained formatting (often produces headings, numbered lists, tables)
 * - Lacks the explicit constraint: "never invent a file"
 * - Generic framing rather than narrow-pane architectural relationship focus
 */
export const RETIRED_PROMPT = {
  version: "v1-retired",
  system:
    "You are an AI code assistant helping a developer understand a repository. " +
    "Explain what this file does based on its path, role, and imports.",
  buildPrompt(p: PromptInput): string {
    const lines: string[] = [];
    lines.push(`Explain the file \`${p.filePath}\` in repository \`${p.repoName}\`.`);
    lines.push(`Known role: ${p.fileRole ?? "none"}`);
    lines.push(`Imports: ${p.imports.map((i) => i.path).join(", ") || "none"}`);
    lines.push(`Dependents: ${p.dependents.map((d) => d.path).join(", ") || "none"}`);
    lines.push("");
    lines.push("Give a detailed explanation of what this file does and how it fits into the project.");
    return lines.join("\n");
  },
};
