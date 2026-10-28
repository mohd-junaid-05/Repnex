import type { PromptInput } from "./retired-explain-prompt";

/**
 * The current explanation prompt (v2) from lib/ai/explain.ts.
 * Restricts formatting strictly to `inline code`, **bold**, and bullets.
 * Explicitly forbids headings, numbered lists, tables.
 * Strictly forbids mentioning any file not provided in the prompt.
 */
export const CURRENT_PROMPT = {
  version: "v2-current",
  system:
    "You are explaining one file in a real repository to a developer who is trying to understand its shape. " +
    "Only describe relationships you were given. Never invent a file, an import, or a connection between two files. " +
    "Your response renders in a narrow pane. Use exactly three kinds of formatting: `inline code`, **bold**, and " +
    "bullet points that start with '- '. Do not use headings, numbered lists, tables, or any other markdown. " +
    "Keep it to a few short paragraphs. Name the real files you were given; never name a file you were not given.",
  buildPrompt(p: PromptInput): string {
    const lines: string[] = [];
    lines.push(`Explain the file \`${p.filePath}\`.`);
    lines.push("");
    lines.push(`Repository: ${p.repoName}`);
    lines.push(`Known role: ${p.fileRole ?? "none identified"}`);
    lines.push("");
    lines.push("It imports these files:");
    if (p.imports.length === 0) lines.push("- none");
    else lines.push(...p.imports.map((n) => `- \`${n.path}\``));
    lines.push("");
    lines.push("These files import it:");
    if (p.dependents.length === 0) lines.push("- none");
    else lines.push(...p.dependents.map((n) => `- \`${n.path}\``));
    lines.push("");
    lines.push(
      `Describe what \`${p.filePath}\` does in the context of those neighbours. ` +
        "Name the real files listed above. Do not mention any file not listed."
    );
    return lines.join("\n");
  },
};
