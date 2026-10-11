/**
 * Main parser entry point.
 * Orchestrates the walk, extraction, metrics and coverage into a ParseResult.
 * No web framework, no UI, no database.
 */

import * as path from 'node:path';
import * as fs from 'node:fs';
import type { ParseResult, CoverageReport, FrameworkAdapter } from './types';
import { walkRepository } from './walker';
import { extractImports } from './extractor';
import { computeFanMetrics } from './metrics';
import { detectAdapter, fallbackAdapter } from './adapters';

export interface ParseOptions {
  /** Path to the repository root directory. */
  repoRoot: string;
  /** Framework adapter to use. Defaults to automatic detection. */
  adapter?: FrameworkAdapter;
}

/**
 * Parse a repository and return the full result.
 * This is the single function everything else calls.
 */
export function parseRepository(options: ParseOptions): ParseResult {
  const { repoRoot } = options;
  const absoluteRoot = path.resolve(repoRoot);

  // 1. Walk the repository with initial adapter or fallback
  const initialAdapter = options.adapter ?? fallbackAdapter;
  const { files, skippedFiles } = walkRepository(absoluteRoot, initialAdapter);

  // 2. Detect adapter if not explicitly supplied (first match wins in fixed order)
  const activeAdapter = options.adapter ?? detectAdapter(absoluteRoot, files);

  // 3. Find tsconfig if it exists
  const tsconfigPath = findTsConfig(absoluteRoot);

  // 4. Extract imports
  const { edges, unresolved } = extractImports(absoluteRoot, files, tsconfigPath);

  // 5. Compute fan metrics
  const fanMetrics = computeFanMetrics(files, edges);

  // 6. Collect distinct folders
  const folderSet = new Set<string>();
  for (const file of files) {
    if (file.folder) {
      folderSet.add(file.folder);
      // Also add parent folders so the hierarchy is complete
      let parent = path.posix.dirname(file.folder);
      while (parent && parent !== '.') {
        folderSet.add(parent);
        parent = path.posix.dirname(parent);
      }
    }
  }
  const folders = [...folderSet].sort();

  // 7. Build coverage report
  const externalCount = unresolved.filter((u) => u.reason === 'node-module').length;
  const coverage: CoverageReport = {
    totalFilesFound: files.length + skippedFiles.length,
    filesParsed: files.length,
    filesSkipped: skippedFiles.length,
    skippedFiles,
    totalImports: edges.length + unresolved.length,
    resolvedImports: edges.length,
    externalImports: externalCount,
    unresolvedImports: unresolved.filter((u) => u.reason !== 'node-module'),
  };

  // 8. Framework roles & routes
  const fileRoles = activeAdapter.assignRoles(absoluteRoot, files);
  const routes = activeAdapter.extractRoutes(absoluteRoot, files);

  return {
    repoRoot: absoluteRoot,
    parsedAt: new Date().toISOString(),
    framework: activeAdapter.id,
    files,
    edges,
    fanMetrics,
    coverage,
    folders,
    routes,
    fileRoles,
  };
}

/** Look for tsconfig.json in the repo root. */
function findTsConfig(repoRoot: string): string | null {
  const candidates = ['tsconfig.json', 'tsconfig.app.json', 'jsconfig.json'];
  for (const name of candidates) {
    const p = path.join(/*turbopackIgnore: true*/ repoRoot, name);
    if (fs.existsSync(/*turbopackIgnore: true*/ p)) return p;
  }
  return null;
}

// Re-export types so consumers of the parser only need one import
export type {
  ParseResult,
  ParsedFile,
  ParsedEdge,
  UnresolvedImport,
  FileFanMetrics,
  CoverageReport,
  SkippedFile,
  FrameworkAdapter,
  ExtractedRoute,
  EdgeKind,
  FileLanguage,
  UnresolvedReason,
} from './types';
