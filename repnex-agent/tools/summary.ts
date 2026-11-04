import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import { getFileClassification } from "../../lib/classification";
import type { ParsedFile } from "../../parser/types";

export const summaryTool = tool(
  async (_args, config) => {
    const data = await getAnalysisData(config);

    // 1. Framework and counts
    const totalFiles = data.files.length;
    const totalEdges = data.edges.length;
    const totalRoutes = data.routes?.length ?? 0;
    const foldersCount =
      data.folders?.length ??
      new Set(data.files.map((f: ParsedFile) => f.folder).filter(Boolean)).size;

    // 2. Role distribution
    const roleCounts = new Map<string, number>();
    for (const file of data.files) {
      const classification = getFileClassification(file, data);
      const roleLabel = classification.label;
      roleCounts.set(roleLabel, (roleCounts.get(roleLabel) ?? 0) + 1);
    }
    const roleBreakdown = Array.from(roleCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([role, count]) => `${role}: ${count}`);

    // 3. Top depended-on files (highest fan-in)
    const sortedByFanIn = [...data.files]
      .map((f: ParsedFile) => ({
        path: f.path,
        fanIn: data.fanMetrics[f.path]?.fanIn ?? 0,
        fanOut: data.fanMetrics[f.path]?.fanOut ?? 0,
      }))
      .sort((a, b) => b.fanIn - a.fanIn)
      .slice(0, 7);

    // 4. Reading entry points (fan-in 0 or index/entry files)
    const entryFiles = data.files
      .filter((f: ParsedFile) => {
        const metrics = data.fanMetrics[f.path] || { fanIn: 0, fanOut: 0 };
        const name = f.path.split("/").pop()?.toLowerCase() || "";
        return (
          metrics.fanIn === 0 ||
          name.startsWith("index.") ||
          name.startsWith("main.") ||
          name.startsWith("app.")
        );
      })
      .slice(0, 7)
      .map((f: ParsedFile) => f.path);

    return JSON.stringify(
      {
        framework: data.framework || "generic",
        totalFiles,
        totalFolders: foldersCount,
        totalEdges,
        totalRoutes,
        roleDistribution: roleBreakdown,
        topDependedOnFiles: sortedByFanIn,
        suggestedEntryFiles: entryFiles,
      },
      null,
      2
    );
  },
  {
    name: "summary",
    description:
      "Get a high-level summary of the entire repository analysis, including framework, file count, edge count, route count, role distribution, and top depended-on files.",
    schema: z.object({}),
  }
);
