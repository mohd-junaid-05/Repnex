/**
 * Fan-in/fan-out computation.
 * Pure function over a file list and an edge list — no side effects, no I/O.
 */

import type { ParsedFile, ParsedEdge, FileFanMetrics } from './types';

/**
 * Compute fan-in and fan-out for every file.
 * Fan-out: how many distinct files this file imports.
 * Fan-in: how many distinct files import this file.
 */
export function computeFanMetrics(
  files: ParsedFile[],
  edges: ParsedEdge[],
): Record<string, FileFanMetrics> {
  const metrics: Record<string, FileFanMetrics> = {};

  // Initialise every file with zero counts
  for (const file of files) {
    metrics[file.path] = { fanIn: 0, fanOut: 0 };
  }

  // Count distinct importers/importees per file
  const importersOf = new Map<string, Set<string>>();
  const importeesOf = new Map<string, Set<string>>();

  for (const edge of edges) {
    if (!importersOf.has(edge.targetPath)) {
      importersOf.set(edge.targetPath, new Set());
    }
    importersOf.get(edge.targetPath)!.add(edge.sourcePath);

    if (!importeesOf.has(edge.sourcePath)) {
      importeesOf.set(edge.sourcePath, new Set());
    }
    importeesOf.get(edge.sourcePath)!.add(edge.targetPath);
  }

  for (const [filePath, importers] of importersOf) {
    if (metrics[filePath]) {
      metrics[filePath].fanIn = importers.size;
    }
  }

  for (const [filePath, importees] of importeesOf) {
    if (metrics[filePath]) {
      metrics[filePath].fanOut = importees.size;
    }
  }

  return metrics;
}
