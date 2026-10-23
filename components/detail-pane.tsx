"use client";

import React, { useState } from "react";
import type { ParseResult } from "@/parser/types";
import type { FolderNode } from "@/lib/folding";
import {
  computeRepoSummary,
  getFileDetails,
  getFolderDetails,
  classifyFile,
  RepoSummary,
  FileDetails,
  FolderDetails,
} from "@/lib/classification";
import {
  computeTransitiveWalk,
  computeInsights,
  InsightsSummary,
  TransitiveStep,
} from "@/lib/graph-math";
import { ExplanationPanel } from "@/components/explanation-panel";

interface DetailPaneProps {
  data: ParseResult;
  nodes: FolderNode[];
  selectedFile: string | null;
  selectedNodeId: string | null;
  hoveredFile: string | null;
  hoveredNodeId: string | null;
  activeTab: "structure" | "explanation";
  onTabChange: (tab: "structure" | "explanation") => void;
  onSelectFile: (path: string) => void;
  onSelectNode: (nodeId: string) => void;
  onHoverFile: (path: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  onDeselect: () => void;
  onReanalyse?: () => void;
  isReanalysing?: boolean;
  explanation?: { content: string; stale: boolean; cacheHit: boolean } | null;
  isLoadingExplanation?: boolean;
  explanationError?: string;
  onExplain?: () => void;
  isAssigningRole?: boolean;
  onAssignRole?: () => void;
  tracingConfigured?: boolean;
}

/** Extract file extension including dot, e.g. '.js'. */
function getFileExt(filePath: string): string {
  const lastDot = filePath.lastIndexOf(".");
  if (lastDot === -1) return "";
  return filePath.slice(lastDot);
}

/** Get color swatch matching file language and extension. */
function getKindSwatch(filePath: string, language?: string): string {
  const ext = getFileExt(filePath).toLowerCase();
  if (ext === ".js" || ext === ".cjs" || ext === ".mjs") return "bg-rose-500";
  if (ext === ".ts" || ext === ".cts" || ext === ".mts") return "bg-sky-500";
  if (ext === ".tsx" || ext === ".jsx") return "bg-teal-400";
  if (ext === ".json") return "bg-amber-400";
  if (language === "javascript" || language === "javascriptreact") return "bg-rose-500";
  if (language === "typescript" || language === "typescriptreact") return "bg-sky-500";
  return "bg-zinc-400";
}

/** Split a relative path into folder prefix and filename. */
function splitPath(filePath: string): { dir: string; filename: string } {
  const lastSlash = filePath.lastIndexOf("/");
  if (lastSlash === -1) {
    return { dir: "", filename: filePath };
  }
  return {
    dir: filePath.slice(0, lastSlash + 1),
    filename: filePath.slice(lastSlash + 1),
  };
}

/** Show repository, selected file, or selected folder details with navigation callbacks. */
export function DetailPane({
  data,
  nodes,
  selectedFile,
  selectedNodeId,
  hoveredFile,
  activeTab,
  onTabChange,
  onSelectFile,
  onHoverFile,
  onDeselect,
  onReanalyse,
  isReanalysing = false,
  explanation = null,
  isLoadingExplanation = false,
  explanationError = "",
  onExplain = () => {},
  isAssigningRole = false,
  onAssignRole = () => {},
  tracingConfigured = true,
}: DetailPaneProps) {
  // State for transitive walk view and collapsible insights
  const [activeWalk, setActiveWalk] = useState<"direct" | "blast-radius" | "dependency-chain">("direct");
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

  const fileSet = React.useMemo(() => new Set(data.files.map((f) => f.path)), [data.files]);

  // Pre-calculate summary, selected details, and insights
  const repoSummary: RepoSummary = React.useMemo(() => computeRepoSummary(data), [data]);
  const insights: InsightsSummary = React.useMemo(() => computeInsights(data), [data]);

  const fileDetails: FileDetails | null = React.useMemo(() => {
    if (!selectedFile) return null;
    return getFileDetails(selectedFile, data);
  }, [selectedFile, data]);

  const blastRadius: TransitiveStep[] = React.useMemo(() => {
    if (!selectedFile) return [];
    return computeTransitiveWalk(selectedFile, data.edges, "blast-radius", 2);
  }, [selectedFile, data.edges]);

  const dependencyChain: TransitiveStep[] = React.useMemo(() => {
    if (!selectedFile) return [];
    return computeTransitiveWalk(selectedFile, data.edges, "dependency-chain", 2);
  }, [selectedFile, data.edges]);

  const folderDetails: FolderDetails | null = React.useMemo(() => {
    if (selectedFile || !selectedNodeId) return null;
    const node = nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;
    return getFolderDetails(selectedNodeId, node, data);
  }, [selectedFile, selectedNodeId, nodes, data]);

  return (
    <aside className="w-80 border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d14] flex flex-col h-full overflow-hidden flex-shrink-0 text-xs select-none">
      {/* Target Identity Header */}
      <div className="px-3 pt-2.5 pb-2 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d14] flex-shrink-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
            {selectedFile ? "file" : selectedNodeId ? "folder" : "repository"}
          </span>
          <div className="flex items-center gap-1.5">
            {(selectedFile || selectedNodeId) && activeTab === "structure" && (
              <button
                type="button"
                onClick={() => {
                  onTabChange("explanation");
                  if (!explanation) {
                    onExplain();
                  }
                }}
                className="px-2 py-0.5 text-[10px] font-mono font-medium text-indigo-700 dark:text-indigo-300 hover:text-indigo-900 dark:hover:text-indigo-100 bg-indigo-50 dark:bg-indigo-950/40 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 border border-indigo-200 dark:border-indigo-800 rounded cursor-pointer transition-colors flex items-center gap-1"
                title="Explain this target in context of its real neighbours"
              >
                Explain
              </button>
            )}
            {onReanalyse && (
              <button
                type="button"
                onClick={onReanalyse}
                disabled={isReanalysing}
                className="px-2 py-0.5 text-[10px] font-mono font-medium text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded cursor-pointer transition-colors disabled:opacity-50 flex items-center gap-1"
                title="Re-parse repository with latest parser & adapters"
              >
                <span className={isReanalysing ? "animate-spin inline-block" : ""}>↻</span>
                <span>{isReanalysing ? "Re-parsing..." : "Re-parse"}</span>
              </button>
            )}
            {(selectedFile || selectedNodeId) && (
              <button
                type="button"
                onClick={() => {
                  setActiveWalk("direct");
                  onDeselect();
                }}
                className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-mono cursor-pointer border border-zinc-200 dark:border-zinc-700"
                title="Return to repository summary"
              >
                Deselect
              </button>
            )}
          </div>
        </div>
        <div className="font-mono text-xs truncate">
          {selectedFile ? (
            (() => {
              const { dir, filename } = splitPath(selectedFile);
              return (
                <>
                  <span className="text-zinc-400 dark:text-zinc-500">{dir}</span>
                  <span className="font-bold text-zinc-900 dark:text-zinc-100">{filename}</span>
                </>
              );
            })()
          ) : folderDetails ? (
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {folderDetails.label}
            </span>
          ) : (
            <span className="font-bold text-zinc-900 dark:text-zinc-100">
              {repoSummary.name}
            </span>
          )}
        </div>
      </div>

      {/* Tab Navigation Header */}
      <div className="flex items-center px-3 pt-2 pb-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#10121d] flex-shrink-0">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => onTabChange("structure")}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "structure"
                ? "border-indigo-600 dark:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Structure
          </button>
          <button
            type="button"
            onClick={() => onTabChange("explanation")}
            className={`pb-2 text-xs font-medium border-b-2 transition-colors cursor-pointer ${
              activeTab === "explanation"
                ? "border-indigo-600 dark:border-indigo-500 text-zinc-900 dark:text-zinc-100 font-semibold"
                : "border-transparent text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200"
            }`}
          >
            Explanation
          </button>
        </div>
      </div>

      {/* Pane Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4 text-zinc-800 dark:text-zinc-200">
        {activeTab === "explanation" ? (
          <ExplanationPanel
            targetKind={selectedFile ? "file" : folderDetails ? "folder" : "repo"}
            targetLabel={
              selectedFile
                ? selectedFile
                : folderDetails
                ? folderDetails.folderId || folderDetails.label
                : repoSummary.name
            }
            explanation={explanation}
            isLoading={isLoadingExplanation}
            errorText={explanationError}
            fileSet={fileSet}
            onSelectFile={onSelectFile}
            onExplain={onExplain}
            showRoleAssign={Boolean(selectedFile && fileDetails && !fileDetails.classification.identified)}
            currentRoleLabel={fileDetails?.classification.label}
            assigningRole={isAssigningRole}
            onAssignRole={onAssignRole}
            onReanalyse={onReanalyse}
            isReanalysing={Boolean(isReanalysing)}
            tracingConfigured={tracingConfigured}
          />
        ) : selectedFile && fileDetails ? (
          /* ============================================================ */
          /* STRUCTURE TAB: SELECTED FILE VIEW                            */
          /* ============================================================ */
          <div className="flex flex-col gap-3">
            {/* Metadata Properties Grid */}
            <div className="flex flex-col gap-2 py-1 border-b border-zinc-200 dark:border-zinc-800/80 text-xs">
              {/* Kind */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Kind</span>
                <div className="flex items-center gap-1.5 font-mono text-zinc-800 dark:text-zinc-200">
                  <span
                    className={`w-2.5 h-2.5 rounded-[2px] ${getKindSwatch(
                      fileDetails.file.path,
                      fileDetails.file.language
                    )} shrink-0`}
                  />
                  <span>
                    {getFileExt(fileDetails.file.path) || fileDetails.file.language}
                  </span>
                </div>
              </div>

              {/* Role */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Role</span>
                <span className="text-zinc-800 dark:text-zinc-200 font-sans font-medium">
                  {fileDetails.classification.label}
                </span>
              </div>

              {/* Folder */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Folder</span>
                <span
                  className="font-mono text-zinc-700 dark:text-zinc-300 truncate"
                  title={fileDetails.file.folder || "."}
                >
                  {fileDetails.file.folder || "."}
                </span>
              </div>

              {/* Length */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Length</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {fileDetails.file.lineCount > 0
                    ? `${fileDetails.file.lineCount} lines`
                    : "—"}
                </span>
              </div>

              {/* Depends on */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Depends on</span>
                <div className="font-mono">
                  <span className="text-amber-500 dark:text-amber-400 font-semibold">
                    {fileDetails.fanOut}
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {fileDetails.fanOut === 1 ? "file" : "files"}
                  </span>
                </div>
              </div>

              {/* Depended on by */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Depended on by</span>
                <div className="font-mono">
                  <span className="text-emerald-500 dark:text-emerald-400 font-semibold">
                    {fileDetails.fanIn}
                  </span>{" "}
                  <span className="text-zinc-600 dark:text-zinc-400">
                    {fileDetails.fanIn === 1 ? "file" : "files"}
                  </span>
                </div>
              </div>

              {/* Reached by */}
              <div className="grid grid-cols-[100px_1fr] items-center">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Reached by</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {fileDetails.reachedBy}
                </span>
              </div>

              {/* Exports */}
              <div className="grid grid-cols-[100px_1fr] items-start">
                <span className="text-zinc-400 dark:text-zinc-500 font-sans">Exports</span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
                  {fileDetails.file.exports && fileDetails.file.exports.length > 0
                    ? fileDetails.file.exports.join(", ")
                    : "none"}
                </span>
              </div>

              {/* Functions / Declarations */}
              {fileDetails.file.functions && fileDetails.file.functions.length > 0 && (
                <div className="grid grid-cols-[100px_1fr] items-start pt-0.5">
                  <span className="text-zinc-400 dark:text-zinc-500 font-sans">Functions</span>
                  <div className="flex flex-wrap gap-1 max-h-[80px] overflow-y-auto custom-scrollbar">
                    {fileDetails.file.functions.map((fn) => (
                      <span
                        key={fn}
                        className="px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[10px] font-mono text-zinc-800 dark:text-zinc-200 border border-zinc-200 dark:border-zinc-700"
                      >
                        {fn}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Route Endpoint */}
              {fileDetails.routes && fileDetails.routes.length > 0 && (
                <div className="flex flex-col gap-1 p-2 rounded bg-zinc-100/70 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono mt-1">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
                    Route Endpoint ({fileDetails.routes.length})
                  </span>
                  {fileDetails.routes.map((r, i) => (
                    <div key={`file-route-${i}`} className="flex items-center gap-1.5 flex-wrap">
                      {r.httpMethods.map((m) => (
                        <span
                          key={m}
                          className="px-1 py-0.2 text-[9px] font-bold rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20"
                        >
                          {m}
                        </span>
                      ))}
                      <span className="font-semibold text-zinc-800 dark:text-zinc-200">
                        {r.routePath}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Blast radius / Dependency chain Action Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() =>
                  setActiveWalk(activeWalk === "blast-radius" ? "direct" : "blast-radius")
                }
                className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition-colors cursor-pointer text-center ${
                  activeWalk === "blast-radius"
                    ? "bg-rose-500/20 border-rose-500 text-rose-600 dark:text-rose-300 font-semibold shadow-xs"
                    : "bg-zinc-100/70 dark:bg-[#141622] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80"
                }`}
                title="Everything that breaks 2 levels out if this file changes"
              >
                Blast radius {blastRadius.length > 0 ? `(${blastRadius.length})` : ""}
              </button>
              <button
                type="button"
                onClick={() =>
                  setActiveWalk(
                    activeWalk === "dependency-chain" ? "direct" : "dependency-chain"
                  )
                }
                className={`py-1.5 px-3 rounded border text-xs font-mono font-medium transition-colors cursor-pointer text-center ${
                  activeWalk === "dependency-chain"
                    ? "bg-amber-500/20 border-amber-500 text-amber-600 dark:text-amber-300 font-semibold shadow-xs"
                    : "bg-zinc-100/70 dark:bg-[#141622] border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80"
                }`}
                title="Everything this file needs up to 2 levels deep"
              >
                Dependency chain {dependencyChain.length > 0 ? `(${dependencyChain.length})` : ""}
              </button>
            </div>

            {activeWalk === "blast-radius" ? (
              /* ======================================================== */
              /* BLAST RADIUS VIEW (2 levels deep)                        */
              /* ======================================================== */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                    Blast radius ({blastRadius.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveWalk("direct")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-mono cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  Everything that breaks if this file changes (2 levels deep).
                </p>
                {blastRadius.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 font-mono">
                    Nothing in the repository depends on this file.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {blastRadius.map((step) => {
                      const targetFile =
                        data.files.find((f) => f.path === step.path) || {
                          path: step.path,
                          folder: step.path.includes("/")
                            ? step.path.slice(0, step.path.lastIndexOf("/"))
                            : "",
                          language: "typescript" as const,
                          lineCount: 0,
                          contentHash: "",
                        };
                      const classification = classifyFile(targetFile);
                      const isHovered = hoveredFile === step.path;
                      const { dir, filename } = splitPath(step.path);
                      return (
                        <div
                          key={`blast-${step.path}`}
                          onClick={() => onSelectFile(step.path)}
                          onMouseEnter={() => onHoverFile(step.path)}
                          onMouseLeave={() => onHoverFile(null)}
                          className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                            isHovered
                              ? "bg-rose-500/20 border-rose-500 text-rose-900 dark:text-rose-100 shadow-sm"
                              : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                            />
                            <span className="truncate">
                              <span className="text-zinc-400 dark:text-zinc-500">{dir}</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filename}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                            {step.depth === 1 ? "depth 1" : "depth 2"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : activeWalk === "dependency-chain" ? (
              /* ======================================================== */
              /* DEPENDENCY CHAIN VIEW (2 levels deep)                     */
              /* ======================================================== */
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                    Dependency chain ({dependencyChain.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveWalk("direct")}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 font-mono cursor-pointer"
                  >
                    Close
                  </button>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  Everything this file needs up to 2 levels deep.
                </p>
                {dependencyChain.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 font-mono">
                    No internal dependencies within 2 levels.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                    {dependencyChain.map((step) => {
                      const targetFile =
                        data.files.find((f) => f.path === step.path) || {
                          path: step.path,
                          folder: step.path.includes("/")
                            ? step.path.slice(0, step.path.lastIndexOf("/"))
                            : "",
                          language: "typescript" as const,
                          lineCount: 0,
                          contentHash: "",
                        };
                      const classification = classifyFile(targetFile);
                      const isHovered = hoveredFile === step.path;
                      const { dir, filename } = splitPath(step.path);
                      return (
                        <div
                          key={`depchain-${step.path}`}
                          onClick={() => onSelectFile(step.path)}
                          onMouseEnter={() => onHoverFile(step.path)}
                          onMouseLeave={() => onHoverFile(null)}
                          className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                            isHovered
                              ? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-100 shadow-sm"
                              : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                          }`}
                        >
                          <div className="flex items-center gap-1.5 truncate mr-2">
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                            />
                            <span className="truncate">
                              <span className="text-zinc-400 dark:text-zinc-500">{dir}</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filename}</span>
                            </span>
                          </div>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-200/60 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 shrink-0">
                            {step.depth === 1 ? "depth 1" : "depth 2"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              /* ======================================================== */
              /* DIRECT DEPENDENTS / DEPENDENCIES VIEW                    */
              /* ======================================================== */
              <>
                {/* List 1: Outgoing Imports */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Imports
                    </span>
                    <span className="text-xs text-amber-500 dark:text-amber-400 font-mono font-medium">
                      {fileDetails.dependencies.length} &rarr;
                    </span>
                  </div>
                  {fileDetails.dependencies.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 font-mono">
                      No internal repository imports.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                      {fileDetails.dependencies.map(({ file: depFile, edgeKind }) => {
                        const isHovered = hoveredFile === depFile.path;
                        const { dir, filename } = splitPath(depFile.path);
                        return (
                          <div
                            key={`dep-out-${depFile.path}`}
                            onClick={() => onSelectFile(depFile.path)}
                            onMouseEnter={() => onHoverFile(depFile.path)}
                            onMouseLeave={() => onHoverFile(null)}
                            className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                              isHovered
                                ? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-100 shadow-sm"
                                : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                            }`}
                          >
                            <div className="truncate mr-2">
                              <span className="text-zinc-400 dark:text-zinc-500">{dir}</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filename}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                              {edgeKind || "import"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* List 2: Incoming Dependents */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Imported by
                    </span>
                    <span className="text-xs text-emerald-500 dark:text-emerald-400 font-mono font-medium">
                      &larr; {fileDetails.dependents.length}
                    </span>
                  </div>
                  {fileDetails.dependents.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60 font-mono">
                      Nothing imports this file directly.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[180px] overflow-y-auto custom-scrollbar">
                      {fileDetails.dependents.map(({ file: depFile, edgeKind }) => {
                        const isHovered = hoveredFile === depFile.path;
                        const { dir, filename } = splitPath(depFile.path);
                        return (
                          <div
                            key={`dep-in-${depFile.path}`}
                            onClick={() => onSelectFile(depFile.path)}
                            onMouseEnter={() => onHoverFile(depFile.path)}
                            onMouseLeave={() => onHoverFile(null)}
                            className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                              isHovered
                                ? "bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm"
                                : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                            }`}
                          >
                            <div className="truncate mr-2">
                              <span className="text-zinc-400 dark:text-zinc-500">{dir}</span>
                              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{filename}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 shrink-0">
                              {edgeKind || "import"}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        ) : folderDetails ? (
          /* ============================================================ */
          /* STRUCTURE TAB: SELECTED FOLDER VIEW                          */
          /* ============================================================ */
          <div className="flex flex-col gap-4">
            {/* Header / Folder Identity */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-indigo-500 dark:text-indigo-400 font-semibold">
                  Folder
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">•</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {folderDetails.files.length} files
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">•</span>
                <span className="text-[10px] font-mono text-zinc-400">
                  {folderDetails.totalLines} lines
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 break-all">
                {folderDetails.label}
              </h3>
            </div>

            {/* Folder Fan-In / Fan-Out Metrics */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                  Folder In
                </span>
                <span className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-300">
                  &lt;- {folderDetails.fanIn}
                </span>
                <span className="text-[10px] text-emerald-600/70 dark:text-emerald-400/70">
                  external sources
                </span>
              </div>
              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-500/30 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400">
                  Folder Out
                </span>
                <span className="text-base font-bold font-mono text-amber-600 dark:text-amber-300">
                  {folderDetails.fanOut} -&gt;
                </span>
                <span className="text-[10px] text-amber-600/70 dark:text-amber-400/70">
                  external targets
                </span>
              </div>
            </div>

            {/* Folder Composition Breakdown */}
            <div className="flex flex-col gap-2">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                Folder composition
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {folderDetails.kindCounts.map((k) => (
                  <div
                    key={k.kind}
                    className={`px-2 py-1 rounded border ${k.badgeBg} ${k.borderClass} flex items-center justify-between`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-1.5 h-1.5 rounded-full ${k.colorClass} shrink-0`} />
                      <span className={`text-[10px] font-mono truncate ${k.badgeText}`}>
                        {k.label}
                      </span>
                    </div>
                    <span className={`text-[10px] font-mono font-bold ${k.badgeText}`}>
                      {k.count}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Files inside this folder */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  Files ({folderDetails.files.length})
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">In folder</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[300px] overflow-y-auto custom-scrollbar">
                {folderDetails.files.map(({ file, classification, fanIn, fanOut }) => {
                  const isHovered = hoveredFile === file.path;
                  const fileName = file.path.split(/[/\\]/).pop() || file.path;
                  return (
                    <div
                      key={`folder-file-${file.path}`}
                      onClick={() => onSelectFile(file.path)}
                      onMouseEnter={() => onHoverFile(file.path)}
                      onMouseLeave={() => onHoverFile(null)}
                      className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                        isHovered
                          ? "bg-indigo-500/20 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm"
                          : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                        />
                        <span className="truncate" title={file.path}>
                          {fileName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[10px] shrink-0 font-mono">
                        <span className="text-emerald-500 dark:text-emerald-400">&lt;-{fanIn}</span>
                        <span className="text-amber-500 dark:text-amber-400">{fanOut}-&gt;</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          /* ============================================================ */
          /* STRUCTURE TAB: RESTING STATE (Repository Summary)            */
          /* ============================================================ */
          <div className="flex flex-col gap-4">
            {/* Header / Repository Summary Title */}
            <div className="flex flex-col gap-1 pb-3 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                  Repository Summary
                </span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-semibold">
                  {repoSummary.framework}
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 truncate">
                {repoSummary.name}
              </h3>
            </div>

            {/* Counts Overview Grid */}
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                  Files
                </span>
                <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {repoSummary.filesCount}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">parsed code files</span>
              </div>
              <div className="bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                  Imports
                </span>
                <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {repoSummary.importsCount}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">resolved connections</span>
              </div>
              <div className="bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                  Routes
                </span>
                <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {repoSummary.routesCount}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">framework endpoints</span>
              </div>
              <div className="bg-zinc-100/70 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800/80 rounded-lg p-2.5 flex flex-col">
                <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500">
                  Unidentified
                </span>
                <span className="text-base font-bold font-mono text-zinc-900 dark:text-zinc-100">
                  {repoSummary.unidentifiedCount}
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500">no convention</span>
              </div>
            </div>

            {/* Extracted Routes Table (Phase 8) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  Extracted routes ({data.routes ? data.routes.length : 0})
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {repoSummary.framework}
                </span>
              </div>
              {!data.routes || data.routes.length === 0 ? (
                <div className="p-3 text-center rounded border border-dashed border-zinc-200 dark:border-zinc-800 text-zinc-400 dark:text-zinc-500 font-mono text-[11px]">
                  No routes detected
                </div>
              ) : (
                <div className="flex flex-col gap-1 max-h-[220px] overflow-y-auto custom-scrollbar">
                  {data.routes.map((route, idx) => {
                    const isHovered = hoveredFile === route.filePath;
                    return (
                      <div
                        key={`route-${route.filePath}-${route.routePath}-${idx}`}
                        onClick={() => onSelectFile(route.filePath)}
                        onMouseEnter={() => onHoverFile(route.filePath)}
                        onMouseLeave={() => onHoverFile(null)}
                        className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex flex-col gap-1 group ${
                          isHovered
                            ? "bg-indigo-500/20 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm"
                            : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                        }`}
                        title={`Click to open ${route.filePath}`}
                      >
                        <div className="flex items-center justify-between gap-1.5">
                          <div className="flex items-center gap-1.5 shrink-0">
                            {route.httpMethods.map((method) => {
                              let badgeColor =
                                "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20";
                              if (method === "GET") {
                                badgeColor =
                                  "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20";
                              } else if (method === "POST") {
                                badgeColor =
                                  "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20";
                              } else if (method === "PUT") {
                                badgeColor =
                                  "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20";
                              } else if (method === "DELETE") {
                                badgeColor =
                                  "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20";
                              } else if (method === "PATCH") {
                                badgeColor =
                                  "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20";
                              }
                              return (
                                <span
                                  key={method}
                                  className={`px-1 py-0.2 text-[9px] font-bold rounded border uppercase ${badgeColor}`}
                                >
                                  {method}
                                </span>
                              );
                            })}
                          </div>
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate text-[11px]">
                            {route.routePath}
                          </span>
                        </div>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate">
                          {route.filePath}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Ranked List 1: What the rest of the repository leans on most */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  Depended on most
                </span>
                <span className="text-[10px] text-emerald-500 dark:text-emerald-400 font-mono">
                  By fan-in
                </span>
              </div>
              <div className="flex flex-col gap-1 max-h-[170px] overflow-y-auto custom-scrollbar">
                {repoSummary.mostDepended.slice(0, 15).map(({ file, classification, fanIn }) => {
                  const isHovered = hoveredFile === file.path;
                  return (
                    <div
                      key={`top-fanin-${file.path}`}
                      onClick={() => onSelectFile(file.path)}
                      onMouseEnter={() => onHoverFile(file.path)}
                      onMouseLeave={() => onHoverFile(null)}
                      className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                        isHovered
                          ? "bg-emerald-500/20 border-emerald-500 text-emerald-900 dark:text-emerald-100 shadow-sm"
                          : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                        />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 font-mono shrink-0">
                        &lt;- {fanIn}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Ranked List 2: Where reading starts (fan-in === 0) */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                  Where reading starts
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">0 incoming</span>
              </div>
              <div className="flex flex-col gap-1 max-h-[170px] overflow-y-auto custom-scrollbar">
                {repoSummary.readingStarts.slice(0, 15).map(({ file, classification, fanOut }) => {
                  const isHovered = hoveredFile === file.path;
                  return (
                    <div
                      key={`top-entry-${file.path}`}
                      onClick={() => onSelectFile(file.path)}
                      onMouseEnter={() => onHoverFile(file.path)}
                      onMouseLeave={() => onHoverFile(null)}
                      className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                        isHovered
                          ? "bg-amber-500/20 border-amber-500 text-amber-900 dark:text-amber-100 shadow-sm"
                          : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 truncate mr-2">
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                        />
                        <span className="truncate">{file.path}</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400 shrink-0">
                        {fanOut > 0 ? `${fanOut} ->` : "leaf"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Insights Section (Collapsible, starts collapsed per Phase 6 spec) */}
            <div className="flex flex-col gap-2 pt-2 border-t border-zinc-200 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setIsInsightsOpen((prev) => !prev)}
                className="flex items-center justify-between py-2 px-2.5 rounded-lg bg-zinc-100/70 dark:bg-zinc-900/50 hover:bg-zinc-200/70 dark:hover:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800/80 transition-colors cursor-pointer text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                    Insights
                  </span>
                  <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                    {insights.totalCount}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-mono text-zinc-400">
                    {isInsightsOpen ? "Collapse" : "Expand"}
                  </span>
                  <svg
                    className={`w-3.5 h-3.5 text-zinc-400 transition-transform ${
                      isInsightsOpen ? "rotate-180" : ""
                    }`}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>
              </button>

              {isInsightsOpen && (
                <div className="flex flex-col gap-3.5 pt-1">
                  {insights.groups.map((group) => (
                    <div key={group.kind} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                          {group.title} ({group.items.length})
                        </span>
                      </div>
                      <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 italic leading-snug">
                        {group.sentence}
                      </p>

                      {group.items.length === 0 ? (
                        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/40 dark:bg-zinc-900/30 border border-zinc-200/60 dark:border-zinc-800/40 font-mono">
                          None found
                        </div>
                      ) : (
                        <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                          {group.items.map((item) => {
                            const isHovered = hoveredFile === item.filePath;
                            return (
                              <div
                                key={item.id}
                                onClick={() => onSelectFile(item.filePath)}
                                onMouseEnter={() => onHoverFile(item.filePath)}
                                onMouseLeave={() => onHoverFile(null)}
                                className={`px-2 py-1.5 rounded border text-[11px] font-mono cursor-pointer transition-colors flex items-center justify-between group ${
                                  isHovered
                                    ? "bg-indigo-500/20 border-indigo-500 text-indigo-900 dark:text-indigo-100 shadow-sm"
                                    : "bg-zinc-100/70 dark:bg-zinc-900/50 border-zinc-200 dark:border-zinc-800/80 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 hover:text-zinc-900 dark:hover:text-zinc-100"
                                }`}
                              >
                                <div className="flex items-center gap-1.5 truncate mr-2">
                                  <span
                                    className={`w-1.5 h-1.5 rounded-full ${item.classification.colorClass} shrink-0`}
                                  />
                                  <span className="truncate">{item.filePath}</span>
                                </div>
                                <span className="text-[10px] text-zinc-400 shrink-0">
                                  {item.metric}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Actions / Utility Row */}
      <div className="px-3 py-2 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#10121d] flex items-center justify-between text-zinc-400 dark:text-zinc-500 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Helpful"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017a2 2 0 01-2-2V9a2 2 0 012-2h1.272a2 2 0 001.789-1.106l.894-1.789A2 2 0 0117.001 3v1a2 2 0 01-2 2h-1z" />
            </svg>
          </button>
          <button
            type="button"
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Unhelpful"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.736 3h4.018a2 2 0 012 2v10a2 2 0 01-2 2h-1.272a2 2 0 00-1.789 1.106l-.894 1.789A2 2 0 016.999 21v-1a2 2 0 012-2h1z" />
            </svg>
          </button>
          <button
            type="button"
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Comment"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (selectedFile) {
                navigator.clipboard?.writeText(selectedFile);
              }
            }}
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="Copy path"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => onTabChange("explanation")}
            className="hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors cursor-pointer"
            title="AI Explanation"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
            </svg>
          </button>
          <button
            type="button"
            className="hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            title="More actions"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="1" />
              <circle cx="19" cy="12" r="1" />
              <circle cx="5" cy="12" r="1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
