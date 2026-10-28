/**
 * Deterministic invented-path check.
 * Tests every path-shaped token in an explanation against the exact set of paths
 * the model was shown.
 *
 * This is pure set membership — not a model grading a model.
 */

export interface InventedPathCheckResult {
  /** True if zero invented paths were found. */
  passed: boolean;
  /**
   * Score from 0.0 to 1.0.
   * 1.0 when all mentioned paths were in the shown set (or no paths mentioned).
   * Otherwise the ratio of valid paths to total paths mentioned.
   */
  score: number;
  /** Number of distinct path tokens checked. */
  totalTokensChecked: number;
  /** Paths mentioned that were in the shown set. */
  validPaths: string[];
  /** Paths mentioned that were NOT in the shown set (hallucinations). */
  inventedPaths: string[];
}

const COMMON_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "json",
  "css",
  "scss",
  "md",
  "sql",
  "html",
  "mjs",
  "cjs",
  "yml",
  "yaml",
  "env",
]);

/** Known non-path library/runtime names ending with an extension-like token. */
const EXCLUDED_TERMS = new Set([
  "node.js",
  "next.js",
  "react.js",
  "vue.js",
  "express.js",
  "gemini.js",
]);

/** Normalize path separators and remove leading ./ or / */
export function normalizeRepoPath(raw: string): string {
  return raw
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\.\//, "")
    .replace(/^\//, "");
}

/**
 * Extract all path-shaped tokens from prose text.
 * Finds:
 * 1. Backticked tokens matching a path format or extension.
 * 2. Unbackticked words with file extensions or forward slashes.
 */
export function extractPathTokens(text: string): string[] {
  const found = new Set<string>();

  // 1. Match backticked content: `...`
  const backtickRegex = /`([^`\n]+)`/g;
  let match: RegExpExecArray | null;
  while ((match = backtickRegex.exec(text)) !== null) {
    const candidate = cleanToken(match[1]);
    if (isPathShaped(candidate)) {
      found.add(candidate);
    }
  }

  // 2. Match unbackticked words: tokens with / or file extensions
  // Word boundaries with paths: e.g. path/to/file.ts or file.tsx
  const tokenRegex = /(?:^|[\s([{"'])((?:[a-zA-Z0-9_.-]+\/)+[a-zA-Z0-9_.-]+|[a-zA-Z0-9_.-]+\.[a-zA-Z0-9]+)(?:$|[\s)\]}",;:?!])/g;
  while ((match = tokenRegex.exec(text)) !== null) {
    const candidate = cleanToken(match[1]);
    if (isPathShaped(candidate)) {
      found.add(candidate);
    }
  }

  return Array.from(found);
}

function cleanToken(raw: string): string {
  return raw
    .trim()
    .replace(/^['"([{<`]+/, "")
    .replace(/['")\]}>`,;:?!.]+$/, "")
    .trim();
}

/** Determine whether a token has the shape of a repository path. */
function isPathShaped(token: string): boolean {
  if (!token || token.length < 2) return false;

  // Ignore URLs
  if (token.startsWith("http://") || token.startsWith("https://") || token.startsWith("git@")) {
    return false;
  }

  const lower = token.toLowerCase();
  if (EXCLUDED_TERMS.has(lower)) {
    return false;
  }

  // Standalone common files
  if (lower === "dockerfile" || lower === "makefile" || lower === "package.json") {
    return true;
  }

  // Contains a forward slash (e.g. lib/ai.action.ts, src/components/button)
  if (token.includes("/")) {
    // Avoid pure numbers or operators e.g. "1/2"
    return /[a-zA-Z]/.test(token);
  }

  // Check for common file extension
  const extMatch = token.match(/\.([a-zA-Z0-9]+)$/);
  if (extMatch) {
    const ext = extMatch[1].toLowerCase();
    // Exclude version numbers like 1.0 or 3.5
    if (/^\d+$/.test(ext)) return false;
    return COMMON_EXTENSIONS.has(ext);
  }

  return false;
}

/**
 * Test whether every path-shaped token in `explanation` belongs to `shownPaths`.
 * Deterministic set membership check.
 */
export function checkInventedPaths(
  explanation: string,
  shownPaths: string[]
): InventedPathCheckResult {
  const normalizedShown = new Set(shownPaths.map(normalizeRepoPath));

  // Build a lookup for unique basenames among shown paths (e.g. "button.tsx" for "components/button.tsx")
  const basenameToShown = new Map<string, string>();
  for (const p of normalizedShown) {
    const parts = p.split("/");
    const base = parts[parts.length - 1];
    if (base) {
      basenameToShown.set(base, p);
    }
  }

  const candidateTokens = extractPathTokens(explanation);

  const validPaths: string[] = [];
  const inventedPaths: string[] = [];

  for (const rawToken of candidateTokens) {
    const norm = normalizeRepoPath(rawToken);

    // Exact full path match
    if (normalizedShown.has(norm)) {
      validPaths.push(rawToken);
      continue;
    }

    // Basename match (e.g. if model referenced "button.tsx" when shown "components/button.tsx")
    const tokenParts = norm.split("/");
    const tokenBase = tokenParts[tokenParts.length - 1];
    if (tokenParts.length === 1 && basenameToShown.has(tokenBase)) {
      validPaths.push(rawToken);
      continue;
    }

    // Otherwise, this token was invented
    inventedPaths.push(rawToken);
  }

  const total = candidateTokens.length;
  const passed = inventedPaths.length === 0;
  const score = total === 0 ? 1.0 : Number((validPaths.length / total).toFixed(4));

  return {
    passed,
    score: passed ? 1.0 : score,
    totalTokensChecked: total,
    validPaths,
    inventedPaths,
  };
}
