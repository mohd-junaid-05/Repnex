import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import { getFileClassification } from "../../lib/classification";
import type { ParsedFile } from "../../parser/types";

export const searchFilesTool = tool(
  async ({ query }: { query: string }, config) => {
    const data = await getAnalysisData(config);
    const q = query.trim().toLowerCase();

    if (!q) {
      return JSON.stringify({ error: "Search query cannot be empty." });
    }

    const matches = data.files.filter((f: ParsedFile) => f.path.toLowerCase().includes(q));

    if (matches.length === 0) {
      return JSON.stringify({
        query,
        count: 0,
        message: `No files found matching '${query}'.`,
      });
    }

    const MAX_RESULTS = 25;
    const results = matches.slice(0, MAX_RESULTS).map((f: ParsedFile) => {
      const classification = getFileClassification(f, data);
      const metrics = data.fanMetrics[f.path] || { fanIn: 0, fanOut: 0 };
      return {
        path: f.path,
        role: classification.label,
        lineCount: f.lineCount,
        fanIn: metrics.fanIn,
        fanOut: metrics.fanOut,
      };
    });

    return JSON.stringify(
      {
        query,
        totalMatches: matches.length,
        showing: results.length,
        results,
      },
      null,
      2
    );
  },
  {
    name: "search_files",
    description:
      "Search repository files by matching a substring against the file path or name (case-insensitive).",
    schema: z.object({
      query: z
        .string()
        .describe("Substring or filename keyword to search for, e.g. 'auth', 'user', 'button', 'api'"),
    }),
  }
);
