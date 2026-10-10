/**
 * Repository walker.
 * Discovers TS/JS files, counts lines, hashes contents, determines folders.
 * No web framework, no UI, no database — just the filesystem.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import type { ParsedFile, FileLanguage, SkippedFile, FrameworkAdapter } from './types';

/** Extensions we recognise as parseable source files. */
const LANGUAGE_MAP: Record<string, FileLanguage> = {
  '.ts': 'typescript',
  '.tsx': 'typescriptreact',
  '.js': 'javascript',
  '.jsx': 'javascriptreact',
  '.mts': 'typescript',
  '.mjs': 'javascript',
  '.cts': 'typescript',
  '.cjs': 'javascript',
};

/** Directories we always skip — build output, deps, dotfiles. */
const SKIP_DIRS = new Set([
  'node_modules',
  '.git',
  '.next',
  'dist',
  'build',
  'out',
  '.turbo',
  '.vercel',
  'coverage',
  '__pycache__',
]);

/** File patterns we skip by basename. */
function shouldSkipByName(basename: string): string | null {
  if (basename.startsWith('.')) return 'dotfile';
  // Declaration files — they're generated, not authored
  if (basename.endsWith('.d.ts') || basename.endsWith('.d.mts') || basename.endsWith('.d.cts')) {
    return 'declaration-file';
  }
  return null;
}

export interface WalkResult {
  files: ParsedFile[];
  skippedFiles: SkippedFile[];
}

/**
 * Walk a directory recursively, collecting every TS/JS source file.
 * Uses structural file selection: keeps whole directories rather than
 * cherry-picking files. This avoids the bug where dropping a leaf file
 * produces edges pointing at nodes that don't exist.
 */
export function walkRepository(
  repoRoot: string,
  adapter: FrameworkAdapter,
): WalkResult {
  const files: ParsedFile[] = [];
  const skippedFiles: SkippedFile[] = [];
  const absoluteRoot = path.resolve(repoRoot);

  /** Recurse into a directory, collecting source metadata and recording skipped files. */
  function walk(dir: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      // Permission denied or similar — skip the directory, report it
      const rel = toForwardSlash(path.relative(absoluteRoot, dir));
      skippedFiles.push({ path: rel, reason: 'unreadable-directory' });
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const relativePath = toForwardSlash(path.relative(absoluteRoot, fullPath));
      const ext = path.extname(entry.name);
      const language = LANGUAGE_MAP[ext];

      // Not a TS/JS file — skip silently (these aren't in scope at all)
      if (!language) continue;

      // Check basename rules
      const skipReason = shouldSkipByName(entry.name);
      if (skipReason) {
        skippedFiles.push({ path: relativePath, reason: skipReason });
        continue;
      }

      // Ask the adapter
      if (!adapter.shouldInclude(relativePath)) {
        skippedFiles.push({
          path: relativePath,
          reason: adapter.excludeReason(relativePath),
        });
        continue;
      }

      const content = fs.readFileSync(fullPath, 'utf-8');
      const lineCount = content.split('\n').length;
      const contentHash = crypto
        .createHash('sha256')
        .update(content)
        .digest('hex');
      const folder = toForwardSlash(path.dirname(relativePath));

      files.push({
        path: relativePath,
        folder: folder === '.' ? '' : folder,
        language,
        lineCount,
        contentHash,
      });
    }
  }

  walk(absoluteRoot);
  return { files, skippedFiles };
}

/** Normalise path separators to forward slashes. */
function toForwardSlash(p: string): string {
  return p.replace(/\\/g, '/');
}
