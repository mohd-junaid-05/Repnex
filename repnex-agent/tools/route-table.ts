import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { getAnalysisData } from "./data-provider";
import type { ExtractedRoute } from "../../parser/types";

export const routeTableTool = tool(
  async ({ filter }: { filter?: string }, config) => {
    const data = await getAnalysisData(config);
    const routes = data.routes ?? [];

    if (routes.length === 0) {
      return JSON.stringify({
        totalRoutes: 0,
        message:
          "No HTTP routes were extracted for this repository (or this framework adapter does not have recoverable static routes).",
      });
    }

    let filtered = routes;
    if (filter) {
      const f = filter.trim().toLowerCase();
      filtered = routes.filter(
        (r: ExtractedRoute) =>
          r.routePath.toLowerCase().includes(f) ||
          r.filePath.toLowerCase().includes(f) ||
          r.httpMethods.some((m: string) => m.toLowerCase().includes(f))
      );
    }

    return JSON.stringify(
      {
        totalRoutes: routes.length,
        matchedRoutes: filtered.length,
        routes: filtered.map((r: ExtractedRoute) => ({
          methods: r.httpMethods,
          path: r.routePath,
          file: r.filePath,
        })),
      },
      null,
      2
    );
  },
  {
    name: "route_table",
    description:
      "Get the HTTP route table for the repository, showing recovered URL paths, HTTP methods (GET, POST, etc.), and the files that handle them.",
    schema: z.object({
      filter: z
        .string()
        .optional()
        .describe("Optional keyword or URL substring to filter routes by (e.g. 'api', 'users', 'auth')"),
    }),
  }
);
