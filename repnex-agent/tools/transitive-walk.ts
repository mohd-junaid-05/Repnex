import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import { computeTransitiveWalk, type WalkDirection } from "../../lib/graph-math";
import type { ParsedFile } from "../../parser/types";

export const transitiveWalkTool = tool(
  async (
    {
      filePath,
      direction,
      maxDepth = 2,
    }: {
      filePath: string;
      direction: WalkDirection;
      maxDepth?: number;
    },
    config
  ) => {
    const data = await getAnalysisData(config);
    const normalized = filePath.replace(/\\/g, "/").trim();

    const file = data.files.find(
      (f: ParsedFile) => f.path.toLowerCase() === normalized.toLowerCase()
    );
    const actualPath = file ? file.path : normalized;

    if (!file) {
      return JSON.stringify({
        error: `File '${filePath}' does not exist in the analyzed repository.`,
      });
    }

    const depth = Math.min(Math.max(1, maxDepth || 2), 5);
    const steps = computeTransitiveWalk(actualPath, data.edges, direction, depth);

    // Group steps by depth
    const byDepth: Record<number, string[]> = {};
    for (const step of steps) {
      if (!byDepth[step.depth]) {
        byDepth[step.depth] = [];
      }
      byDepth[step.depth].push(step.path);
    }

    return JSON.stringify(
      {
        startPath: actualPath,
        direction,
        maxDepth: depth,
        totalReachableFiles: steps.length,
        levels: byDepth,
        explanation:
          direction === "blast-radius"
            ? `If '${actualPath}' changes, these ${steps.length} files may be affected across ${depth} hops.`
            : `'${actualPath}' transitively relies upon these ${steps.length} files across ${depth} hops.`,
      },
      null,
      2
    );
  },
  {
    name: "transitive_walk",
    description:
      "Perform a multi-hop transitive walk across the dependency graph. Use 'blast-radius' to find all files affected if a target file changes (incoming dependents), or 'dependency-chain' to trace what a file transitively depends on (outgoing dependencies).",
    schema: z.object({
      filePath: z.string().describe("Starting relative file path, e.g. 'lib/auth.ts'"),
      direction: z
        .enum(["blast-radius", "dependency-chain"])
        .describe(
          "'blast-radius' (what breaks if file changes) or 'dependency-chain' (what file depends on)"
        ),
      maxDepth: z
        .number()
        .int()
        .min(1)
        .max(5)
        .default(2)
        .describe("Maximum hop depth (default 2)"),
    }),
  }
);
