import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import type { ParsedFile, ParsedEdge } from "../../parser/types";

export const fileNeighborsTool = tool(
  async ({ filePath }: { filePath: string }, config) => {
    const data = await getAnalysisData(config);
    const normalized = filePath.replace(/\\/g, "/").trim();

    // Check if file exists in analysis
    const file = data.files.find(
      (f: ParsedFile) => f.path.toLowerCase() === normalized.toLowerCase()
    );
    const actualPath = file ? file.path : normalized;

    if (!file) {
      // Suggest close matches
      const suggestions = data.files
        .filter((f: ParsedFile) => f.path.toLowerCase().includes(normalized.toLowerCase()))
        .slice(0, 5)
        .map((f: ParsedFile) => f.path);

      return JSON.stringify(
        {
          error: `File '${filePath}' does not exist in the analyzed repository.`,
          suggestions: suggestions.length > 0 ? suggestions : undefined,
        },
        null,
        2
      );
    }

    // Dependencies (outgoing edges: files imported by this file)
    const dependencies = data.edges
      .filter((e: ParsedEdge) => e.sourcePath === actualPath)
      .map((e: ParsedEdge) => ({
        targetPath: e.targetPath,
        importSpecifier: e.importSpecifier,
        kind: e.kind,
      }));

    // Dependents (incoming edges: files that import this file)
    const dependents = data.edges
      .filter((e: ParsedEdge) => e.targetPath === actualPath)
      .map((e: ParsedEdge) => ({
        sourcePath: e.sourcePath,
        importSpecifier: e.importSpecifier,
        kind: e.kind,
      }));

    return JSON.stringify(
      {
        filePath: actualPath,
        fanIn: dependents.length,
        fanOut: dependencies.length,
        dependencies,
        dependents,
      },
      null,
      2
    );
  },
  {
    name: "file_neighbors",
    description:
      "Get the immediate neighbors of a file: direct dependencies (files this file imports) and direct dependents (files that import this file).",
    schema: z.object({
      filePath: z
        .string()
        .describe("Exact relative path of the file, e.g. 'lib/auth.ts' or 'src/index.ts'"),
    }),
  }
);
