import type { ParsedFile, ParseResult } from "../parser/types";
import type { FolderNode } from "./folding";

export type FileKind =
  | "hook"
  | "test"
  | "story"
  | "component"
  | "page"
  | "route"
  | "layout"
  | "entry"
  | "types"
  | "config"
  | "utility"
  | "adapter"
  | "unidentified";

export interface FileClassification {
  kind: FileKind;
  label: string;
  identified: boolean;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

/**
 * Classifies a file based on file conventions, naming patterns, and location.
 * Pure function: path and language in, classification out.
 */
export function classifyFile(file: ParsedFile): FileClassification {
  const p = file.path.replace(/\\/g, "/").toLowerCase();
  const fileName = (file.path.split(/[/\\]/).pop() || file.path).toLowerCase();

  // 1. Tests
  if (
    fileName.endsWith(".test.ts") ||
    fileName.endsWith(".test.tsx") ||
    fileName.endsWith(".test.js") ||
    fileName.endsWith(".test.jsx") ||
    fileName.endsWith(".spec.ts") ||
    fileName.endsWith(".spec.tsx") ||
    fileName.endsWith(".spec.js") ||
    fileName.endsWith(".spec.jsx") ||
    p.includes("/__tests__/") ||
    p.startsWith("__tests__/")
  ) {
    return {
      kind: "test",
      label: "Test",
      identified: true,
      colorClass: "bg-rose-400",
      badgeBg: "bg-rose-500/10 dark:bg-rose-500/15",
      badgeText: "text-rose-600 dark:text-rose-400",
      borderClass: "border-rose-500/20 dark:border-rose-500/30",
    };
  }

  // 2. Stories
  if (
    fileName.endsWith(".story.tsx") ||
    fileName.endsWith(".stories.tsx") ||
    fileName.endsWith(".story.ts") ||
    fileName.endsWith(".stories.ts") ||
    fileName.endsWith(".story.jsx") ||
    fileName.endsWith(".stories.jsx")
  ) {
    return {
      kind: "story",
      label: "Story",
      identified: true,
      colorClass: "bg-purple-400",
      badgeBg: "bg-purple-500/10 dark:bg-purple-500/15",
      badgeText: "text-purple-600 dark:text-purple-400",
      borderClass: "border-purple-500/20 dark:border-purple-500/30",
    };
  }

  // 3. React Hooks
  if (fileName.startsWith("use-") || /^use[a-z0-9]/.test(fileName)) {
    return {
      kind: "hook",
      label: "Hook",
      identified: true,
      colorClass: "bg-amber-400",
      badgeBg: "bg-amber-500/10 dark:bg-amber-500/15",
      badgeText: "text-amber-600 dark:text-amber-400",
      borderClass: "border-amber-500/20 dark:border-amber-500/30",
    };
  }

  // 4. Entry / Barrel files
  if (
    fileName === "index.ts" ||
    fileName === "index.tsx" ||
    fileName === "index.js" ||
    fileName === "index.jsx" ||
    fileName === "main.ts" ||
    fileName === "main.tsx" ||
    fileName === "main.js" ||
    fileName === "mod.ts"
  ) {
    return {
      kind: "entry",
      label: "Entry / Barrel",
      identified: true,
      colorClass: "bg-emerald-400",
      badgeBg: "bg-emerald-500/10 dark:bg-emerald-500/15",
      badgeText: "text-emerald-600 dark:text-emerald-400",
      borderClass: "border-emerald-500/20 dark:border-emerald-500/30",
    };
  }

  // 5. Next.js / Web Routes & Layouts
  if (fileName === "page.tsx" || fileName === "page.jsx" || fileName === "page.js") {
    return {
      kind: "page",
      label: "Page",
      identified: true,
      colorClass: "bg-sky-400",
      badgeBg: "bg-sky-500/10 dark:bg-sky-500/15",
      badgeText: "text-sky-600 dark:text-sky-400",
      borderClass: "border-sky-500/20 dark:border-sky-500/30",
    };
  }
  if (fileName === "route.ts" || fileName === "route.js") {
    return {
      kind: "route",
      label: "API Route",
      identified: true,
      colorClass: "bg-cyan-400",
      badgeBg: "bg-cyan-500/10 dark:bg-cyan-500/15",
      badgeText: "text-cyan-600 dark:text-cyan-400",
      borderClass: "border-cyan-500/20 dark:border-cyan-500/30",
    };
  }
  if (
    fileName === "layout.tsx" ||
    fileName === "layout.jsx" ||
    fileName === "template.tsx" ||
    fileName === "loading.tsx" ||
    fileName === "error.tsx" ||
    fileName === "not-found.tsx"
  ) {
    return {
      kind: "layout",
      label: "Layout",
      identified: true,
      colorClass: "bg-indigo-400",
      badgeBg: "bg-indigo-500/10 dark:bg-indigo-500/15",
      badgeText: "text-indigo-600 dark:text-indigo-400",
      borderClass: "border-indigo-500/20 dark:border-indigo-500/30",
    };
  }

  // 6. UI Components
  if (
    file.language === "typescriptreact" ||
    file.language === "javascriptreact" ||
    p.includes("/components/") ||
    p.startsWith("components/") ||
    p.includes("/ui/") ||
    p.startsWith("ui/") ||
    fileName.endsWith(".tsx") ||
    fileName.endsWith(".jsx")
  ) {
    return {
      kind: "component",
      label: "Component",
      identified: true,
      colorClass: "bg-teal-400",
      badgeBg: "bg-teal-500/10 dark:bg-teal-500/15",
      badgeText: "text-teal-600 dark:text-teal-400",
      borderClass: "border-teal-500/20 dark:border-teal-500/30",
    };
  }

  // 7. Types
  if (
    fileName.endsWith(".d.ts") ||
    fileName === "types.ts" ||
    fileName.endsWith(".types.ts") ||
    p.includes("/types/") ||
    p.startsWith("types/")
  ) {
    return {
      kind: "types",
      label: "Type Definitions",
      identified: true,
      colorClass: "bg-blue-400",
      badgeBg: "bg-blue-500/10 dark:bg-blue-500/15",
      badgeText: "text-blue-600 dark:text-blue-400",
      borderClass: "border-blue-500/20 dark:border-blue-500/30",
    };
  }

  // 8. Config
  if (
    fileName.includes(".config.") ||
    fileName.startsWith("tsconfig") ||
    fileName === "middleware.ts" ||
    fileName === "proxy.ts" ||
    fileName.startsWith(".env")
  ) {
    return {
      kind: "config",
      label: "Configuration",
      identified: true,
      colorClass: "bg-yellow-400",
      badgeBg: "bg-yellow-500/10 dark:bg-yellow-500/15",
      badgeText: "text-yellow-600 dark:text-yellow-400",
      borderClass: "border-yellow-500/20 dark:border-yellow-500/30",
    };
  }

  // 9. Utilities & Library code
  if (
    p.includes("/utils/") ||
    p.startsWith("utils/") ||
    p.includes("/util/") ||
    p.startsWith("util/") ||
    p.includes("/lib/") ||
    p.startsWith("lib/") ||
    p.includes("/helpers/") ||
    p.startsWith("helpers/") ||
    fileName.endsWith(".util.ts") ||
    fileName.endsWith(".utils.ts")
  ) {
    return {
      kind: "utility",
      label: "Utility",
      identified: true,
      colorClass: "bg-slate-400",
      badgeBg: "bg-slate-500/10 dark:bg-slate-500/15",
      badgeText: "text-slate-600 dark:text-slate-400",
      borderClass: "border-slate-500/20 dark:border-slate-500/30",
    };
  }

  // 10. Adapters / Parser internals
  if (
    p.includes("/adapters/") ||
    p.startsWith("adapters/") ||
    p.includes("/parser/") ||
    p.startsWith("parser/")
  ) {
    return {
      kind: "adapter",
      label: "Parser / Adapter",
      identified: true,
      colorClass: "bg-fuchsia-400",
      badgeBg: "bg-fuchsia-500/10 dark:bg-fuchsia-500/15",
      badgeText: "text-fuchsia-600 dark:text-fuchsia-400",
      borderClass: "border-fuchsia-500/20 dark:border-fuchsia-500/30",
    };
  }

  // 11. Unidentified module
  return {
    kind: "unidentified",
    label: "Module",
    identified: false,
    colorClass: "bg-zinc-500",
    badgeBg: "bg-zinc-500/10 dark:bg-zinc-500/15",
    badgeText: "text-zinc-600 dark:text-zinc-400",
    borderClass: "border-zinc-500/20 dark:border-zinc-500/30",
  };
}

/**
 * Extracts a human-friendly repository name from repoRoot.
 */
export function getRepoName(repoRoot: string): string {
  if (!repoRoot) return "Repository";
  const normalized = repoRoot.replace(/\\/g, "/");
  const scopedMatch = normalized.match(/(@[a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)/);
  if (scopedMatch) {
    return scopedMatch[1];
  }
  const parts = normalized.split("/").filter(Boolean);
  if (parts.length > 1 && (parts[parts.length - 1] === "src" || parts[parts.length - 1] === "dist")) {
    return parts[parts.length - 2];
  }
  return parts[parts.length - 1] || "Repository";
}

/**
 * Detects framework from file tree.
 */
export function detectFramework(files: ParsedFile[]): string {
  let hasNext = false;
  let hasRemix = false;
  let hasReact = false;
  let hasVue = false;
  let hasSvelte = false;

  for (const f of files) {
    const p = f.path.replace(/\\/g, "/").toLowerCase();
    if (p.startsWith("app/") || p.startsWith("pages/") || p.includes("next.config")) {
      hasNext = true;
    }
    if (p.includes("remix.config") || p.startsWith("app/routes/")) {
      hasRemix = true;
    }
    if (
      f.language === "typescriptreact" ||
      f.language === "javascriptreact" ||
      p.endsWith(".tsx") ||
      p.endsWith(".jsx")
    ) {
      hasReact = true;
    }
    if (p.endsWith(".vue")) {
      hasVue = true;
    }
    if (p.endsWith(".svelte")) {
      hasSvelte = true;
    }
  }

  if (hasNext) return "Next.js";
  if (hasRemix) return "Remix";
  if (hasVue) return "Vue";
  if (hasSvelte) return "Svelte";
  if (hasReact) return "React";
  return "TypeScript";
}

/**
 * Detects routes in a file tree.
 */
export function detectRoutes(files: ParsedFile[]): ParsedFile[] {
  return files.filter((f) => {
    const p = f.path.replace(/\\/g, "/").toLowerCase();
    const name = (f.path.split(/[/\\]/).pop() || "").toLowerCase();
    if (
      p.startsWith("app/") &&
      (name === "page.tsx" ||
        name === "page.jsx" ||
        name === "page.js" ||
        name === "route.ts" ||
        name === "route.js")
    ) {
      return true;
    }
    if (
      p.startsWith("pages/") &&
      (name.endsWith(".tsx") || name.endsWith(".jsx") || name.endsWith(".ts") || name.endsWith(".js"))
    ) {
      if (name.startsWith("_")) {
        return false;
      }
      return true;
    }
    return false;
  });
}

export interface RankedItem {
  file: ParsedFile;
  classification: FileClassification;
  fanIn: number;
  fanOut: number;
}

export interface RepoSummary {
  name: string;
  framework: string;
  filesCount: number;
  importsCount: number;
  routesCount: number;
  unidentifiedCount: number;
  mostDepended: RankedItem[];
  readingStarts: RankedItem[];
}

/**
 * Computes repository summary metrics and ranked lists.
 */
export function computeRepoSummary(data: ParseResult): RepoSummary {
  const name = getRepoName(data.repoRoot);
  const framework = detectFramework(data.files);
  const routes = detectRoutes(data.files);
  const filesCount = data.files.length;
  const importsCount = data.edges.length;
  const routesCount = routes.length;

  let unidentifiedCount = 0;
  const rankedItems: RankedItem[] = data.files.map((file) => {
    const classification = classifyFile(file);
    if (!classification.identified) {
      unidentifiedCount++;
    }
    const metrics = data.fanMetrics[file.path] || { fanIn: 0, fanOut: 0 };
    return {
      file,
      classification,
      fanIn: metrics.fanIn,
      fanOut: metrics.fanOut,
    };
  });

  // Ranked list 1: What repository leans on most (fanIn > 0, sorted descending)
  const mostDepended = rankedItems
    .filter((item) => item.fanIn > 0)
    .sort((a, b) => b.fanIn - a.fanIn || a.file.path.localeCompare(b.file.path));

  // Ranked list 2: Files nothing imports at all (fanIn === 0, where reading starts)
  const readingStarts = rankedItems
    .filter((item) => item.fanIn === 0)
    .sort((a, b) => b.fanOut - a.fanOut || a.file.path.localeCompare(b.file.path));

  return {
    name,
    framework,
    filesCount,
    importsCount,
    routesCount,
    unidentifiedCount,
    mostDepended,
    readingStarts,
  };
}

export interface FileNeighbor {
  file: ParsedFile;
  classification: FileClassification;
  edgeKind?: string;
  specifier?: string;
}

export interface FileDetails {
  file: ParsedFile;
  classification: FileClassification;
  fanIn: number;
  fanOut: number;
  dependencies: FileNeighbor[];
  dependents: FileNeighbor[];
}

/**
 * Extracts exact dependencies and dependents for a selected file.
 */
export function getFileDetails(filePath: string, data: ParseResult): FileDetails | null {
  const file = data.files.find((f) => f.path === filePath);
  if (!file) return null;

  const classification = classifyFile(file);

  // Outgoing dependencies: files this file imports (edges where sourcePath === filePath)
  const outgoingMap = new Map<string, { kind: string; specifier: string }>();
  data.edges.forEach((e) => {
    if (e.sourcePath === filePath) {
      if (!outgoingMap.has(e.targetPath)) {
        outgoingMap.set(e.targetPath, { kind: e.kind, specifier: e.importSpecifier });
      }
    }
  });

  const dependencies: FileNeighbor[] = Array.from(outgoingMap.entries())
    .map(([targetPath, info]) => {
      const targetFile =
        data.files.find((f) => f.path === targetPath) || {
          path: targetPath,
          folder: targetPath.includes("/") ? targetPath.slice(0, targetPath.lastIndexOf("/")) : "",
          language: "typescript" as const,
          lineCount: 0,
          contentHash: "",
        };
      return {
        file: targetFile,
        classification: classifyFile(targetFile),
        edgeKind: info.kind,
        specifier: info.specifier,
      };
    })
    .sort((a, b) => a.file.path.localeCompare(b.file.path));

  // Incoming dependents: files that import this file (edges where targetPath === filePath)
  const incomingMap = new Map<string, { kind: string; specifier: string }>();
  data.edges.forEach((e) => {
    if (e.targetPath === filePath) {
      if (!incomingMap.has(e.sourcePath)) {
        incomingMap.set(e.sourcePath, { kind: e.kind, specifier: e.importSpecifier });
      }
    }
  });

  const dependents: FileNeighbor[] = Array.from(incomingMap.entries())
    .map(([sourcePath, info]) => {
      const sourceFile =
        data.files.find((f) => f.path === sourcePath) || {
          path: sourcePath,
          folder: sourcePath.includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "",
          language: "typescript" as const,
          lineCount: 0,
          contentHash: "",
        };
      return {
        file: sourceFile,
        classification: classifyFile(sourceFile),
        edgeKind: info.kind,
        specifier: info.specifier,
      };
    })
    .sort((a, b) => a.file.path.localeCompare(b.file.path));

  return {
    file,
    classification,
    fanIn: dependents.length,
    fanOut: dependencies.length,
    dependencies,
    dependents,
  };
}

export interface FolderFileItem {
  file: ParsedFile;
  classification: FileClassification;
  fanIn: number;
  fanOut: number;
}

export interface KindCount {
  kind: FileKind;
  label: string;
  count: number;
  colorClass: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
}

export interface FolderDetails {
  folderId: string;
  label: string;
  files: FolderFileItem[];
  kindCounts: KindCount[];
  fanIn: number;
  fanOut: number;
  totalLines: number;
}

/**
 * Extracts folder composition and metrics for a selected folder node.
 */
export function getFolderDetails(
  folderId: string,
  folderNode: FolderNode,
  data: ParseResult
): FolderDetails {
  const files: FolderFileItem[] = folderNode.files.map((f) => {
    const classification = classifyFile(f);
    const metrics = data.fanMetrics[f.path] || { fanIn: f.fanIn, fanOut: f.fanOut };
    return {
      file: f,
      classification,
      fanIn: metrics.fanIn,
      fanOut: metrics.fanOut,
    };
  });

  const kindMap = new Map<FileKind, { count: number; classification: FileClassification }>();
  let totalLines = 0;

  files.forEach(({ file, classification }) => {
    totalLines += file.lineCount;
    const existing = kindMap.get(classification.kind);
    if (existing) {
      existing.count++;
    } else {
      kindMap.set(classification.kind, { count: 1, classification });
    }
  });

  const kindCounts: KindCount[] = Array.from(kindMap.entries())
    .map(([kind, { count, classification }]) => ({
      kind,
      label: classification.label,
      count,
      colorClass: classification.colorClass,
      badgeBg: classification.badgeBg,
      badgeText: classification.badgeText,
      borderClass: classification.borderClass,
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));

  return {
    folderId,
    label: folderNode.label,
    files,
    kindCounts,
    fanIn: folderNode.fanIn,
    fanOut: folderNode.fanOut,
    totalLines,
  };
}
