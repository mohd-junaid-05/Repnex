/**
 * Parser output types.
 * This is the contract: every phase after this reads these shapes.
 * No web framework, React or database imports allowed here.
 */

/** A file discovered during the repository walk. */
export interface ParsedFile {
  /** Path relative to the repository root, always forward-slash separated. */
  path: string;
  /** The folder this file sits in, relative to root. Empty string for root files. */
  folder: string;
  /** Detected language: 'typescript' | 'javascript' | 'typescriptreact' | 'javascriptreact'. */
  language: FileLanguage;
  /** Total line count. */
  lineCount: number;
  /** SHA-256 hex digest of the file contents. */
  contentHash: string;
  /** Names exported by the module (CommonJS module.exports/exports or ESM exports). */
  exports?: string[];
  /** Major functions or declarations extracted from the file. */
  functions?: string[];
}

export type FileLanguage =
  | 'typescript'
  | 'javascript'
  | 'typescriptreact'
  | 'javascriptreact';

/** The kind of import relationship between two files. */
export type EdgeKind = 'import' | 're-export' | 'dynamic-import' | 'require';

/** A directed edge from one file to another, representing a resolved import. */
export interface ParsedEdge {
  /** The file that contains the import statement. */
  sourcePath: string;
  /** The file that the import resolves to. */
  targetPath: string;
  /** The raw import specifier as written in the source. */
  importSpecifier: string;
  /** What kind of import this is. */
  kind: EdgeKind;
}

/** Why an import could not be resolved. */
export type UnresolvedReason =
  | 'file-not-found'
  | 'outside-repository'
  | 'node-module'
  | 'non-literal-dynamic-import'
  | 'unsupported-syntax'
  | 'path-alias-unresolved';

/** An import the parser saw but could not resolve to a file inside the repository. */
export interface UnresolvedImport {
  /** The file that contains the import. */
  sourcePath: string;
  /** The raw import specifier. */
  importSpecifier: string;
  /** Why it could not be resolved. */
  reason: UnresolvedReason;
  /** What kind of import syntax was used. */
  kind: EdgeKind;
}

/** Per-file fan-in and fan-out counts. */
export interface FileFanMetrics {
  /** How many distinct files import this one. */
  fanIn: number;
  /** How many distinct files this one imports. */
  fanOut: number;
}

/** Summary of what the parser covered and what it missed. */
export interface CoverageReport {
  /** Total files found in the walk. */
  totalFilesFound: number;
  /** Files that were successfully parsed for imports. */
  filesParsed: number;
  /** Files that were found but deliberately skipped. */
  filesSkipped: number;
  /** Reasons for each skipped file. */
  skippedFiles: SkippedFile[];
  /** Total import statements encountered. */
  totalImports: number;
  /** Imports that resolved to a file inside the repo. */
  resolvedImports: number;
  /** Imports pointing to external packages (node_modules). */
  externalImports: number;
  /** Imports that failed to resolve, with examples. */
  unresolvedImports: UnresolvedImport[];
}

/** A file that was found but not parsed, with the reason. */
export interface SkippedFile {
  path: string;
  reason: string;
}

/** A route extracted from framework conventions or decorators. */
export interface ExtractedRoute {
  /** Relative path of the file defining the route. */
  filePath: string;
  /** Full URL path pattern, e.g. "/users/:id". */
  routePath: string;
  /** Recovered HTTP methods, e.g. ["GET"] or ["POST"]. */
  httpMethods: string[];
}

/** Complete output of a parse run. This is the shape written to disk. */
export interface ParseResult {
  /** Absolute path to the repository root that was parsed. */
  repoRoot: string;
  /** When the parse started (ISO 8601). */
  parsedAt: string;
  /** Framework identifier (e.g. 'nestjs', 'react', 'generic'). */
  framework: string;
  /** All files discovered and parsed. */
  files: ParsedFile[];
  /** All resolved import edges, deduplicated. */
  edges: ParsedEdge[];
  /** Fan-in/fan-out keyed by file path. */
  fanMetrics: Record<string, FileFanMetrics>;
  /** Coverage report. */
  coverage: CoverageReport;
  /** Distinct folders found. */
  folders: string[];
  /** Routes extracted by framework adapter. */
  routes: ExtractedRoute[];
  /** File roles keyed by file path. */
  fileRoles: Record<string, string>;
}

/**
 * Framework adapter interface.
 * Adapters decide which files to include and how to interpret them.
 * The parser itself has no framework knowledge.
 */
export interface FrameworkAdapter {
  /** Framework identifier. */
  id: string;
  /** Human-readable name of the framework. */
  name: string;
  /** Checks if the repository matches this framework. */
  detect(repoRoot: string, files: ParsedFile[]): boolean;
  /**
   * Given a file path relative to root, decide whether this file should be
   * included in the parse. Return true to include, false to exclude.
   * Exclusion reason is provided by excludeReason.
   */
  shouldInclude(relativePath: string): boolean;
  /**
   * If shouldInclude returns false, this returns the reason.
   * Only called when shouldInclude returned false.
   */
  excludeReason(relativePath: string): string;
  /** Assign concrete framework roles to parsed files. */
  assignRoles(repoRoot: string, files: ParsedFile[]): Record<string, string>;
  /** Extract exact routes from parsed files. */
  extractRoutes(repoRoot: string, files: ParsedFile[]): ExtractedRoute[];
}
