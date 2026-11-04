import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import { getFileClassification } from "../../lib/classification";
import type { ParsedFile } from "../../parser/types";

export const listFilesByRoleTool = tool(
  async ({ role }: { role: string }, config) => {
    const data = await getAnalysisData(config);
    const targetRole = role.trim().toLowerCase();

    // Group files by normalized role label and kind
    const roleMap = new Map<
      string,
      Array<{ path: string; lineCount: number; fanIn: number; fanOut: number }>
    >();

    for (const f of data.files) {
      const classification = getFileClassification(f, data);
      const label = classification.label;
      const key = label.toLowerCase();

      let list = roleMap.get(key);
      if (!list) {
        list = [];
        roleMap.set(key, list);
      }

      const metrics = data.fanMetrics[f.path] || { fanIn: 0, fanOut: 0 };
      list.push({
        path: f.path,
        lineCount: f.lineCount,
        fanIn: metrics.fanIn,
        fanOut: metrics.fanOut,
      });
    }

    if (targetRole === "all" || !targetRole) {
      const summary = Array.from(roleMap.entries()).map(([k, files]) => ({
        role: files[0]
          ? getFileClassification(data.files.find((f: ParsedFile) => f.path === files[0].path)!, data).label
          : k,
        fileCount: files.length,
      }));
      return JSON.stringify({ availableRoles: summary }, null, 2);
    }

    // Find closest matching role
    let matchedKey: string | undefined;
    for (const key of roleMap.keys()) {
      if (key === targetRole || key.includes(targetRole) || targetRole.includes(key)) {
        matchedKey = key;
        break;
      }
    }

    if (!matchedKey) {
      const available = Array.from(roleMap.keys());
      return JSON.stringify(
        {
          error: `Role '${role}' not found in this repository.`,
          availableRoles: available,
        },
        null,
        2
      );
    }

    const matchedFiles = roleMap.get(matchedKey) || [];
    return JSON.stringify(
      {
        role: matchedKey,
        count: matchedFiles.length,
        files: matchedFiles,
      },
      null,
      2
    );
  },
  {
    name: "list_files_by_role",
    description:
      "List repository files categorized under an architectural role (e.g. 'Page routes', 'API endpoints', 'Controllers', 'Services', 'Middleware', 'Components', 'Utilities', or 'all' to see available roles).",
    schema: z.object({
      role: z
        .string()
        .describe("Role or category name to list files for, e.g. 'Controllers', 'Services', 'Page routes', or 'all'"),
    }),
  }
);
