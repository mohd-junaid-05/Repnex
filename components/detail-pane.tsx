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
}: DetailPaneProps) {
  // State for transitive walk view and collapsible insights
  const [activeWalk, setActiveWalk] = useState<"direct" | "blast-radius" | "dependency-chain">("direct");
  const [isInsightsOpen, setIsInsightsOpen] = useState(false);

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
      {/* Tab Navigation Header */}
      <div className="flex items-center justify-between px-3 pt-2.5 pb-0 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#10121d] flex-shrink-0">
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
        {(selectedFile || selectedNodeId) && (
          <button
            type="button"
            onClick={() => {
              setActiveWalk("direct");
              onDeselect();
            }}
            className="text-[10px] px-1.5 py-0.5 mb-1.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors font-mono cursor-pointer border border-zinc-200 dark:border-zinc-700"
            title="Return to repository summary"
          >
            Deselect
          </button>
        )}
      </div>

      {/* Pane Content Area */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 flex flex-col gap-4 text-zinc-800 dark:text-zinc-200">
        {activeTab === "explanation" ? (
          /* ============================================================ */
          /* EXPLANATION TAB: EMPTY STATE (Phase 5)                       */
          /* ============================================================ */
          <div className="flex flex-col gap-3 h-full">
            <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
              <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
                Target
              </div>
              <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-semibold break-all">
                {selectedFile
                  ? selectedFile
                  : folderDetails
                  ? `Folder: ${folderDetails.label}`
                  : `Repository: ${repoSummary.name}`}
              </div>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center text-center p-4 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-lg bg-zinc-50/50 dark:bg-zinc-900/20">
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-500 dark:text-indigo-400 mb-2">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 text-xs mb-1">
                No explanation generated yet
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed max-w-[220px]">
                Explanations will be populated when an analysis is run with model explanation enabled.
              </p>
            </div>
          </div>
        ) : selectedFile && fileDetails ? (
          /* ============================================================ */
          /* STRUCTURE TAB: SELECTED FILE VIEW                            */
          /* ============================================================ */
          <div className="flex flex-col gap-3">
            {/* Header / File Identity */}
            <div className="flex flex-col gap-1.5 pb-2.5 border-b border-zinc-200 dark:border-zinc-800/80">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span
                  className={`text-[10px] font-mono px-1.5 py-0.5 rounded border ${fileDetails.classification.badgeBg} ${fileDetails.classification.badgeText} ${fileDetails.classification.borderClass} font-semibold`}
                >
                  {fileDetails.classification.label}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {fileDetails.file.language}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">•</span>
                <span className="text-[10px] font-mono text-zinc-400 dark:text-zinc-500">
                  {fileDetails.file.lineCount} lines
                </span>
              </div>
              <h3 className="font-mono text-xs font-bold text-zinc-900 dark:text-zinc-100 break-all leading-snug">
                {fileDetails.file.path}
              </h3>
            </div>

            {/* Transitive Walk / Direct Action Buttons (Phase 6) */}
            <div className="grid grid-cols-3 gap-1 bg-zinc-100 dark:bg-zinc-900/70 p-1 rounded-lg border border-zinc-200 dark:border-zinc-800/80">
              <button
                type="button"
                onClick={() => setActiveWalk("direct")}
                className={`py-1 px-1.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer text-center ${
                  activeWalk === "direct"
                    ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 shadow-xs font-bold"
                    : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
                }`}
              >
                Direct
              </button>
              <button
                type="button"
                onClick={() => setActiveWalk("blast-radius")}
                className={`py-1 px-1.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer text-center ${
                  activeWalk === "blast-radius"
                    ? "bg-rose-500 text-white font-bold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10"
                }`}
                title="Everything that breaks 2 levels out if this file changes"
              >
                Blast radius ({blastRadius.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveWalk("dependency-chain")}
                className={`py-1 px-1.5 rounded text-[10px] font-mono font-medium transition-colors cursor-pointer text-center ${
                  activeWalk === "dependency-chain"
                    ? "bg-amber-500 text-white font-bold shadow-xs"
                    : "text-zinc-600 dark:text-zinc-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-500/10"
                }`}
                title="Everything this file needs up to 2 levels deep"
              >
                Dep chain ({dependencyChain.length})
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
                  <span className="text-[10px] text-rose-500 font-mono">2 levels deep</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  Everything that breaks if this file changes.
                </p>
                {blastRadius.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60">
                    Nothing in the repository depends on this file.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto custom-scrollbar">
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
                            <span className="truncate">{step.path}</span>
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
                  <span className="text-[10px] text-amber-500 font-mono">2 levels deep</span>
                </div>
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-tight">
                  Everything this file needs up to 2 levels deep.
                </p>
                {dependencyChain.length === 0 ? (
                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60">
                    No internal dependencies within 2 levels.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1 max-h-[360px] overflow-y-auto custom-scrollbar">
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
                            <span className="truncate">{step.path}</span>
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
                {/* In / Out Direction Metric Pills */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 dark:border-emerald-500/30 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-emerald-700 dark:text-emerald-400">
                      Dependents
                    </span>
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-300">
                      &lt;- {fileDetails.fanIn}
                    </span>
                    <span className="text-[9px] text-emerald-600/70 dark:text-emerald-400/70">
                      things import this
                    </span>
                  </div>
                  <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 dark:border-amber-500/30 rounded-lg p-2 flex flex-col">
                    <span className="text-[10px] uppercase font-mono tracking-wider text-amber-700 dark:text-amber-400">
                      Dependencies
                    </span>
                    <span className="text-sm font-bold font-mono text-amber-600 dark:text-amber-300">
                      {fileDetails.fanOut} -&gt;
                    </span>
                    <span className="text-[9px] text-amber-600/70 dark:text-amber-400/70">
                      this imports
                    </span>
                  </div>
                </div>

                {/* List 1: Dependents (files that import this file) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Dependents ({fileDetails.dependents.length})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Incoming</span>
                  </div>
                  {fileDetails.dependents.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60">
                      Nothing imports this file directly.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                      {fileDetails.dependents.map(({ file: depFile, classification }) => {
                        const isHovered = hoveredFile === depFile.path;
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
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                              />
                              <span className="truncate">{depFile.path}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 shrink-0">
                              {depFile.lineCount > 0 ? `${depFile.lineCount}L` : ""}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* List 2: Dependencies (files this file imports) */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs">
                      Dependencies ({fileDetails.dependencies.length})
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Outgoing</span>
                  </div>
                  {fileDetails.dependencies.length === 0 ? (
                    <div className="text-[11px] text-zinc-400 dark:text-zinc-500 italic py-1 px-2 rounded bg-zinc-100/50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/60">
                      No internal repository imports.
                    </div>
                  ) : (
                    <div className="flex flex-col gap-1 max-h-[160px] overflow-y-auto custom-scrollbar">
                      {fileDetails.dependencies.map(({ file: depFile, classification }) => {
                        const isHovered = hoveredFile === depFile.path;
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
                            <div className="flex items-center gap-1.5 truncate mr-2">
                              <span
                                className={`w-1.5 h-1.5 rounded-full ${classification.colorClass} shrink-0`}
                              />
                              <span className="truncate">{depFile.path}</span>
                            </div>
                            <span className="text-[10px] text-zinc-400 shrink-0">
                              {depFile.lineCount > 0 ? `${depFile.lineCount}L` : ""}
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
    </aside>
  );
}
