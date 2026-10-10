import type { ParsedFile, ParseResult } from "../parser/types";
import { classifyFile, FileClassification } from "./classification";

export type WalkDirection = "blast-radius" | "dependency-chain";

export interface TransitiveStep {
  path: string;
  depth: number;
}

/**
 * Pure transitive walk over the edge list.
 * - 'blast-radius': walks incoming edges (dependents - what breaks if filePath changes)
 * - 'dependency-chain': walks outgoing edges (dependencies - what filePath needs)
 * Depth limit defaults to 2.
 * Written once, used for both directions.
 */
export function computeTransitiveWalk(
  startPath: string,
  edges: Array<{ sourcePath: string; targetPath: string }>,
  direction: WalkDirection,
  maxDepth: number = 2
): TransitiveStep[] {
  if (!startPath || maxDepth <= 0) return [];

  // Build adjacency list based on direction
  // For blast-radius: edge.targetPath is depended upon, edge.sourcePath depends on it.
  //   Moving from startPath: find all edges where targetPath === startPath -> move to sourcePath.
  // For dependency-chain: edge.sourcePath imports edge.targetPath.
  //   Moving from startPath: find all edges where sourcePath === startPath -> move to targetPath.
  const adj = new Map<string, string[]>();
  for (const edge of edges) {
    const from = direction === "blast-radius" ? edge.targetPath : edge.sourcePath;
    const to = direction === "blast-radius" ? edge.sourcePath : edge.targetPath;

    let neighbors = adj.get(from);
    if (!neighbors) {
      neighbors = [];
      adj.set(from, neighbors);
    }
    neighbors.push(to);
  }

  const results: TransitiveStep[] = [];
  const visited = new Set<string>([startPath]);
  const queue: Array<[string, number]> = [[startPath, 0]];

  while (queue.length > 0) {
    const [curr, depth] = queue.shift()!;

    if (depth >= maxDepth) continue;

    const neighbors = adj.get(curr) || [];
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        results.push({ path: next, depth: depth + 1 });
        queue.push([next, depth + 1]);
      }
    }
  }

  return results;
}

export interface DetectedCycle {
  key: string;
  chain: string[];
}

/**
 * Iterative cycle detection.
 * Avoids call-stack recursion to prevent blowing the stack on deep or dense graphs.
 */
export function detectCyclesIterative(
  files: ParsedFile[],
  edges: Array<{ sourcePath: string; targetPath: string }>
): DetectedCycle[] {
  const adj = new Map<string, string[]>();
  for (const f of files) {
    adj.set(f.path, []);
  }
  for (const e of edges) {
    if (adj.has(e.sourcePath)) {
      adj.get(e.sourcePath)!.push(e.targetPath);
    }
  }

  const uniqueCycles = new Map<string, string[]>();

  // Use iterative DFS from each node
  for (const file of files) {
    const start = file.path;
    // Stack frame holds the current node and the index of the next neighbor to visit
    const stack: Array<{ node: string; neighborIdx: number }> = [{ node: start, neighborIdx: 0 }];
    const inStack = new Set<string>([start]);
    const pathStack: string[] = [start];

    while (stack.length > 0) {
      const top = stack[stack.length - 1];
      const neighbors = adj.get(top.node) || [];

      if (top.neighborIdx < neighbors.length) {
        const next = neighbors[top.neighborIdx];
        top.neighborIdx++;

        if (next === start) {
          // Found a cycle returning to start node
          const cycle = [...pathStack];
          // Canonicalize cycle representation to avoid permutations
          let minIdx = 0;
          for (let i = 1; i < cycle.length; i++) {
            if (cycle[i] < cycle[minIdx]) minIdx = i;
          }
          const canonical = [...cycle.slice(minIdx), ...cycle.slice(0, minIdx)];
          const key = canonical.join(" -> ");
          if (!uniqueCycles.has(key)) {
            uniqueCycles.set(key, canonical);
          }
        } else if (!inStack.has(next)) {
          // Cap search depth per path to 20 to prevent runaway paths in huge cycles
          if (pathStack.length < 20) {
            inStack.add(next);
            pathStack.push(next);
            stack.push({ node: next, neighborIdx: 0 });
          }
        }
      } else {
        const popped = stack.pop()!;
        inStack.delete(popped.node);
        pathStack.pop();
      }
    }
  }

  return Array.from(uniqueCycles.entries()).map(([key, chain]) => ({
    key,
    chain,
  }));
}

export type InsightKind = "unreferenced" | "high-fan-in" | "cycle" | "oversized";

export interface InsightItem {
  id: string;
  kind: InsightKind;
  filePath: string;
  file: ParsedFile;
  classification: FileClassification;
  sentence: string;
  metric: string;
  cycleChain?: string[];
}

export interface InsightsGroup {
  kind: InsightKind;
  title: string;
  sentence: string;
  items: InsightItem[];
}

export interface InsightsSummary {
  totalCount: number;
  unreferenced: InsightItem[];
  highFanIn: InsightItem[];
  cycles: InsightItem[];
  oversized: InsightItem[];
  groups: InsightsGroup[];
}

// Four fixed sentence strings per Phase 06 spec
export const INSIGHT_SENTENCES: Record<InsightKind, string> = {
  unreferenced: "No other file in the repository imports this file.",
  "high-fan-in": "An unusually high number of files depend on this file.",
  cycle: "This file is part of an import cycle.",
  oversized: "File length exceeds the recommended size threshold.",
};

// Framework kinds reached by runtime/routing/bundlers rather than internal imports
const FRAMEWORK_ENTRY_KINDS = new Set([
  "page",
  "route",
  "layout",
  "config",
  "entry",
  "test",
  "story",
]);

/**
 * Pure function computing the 4 repository insights.
 * Strict constraint: Files-nothing-imports leads the list, followed by high fan-in, cycles, and oversized.
 */
export function computeInsights(data: ParseResult): InsightsSummary {
  const fileMap = new Map<string, ParsedFile>();
  data.files.forEach((f) => fileMap.set(f.path, f));

  // 1. Files nothing imports (fanIn === 0, NOT framework-reached)
  const unreferenced: InsightItem[] = [];
  for (const file of data.files) {
    const metrics = data.fanMetrics[file.path] || { fanIn: 0, fanOut: 0 };
    const classification = classifyFile(file);

    if (metrics.fanIn === 0 && !FRAMEWORK_ENTRY_KINDS.has(classification.kind)) {
      unreferenced.push({
        id: `unreferenced-${file.path}`,
        kind: "unreferenced",
        filePath: file.path,
        file,
        classification,
        sentence: INSIGHT_SENTENCES.unreferenced,
        metric: "0 incoming",
      });
    }
  }
  unreferenced.sort((a, b) => a.filePath.localeCompare(b.filePath));

  // 2. Files an unusual number of things import (high fanIn)
  const fanInValues = data.files.map(
    (f) => data.fanMetrics[f.path]?.fanIn ?? 0
  );
  const sumFanIn = fanInValues.reduce((acc, v) => acc + v, 0);
  const avgFanIn = data.files.length > 0 ? sumFanIn / data.files.length : 0;
  const variance =
    data.files.length > 0
      ? fanInValues.reduce((acc, v) => acc + Math.pow(v - avgFanIn, 2), 0) / data.files.length
      : 0;
  const stdDev = Math.sqrt(variance);

  // Threshold: fanIn >= 5 and at least 1.5 standard deviations above mean, or fanIn >= 10
  const fanInThreshold = Math.max(5, Math.round(avgFanIn + 1.5 * stdDev));

  const highFanIn: InsightItem[] = [];
  for (const file of data.files) {
    const metrics = data.fanMetrics[file.path] || { fanIn: 0, fanOut: 0 };
    if (metrics.fanIn >= fanInThreshold) {
      highFanIn.push({
        id: `high-fan-in-${file.path}`,
        kind: "high-fan-in",
        filePath: file.path,
        file,
        classification: classifyFile(file),
        sentence: INSIGHT_SENTENCES["high-fan-in"],
        metric: `<- ${metrics.fanIn} dependents`,
      });
    }
  }
  highFanIn.sort((a, b) => {
    const aFan = data.fanMetrics[a.filePath]?.fanIn ?? 0;
    const bFan = data.fanMetrics[b.filePath]?.fanIn ?? 0;
    return bFan - aFan || a.filePath.localeCompare(b.filePath);
  });

  // 3. Import cycles
  const detectedCycles = detectCyclesIterative(data.files, data.edges);
  const cycleItems: InsightItem[] = [];
  const filesInCycles = new Set<string>();

  for (const cycle of detectedCycles) {
    for (const filePath of cycle.chain) {
      if (!filesInCycles.has(filePath)) {
        filesInCycles.add(filePath);
        const file = fileMap.get(filePath) || {
          path: filePath,
          folder: filePath.includes("/") ? filePath.slice(0, filePath.lastIndexOf("/")) : "",
          language: "typescript" as const,
          lineCount: 0,
          contentHash: "",
        };

        cycleItems.push({
          id: `cycle-${filePath}`,
          kind: "cycle",
          filePath,
          file,
          classification: classifyFile(file),
          sentence: INSIGHT_SENTENCES.cycle,
          metric: `${cycle.chain.length}-file loop: ${cycle.chain
            .map((p) => p.split("/").pop() || p)
            .join(" -> ")}`,
          cycleChain: cycle.chain,
        });
      }
    }
  }
  cycleItems.sort((a, b) => a.filePath.localeCompare(b.filePath));

  // 4. Files that are simply too long (oversized)
  const OVERSIZED_LINE_THRESHOLD = 300;
  const oversized: InsightItem[] = [];
  for (const file of data.files) {
    if (file.lineCount >= OVERSIZED_LINE_THRESHOLD) {
      oversized.push({
        id: `oversized-${file.path}`,
        kind: "oversized",
        filePath: file.path,
        file,
        classification: classifyFile(file),
        sentence: INSIGHT_SENTENCES.oversized,
        metric: `${file.lineCount} lines`,
      });
    }
  }
  oversized.sort((a, b) => b.file.lineCount - a.file.lineCount || a.filePath.localeCompare(b.filePath));

  const groups: InsightsGroup[] = [
    {
      kind: "unreferenced",
      title: "Files nothing imports",
      sentence: INSIGHT_SENTENCES.unreferenced,
      items: unreferenced,
    },
    {
      kind: "high-fan-in",
      title: "Heavily depended on",
      sentence: INSIGHT_SENTENCES["high-fan-in"],
      items: highFanIn,
    },
    {
      kind: "cycle",
      title: "Import cycles",
      sentence: INSIGHT_SENTENCES.cycle,
      items: cycleItems,
    },
    {
      kind: "oversized",
      title: "Oversized files",
      sentence: INSIGHT_SENTENCES.oversized,
      items: oversized,
    },
  ];

  const totalCount = unreferenced.length + highFanIn.length + cycleItems.length + oversized.length;

  return {
    totalCount,
    unreferenced,
    highFanIn,
    cycles: cycleItems,
    oversized,
    groups,
  };
}
