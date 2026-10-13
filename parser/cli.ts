/**
 * CLI entry point for the parser.
 * Usage:
 *   npx tsx parser/cli.ts <directory> [--output <file.json>]
 *
 * Prints a summary of what was found. With --output, writes the full
 * ParseResult as JSON. That file is the contract downstream phases consume.
 *
 * No web framework, no UI, no database.
 */

import { parseRepository } from './index';
import type { ParseResult } from './types';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** Parse the CLI repository path, print a summary, and optionally write and verify JSON output. */
function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help')) {
    console.log('Usage: npx tsx parser/cli.ts <directory> [--output <file.json>]');
    console.log('');
    console.log('Parse a repository and print what was found.');
    console.log('With --output, write the full result as typed JSON.');
    process.exit(args.includes('--help') ? 0 : 1);
  }

  const repoRoot = args[0];
  let outputPath: string | null = null;

  const outputIdx = args.indexOf('--output');
  if (outputIdx !== -1) {
    if (outputIdx + 1 >= args.length) {
      console.error('--output requires a file path');
      process.exit(1);
    }
    outputPath = args[outputIdx + 1];
  }

  if (!fs.existsSync(repoRoot)) {
    console.error(`Directory not found: ${repoRoot}`);
    process.exit(1);
  }

  console.log(`Parsing: ${path.resolve(repoRoot)}`);
  console.log('');

  const result = parseRepository({ repoRoot });

  printSummary(result);

    if (outputPath) {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log('');
    console.log(`Full result written to: ${path.resolve(outputPath)}`);

    // Verify round-trip: read it back and check types hold
    const readBack = JSON.parse(fs.readFileSync(outputPath, 'utf-8')) as ParseResult;
    const filesMatch = readBack.files.length === result.files.length;
    const edgesMatch = readBack.edges.length === result.edges.length;
    const foldersMatch = readBack.folders.length === result.folders.length;
    const frameworkMatch = readBack.framework === result.framework;
    const routesMatch = readBack.routes.length === result.routes.length;

    if (filesMatch && edgesMatch && foldersMatch && frameworkMatch && routesMatch) {
      console.log('Round-trip verification: OK');
    } else {
      console.error('Round-trip verification: FAILED');
      console.error(`  files: ${readBack.files.length} vs ${result.files.length}`);
      console.error(`  edges: ${readBack.edges.length} vs ${result.edges.length}`);
      console.error(`  folders: ${readBack.folders.length} vs ${result.folders.length}`);
      console.error(`  framework: ${readBack.framework} vs ${result.framework}`);
      console.error(`  routes: ${readBack.routes.length} vs ${result.routes.length}`);
      process.exit(1);
    }
  }
}

/** Print parse coverage, unresolved imports, folders, and the highest fan-in/out files. */
function printSummary(result: ParseResult): void {
  const { edges, coverage, folders, fanMetrics, framework, routes, fileRoles } = result;

  console.log('=== Framework ===');
  console.log(`  Framework: ${framework}`);
  console.log(`  Routes:    ${routes.length}`);
  if (routes.length > 0) {
    for (const r of routes.slice(0, 5)) {
      console.log(`    - [${r.httpMethods.join(',')}] ${r.routePath} (${r.filePath})`);
    }
    if (routes.length > 5) {
      console.log(`    ... and ${routes.length - 5} more`);
    }
  }

  const roleCounts = new Map<string, number>();
  for (const role of Object.values(fileRoles)) {
    roleCounts.set(role, (roleCounts.get(role) ?? 0) + 1);
  }
  console.log('');
  console.log('=== Roles ===');
  for (const [role, count] of roleCounts) {
    console.log(`  ${role}: ${count}`);
  }
  console.log('');

  console.log('=== Files ===');
  console.log(`  Found:   ${coverage.totalFilesFound}`);
  console.log(`  Parsed:  ${coverage.filesParsed}`);
  console.log(`  Skipped: ${coverage.filesSkipped}`);
  console.log(
    `  Check:   ${coverage.filesParsed} + ${coverage.filesSkipped} = ${coverage.filesParsed + coverage.filesSkipped} (total: ${coverage.totalFilesFound})`,
  );

  if (coverage.skippedFiles.length > 0) {
    console.log('');
    console.log('=== Skipped Files ===');
    // Group by reason
    const byReason = new Map<string, string[]>();
    for (const sf of coverage.skippedFiles) {
      if (!byReason.has(sf.reason)) byReason.set(sf.reason, []);
      byReason.get(sf.reason)!.push(sf.path);
    }
    for (const [reason, paths] of byReason) {
      console.log(`  ${reason}: ${paths.length} file(s)`);
      // Show up to 5 examples
      for (const p of paths.slice(0, 5)) {
        console.log(`    - ${p}`);
      }
      if (paths.length > 5) {
        console.log(`    ... and ${paths.length - 5} more`);
      }
    }
  }

  console.log('');
  console.log('=== Folders ===');
  console.log(`  Distinct folders: ${folders.length}`);

  console.log('');
  console.log('=== Edges ===');
  console.log(`  Total imports seen: ${coverage.totalImports}`);
  console.log(`  Resolved (internal): ${coverage.resolvedImports}`);
  console.log(`  External (node_modules): ${coverage.externalImports}`);
  console.log(`  Unresolved: ${coverage.unresolvedImports.length}`);

  // Edge kinds
  const byKind = new Map<string, number>();
  for (const e of edges) {
    byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + 1);
  }
  if (byKind.size > 0) {
    console.log('  By kind:');
    for (const [kind, count] of byKind) {
      console.log(`    ${kind}: ${count}`);
    }
  }

  if (coverage.unresolvedImports.length > 0) {
    console.log('');
    console.log('=== Unresolved Imports ===');
    const byReason = new Map<string, typeof coverage.unresolvedImports>();
    for (const u of coverage.unresolvedImports) {
      if (!byReason.has(u.reason)) byReason.set(u.reason, []);
      byReason.get(u.reason)!.push(u);
    }
    for (const [reason, items] of byReason) {
      console.log(`  ${reason}: ${items.length}`);
      for (const item of items.slice(0, 3)) {
        console.log(`    ${item.sourcePath} → ${item.importSpecifier}`);
      }
      if (items.length > 3) {
        console.log(`    ... and ${items.length - 3} more`);
      }
    }
  }

  // Top files by fan-in
  const fanEntries = Object.entries(fanMetrics)
    .filter(([, m]) => m.fanIn > 0)
    .sort((a, b) => b[1].fanIn - a[1].fanIn);

  if (fanEntries.length > 0) {
    console.log('');
    console.log('=== Top files by fan-in ===');
    for (const [filePath, metrics] of fanEntries.slice(0, 10)) {
      console.log(`  ${metrics.fanIn} ← ${filePath}`);
    }
  }

  // Top files by fan-out
  const fanOutEntries = Object.entries(fanMetrics)
    .filter(([, m]) => m.fanOut > 0)
    .sort((a, b) => b[1].fanOut - a[1].fanOut);

  if (fanOutEntries.length > 0) {
    console.log('');
    console.log('=== Top files by fan-out ===');
    for (const [filePath, metrics] of fanOutEntries.slice(0, 10)) {
      console.log(`  ${filePath} → ${metrics.fanOut}`);
    }
  }
}

main();
