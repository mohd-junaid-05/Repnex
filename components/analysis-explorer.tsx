"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import type { ParseResult } from "@/parser/types";
import type { FolderNode, GraphEdge } from "@/lib/folding";
import { GraphView } from "@/components/graph-view";
import { DetailPane } from "@/components/detail-pane";
import { CoverageBanner } from "@/components/coverage-banner";

import type { RailCategoryItem } from "@/lib/taxonomy";

interface AnalysisExplorerProps {
  analysisId?: string;
  data: ParseResult;
  nodes: FolderNode[];
  edges: GraphEdge[];
  fileToNode: Record<string, string>;
  categories: RailCategoryItem[];
  repoUrl?: string;
}

interface StoredExplanation {
  content: string;
  stale: boolean;
  cacheHit: boolean;
}

/** Coordinate selection, hover, folder expansion, coverage, and AI explanations. */
export function AnalysisExplorer({
  analysisId,
  data,
  nodes,
  edges,
  fileToNode,
  categories,
  repoUrl,
}: AnalysisExplorerProps) {
  const router = useRouter();
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [isReanalysing, setIsReanalysing] = useState(false);

  // Adjustable sidebars state
  const [leftWidth, setLeftWidth] = useState<number>(224);
  const [leftCollapsed, setLeftCollapsed] = useState<boolean>(false);
  const [rightWidth, setRightWidth] = useState<number>(320);
  const [rightCollapsed, setRightCollapsed] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<"left" | "right" | null>(null);
  const [showShortcuts, setShowShortcuts] = useState<boolean>(false);

  // In-memory cache of explanations keyed by target (filePath or folderId).
  // "An explanation already fetched stays in the pane. Move the selection away, come back,
  // and it is still there without a second click. A cache nobody can feel is not a cache."
  const [explanations, setExplanations] = useState<Record<string, StoredExplanation>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<Record<string, string>>({});
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [fileRoles, setFileRoles] = useState<Record<string, string>>(data.fileRoles || {});
  const [tracingConfigured, setTracingConfigured] = useState<boolean>(true);

  // Load saved sidebar dimensions from localStorage
  useEffect(() => {
    try {
      const savedLeft = localStorage.getItem("repnex_left_width") || localStorage.getItem("cartograph_left_width");
      if (savedLeft) {
        const val = parseInt(savedLeft, 10);
        if (!isNaN(val) && val >= 160 && val <= 400) setLeftWidth(val);
      }
      const savedRight = localStorage.getItem("repnex_right_width") || localStorage.getItem("cartograph_right_width");
      if (savedRight) {
        const val = parseInt(savedRight, 10);
        if (!isNaN(val) && val >= 260 && val <= 600) setRightWidth(val);
      }
    } catch {}
  }, []);

  // Persist sidebar adjustments to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("repnex_left_width", String(leftWidth));
    } catch {}
  }, [leftWidth]);

  useEffect(() => {
    try {
      localStorage.setItem("repnex_right_width", String(rightWidth));
    } catch {}
  }, [rightWidth]);

  // Drag handlers for left sidebar resize
  const startLeftResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging("left");
      const startX = e.clientX;
      const startW = leftWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = ev.clientX - startX;
        const nextW = Math.max(160, Math.min(420, startW + delta));
        setLeftWidth(nextW);
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [leftWidth]
  );

  // Drag handlers for right sidebar resize
  const startRightResize = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      setIsDragging("right");
      const startX = e.clientX;
      const startW = rightWidth;

      const handleMouseMove = (ev: MouseEvent) => {
        const delta = startX - ev.clientX;
        const nextW = Math.max(260, Math.min(650, startW + delta));
        setRightWidth(nextW);
      };

      const handleMouseUp = () => {
        setIsDragging(null);
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    },
    [rightWidth]
  );

  // Check tracing configuration status on mount
  useEffect(() => {
    fetch("/api/explain")
      .then((r) => r.json())
      .then((d) => {
        if (typeof d.tracingConfigured === "boolean") {
          setTracingConfigured(d.tracingConfigured);
        }
      })
      .catch(() => {});
  }, []);

  const handleReanalyse = useCallback(async () => {
    if (!repoUrl || isReanalysing) return;
    setIsReanalysing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl, forceRerun: true }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || "Failed to start re-analysis");
      }

      const result = await res.json();
      if (result.analysisId) {
        router.push(`/analysis/${result.analysisId}`);
      } else {
        router.refresh();
      }
    } catch (err) {
      console.error("[reanalyse]", err);
      alert(err instanceof Error ? err.message : "Failed to re-analyse repository.");
      setIsReanalysing(false);
    }
  }, [repoUrl, isReanalysing, router]);

  const handleSelectFile = useCallback(
    (filePath: string) => {
      setSelectedFile(filePath);
      setSelectedNodeId(null);

      // Auto-expand folder if collapsed
      const folderId = fileToNode[filePath];
      if (folderId !== undefined) {
        const nodeId = folderId === "" ? "root" : folderId;
        setExpandedNodes((prev) => {
          if (!prev.has(nodeId)) {
            const next = new Set(prev);
            next.add(nodeId);
            return next;
          }
          return prev;
        });
      }
    },
    [fileToNode]
  );

  const handleSelectNode = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    setSelectedFile(null);
  }, []);

  const handleDeselect = useCallback(() => {
    setSelectedFile(null);
    setSelectedNodeId(null);
  }, []);

  const handleToggleNode = useCallback((nodeId: string) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  // Compute active target key for explanations
  const activeTargetKey = selectedFile
    ? selectedFile
    : selectedNodeId !== null
    ? selectedNodeId === ""
      ? "root"
      : selectedNodeId
    : null;

  const currentExplanation = activeTargetKey ? explanations[activeTargetKey] ?? null : null;
  const isLoadingExplanation = activeTargetKey !== null && loadingKey === activeTargetKey;
  const explanationError = activeTargetKey ? errorKey[activeTargetKey] ?? "" : "";

  // Explain action: explain file or folded folder
  const handleExplain = useCallback(async () => {
    if (!analysisId) return;

    if (selectedFile) {
      const key = selectedFile;
      setLoadingKey(key);
      setErrorKey((prev) => ({ ...prev, [key]: "" }));
      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId,
            targetType: "file",
            targetKey: selectedFile,
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to explain file.");
        }
        setExplanations((prev) => ({
          ...prev,
          [key]: {
            content: json.content,
            stale: Boolean(json.stale),
            cacheHit: Boolean(json.cacheHit),
          },
        }));
        if (typeof json.tracingConfigured === "boolean") {
          setTracingConfigured(json.tracingConfigured);
        }
      } catch (err) {
        setErrorKey((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Failed to explain file.",
        }));
      } finally {
        setLoadingKey(null);
      }
    } else if (selectedNodeId !== null) {
      const folderNode = nodes.find((n) => n.id === selectedNodeId);
      if (!folderNode) return;
      const key = selectedNodeId === "" ? "root" : selectedNodeId;
      setLoadingKey(key);
      setErrorKey((prev) => ({ ...prev, [key]: "" }));

      const folderFilesSet = new Set(folderNode.files.map((f) => f.path));
      const incomingFromSet = new Set<string>();
      const outgoingToSet = new Set<string>();

      for (const edge of data.edges) {
        const sourceIn = folderFilesSet.has(edge.sourcePath);
        const targetIn = folderFilesSet.has(edge.targetPath);
        if (!sourceIn && targetIn) {
          incomingFromSet.add(edge.sourcePath);
        } else if (sourceIn && !targetIn) {
          outgoingToSet.add(edge.targetPath);
        }
      }

      const filesPayload = folderNode.files.map((f) => ({
        path: f.path,
        role: fileRoles[f.path] || undefined,
        fanIn: data.fanMetrics[f.path]?.fanIn ?? f.fanIn,
        fanOut: data.fanMetrics[f.path]?.fanOut ?? f.fanOut,
        contentHash: f.contentHash,
      }));

      try {
        const res = await fetch("/api/explain", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            analysisId,
            targetType: "folder",
            targetKey: folderNode.id,
            files: filesPayload,
            incomingFrom: Array.from(incomingFromSet).sort(),
            outgoingTo: Array.from(outgoingToSet).sort(),
          }),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Failed to explain folder.");
        }
        setExplanations((prev) => ({
          ...prev,
          [key]: {
            content: json.content,
            stale: Boolean(json.stale),
            cacheHit: Boolean(json.cacheHit),
          },
        }));
        if (typeof json.tracingConfigured === "boolean") {
          setTracingConfigured(json.tracingConfigured);
        }
      } catch (err) {
        setErrorKey((prev) => ({
          ...prev,
          [key]: err instanceof Error ? err.message : "Failed to explain folder.",
        }));
      } finally {
        setLoadingKey(null);
      }
    }
  }, [analysisId, selectedFile, selectedNodeId, nodes, data.edges, data.fanMetrics, fileRoles]);

  // Role assignment: classify file no adapter identified
  const handleAssignRole = useCallback(async () => {
    if (!analysisId || !selectedFile || isAssigningRole) return;
    setIsAssigningRole(true);
    try {
      const res = await fetch("/api/explain/role", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysisId,
          filePath: selectedFile,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to assign role.");
      }
      if (json.role) {
        setFileRoles((prev) => ({
          ...prev,
          [selectedFile]: json.role,
        }));
      }
    } catch (err) {
      console.error("[assignRole]", err);
      alert(err instanceof Error ? err.message : "Failed to assign role.");
    } finally {
      setIsAssigningRole(false);
    }
  }, [analysisId, selectedFile, isAssigningRole]);

  // Global keyboard shortcuts: Esc to deselect/close, [ and ] to toggle sidebars, ? for shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      if (e.key === "Escape") {
        if (showShortcuts) {
          setShowShortcuts(false);
        } else {
          handleDeselect();
        }
      } else if (e.key === "[") {
        setLeftCollapsed((prev) => !prev);
      } else if (e.key === "]") {
        setRightCollapsed((prev) => !prev);
      } else if (e.key === "?") {
        setShowShortcuts((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleDeselect, showShortcuts]);

  // Merge updated dynamic fileRoles into parse data so labels update instantly
  const activeData: ParseResult = useMemo(() => {
    return {
      ...data,
      fileRoles,
    };
  }, [data, fileRoles]);

  return (
    <div
      className={`flex flex-1 h-full overflow-hidden text-xs bg-zinc-50 dark:bg-zinc-950 relative ${
        isDragging ? "select-none" : ""
      }`}
    >
      {/* Left rail - Categories */}
      {!leftCollapsed ? (
        <>
          <aside
            style={{ width: `${leftWidth}px` }}
            className="border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 flex flex-col overflow-y-auto flex-shrink-0 relative select-none"
          >
            <div className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/60 flex items-center justify-between">
              <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Categories</h2>
              <div className="flex items-center gap-1.5">
                {selectedCategory && (
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    Reset
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setLeftCollapsed(true)}
                  className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  title="Collapse categories ([)"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="flex-1 p-3 flex flex-col gap-1.5">
              {categories.map(({ id, label, count, colorClass }) => {
                const isSelected = selectedCategory === label;
                return (
                  <div
                    key={id}
                    onClick={() => setSelectedCategory((prev) => (prev === label ? null : label))}
                    className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${
                      isSelected
                        ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium ring-1 ring-zinc-300 dark:ring-zinc-700"
                        : "hover:bg-zinc-100/70 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <div className={`w-2.5 h-2.5 rounded-xs shrink-0 ${colorClass || "bg-zinc-500"}`} />
                      <span className="truncate">{label}</span>
                    </div>
                    <span className="text-zinc-400 dark:text-zinc-500 font-mono text-[11px] shrink-0 ml-2">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </aside>
          {/* Left Resize Handle */}
          <div
            onMouseDown={startLeftResize}
            onDoubleClick={() => setLeftWidth(224)}
            className={`w-1 hover:w-1.5 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-500 transition-all z-20 shrink-0 ${
              isDragging === "left" ? "bg-zinc-500 dark:bg-zinc-400 w-1.5" : "bg-transparent"
            }`}
            title="Drag to resize categories, double-click to reset"
          />
        </>
      ) : null}

      {/* Middle - Canvas */}
      <main className="flex-1 relative bg-zinc-50 dark:bg-zinc-950 overflow-hidden flex flex-col">
        {leftCollapsed && (
          <button
            type="button"
            onClick={() => setLeftCollapsed(false)}
            className="absolute top-3 left-3 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shadow-xs hover:bg-white dark:hover:bg-zinc-900 transition-colors backdrop-blur-xs cursor-pointer"
            title="Expand categories ([)"
          >
            <span>Categories</span>
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        )}

        {rightCollapsed && (
          <button
            type="button"
            onClick={() => setRightCollapsed(false)}
            className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2.5 py-1 bg-white/90 dark:bg-zinc-900/90 border border-zinc-200 dark:border-zinc-800 rounded-md text-[11px] font-mono text-zinc-700 dark:text-zinc-300 shadow-xs hover:bg-white dark:hover:bg-zinc-900 transition-colors backdrop-blur-xs cursor-pointer"
            title="Expand detail pane (])"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            <span>Inspector</span>
          </button>
        )}

        {/* Canvas Telemetry HUD & Shortcut trigger */}
        <div className="absolute bottom-3 left-3 z-30 flex items-center gap-2 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200 dark:border-zinc-800 rounded-md px-2.5 py-1 text-[11px] font-mono shadow-xs backdrop-blur-xs select-none">
          <div className="flex items-center gap-1.5 text-zinc-600 dark:text-zinc-400">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span>{nodes.length} folders</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span>{Object.keys(data.files).length} files</span>
            <span className="text-zinc-300 dark:text-zinc-700">/</span>
            <span>{data.edges.length} edges</span>
          </div>
          <div className="h-3 w-px bg-zinc-200 dark:bg-zinc-800" />
          <button
            type="button"
            onClick={() => setShowShortcuts((prev) => !prev)}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 flex items-center gap-1 px-1 py-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Keyboard shortcuts (?)"
          >
            <kbd className="px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-[10px] leading-tight">?</kbd>
            <span>Shortcuts</span>
          </button>
        </div>

        {data.coverage && <CoverageBanner coverage={data.coverage} />}

        <GraphView
          initialNodes={nodes}
          initialEdges={edges}
          selectedFile={selectedFile}
          selectedNodeId={selectedNodeId}
          hoveredFile={hoveredFile}
          hoveredNodeId={hoveredNodeId}
          expandedNodes={expandedNodes}
          selectedCategory={selectedCategory}
          onToggleNode={handleToggleNode}
          onSelectFile={handleSelectFile}
          onSelectNode={handleSelectNode}
          onHoverFile={setHoveredFile}
          onHoverNode={setHoveredNodeId}
          onPaneClick={handleDeselect}
        />
      </main>

      {/* Right Resize Handle */}
      {!rightCollapsed && (
        <div
          onMouseDown={startRightResize}
          onDoubleClick={() => setRightWidth(320)}
          className={`w-1 hover:w-1.5 cursor-col-resize hover:bg-zinc-400 dark:hover:bg-zinc-500 transition-all z-20 shrink-0 ${
            isDragging === "right" ? "bg-zinc-500 dark:bg-zinc-400 w-1.5" : "bg-transparent"
          }`}
          title="Drag to resize inspector, double-click to reset"
        />
      )}

      {/* Right rail - Detail pane */}
      <DetailPane
        analysisId={analysisId}
        data={activeData}
        nodes={nodes}
        selectedFile={selectedFile}
        selectedNodeId={selectedNodeId}
        hoveredFile={hoveredFile}
        hoveredNodeId={hoveredNodeId}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSelectFile={handleSelectFile}
        onSelectNode={handleSelectNode}
        onHoverFile={setHoveredFile}
        onHoverNode={setHoveredNodeId}
        onDeselect={handleDeselect}
        onReanalyse={repoUrl ? handleReanalyse : undefined}
        isReanalysing={isReanalysing}
        explanation={currentExplanation}
        isLoadingExplanation={isLoadingExplanation}
        explanationError={explanationError}
        onExplain={handleExplain}
        isAssigningRole={isAssigningRole}
        onAssignRole={handleAssignRole}
        tracingConfigured={tracingConfigured}
        width={rightWidth}
        isCollapsed={rightCollapsed}
        onToggleCollapse={() => setRightCollapsed(true)}
      />

      {/* Keyboard Shortcuts Cheat Sheet Modal */}
      {showShortcuts && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4"
          onClick={() => setShowShortcuts(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden font-sans text-xs"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/80">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">Keyboard Shortcuts</span>
                <span className="text-[10px] font-mono text-zinc-400">Repnex HUD</span>
              </div>
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
                title="Close (Esc)"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-4 space-y-3 font-mono text-[11px]">
              <div className="space-y-1.5">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-sans font-semibold mb-2">Workspace Navigation</div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Toggle categories rail</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200">[</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Toggle inspector rail</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200">]</kbd>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Deselect / Close modal</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200">Esc</kbd>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Open shortcuts cheat sheet</span>
                  <kbd className="px-1.5 py-0.5 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 rounded text-zinc-800 dark:text-zinc-200">?</kbd>
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <div className="text-[10px] uppercase tracking-wider text-zinc-400 font-sans font-semibold mb-2">Canvas Gestures</div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Pan map</span>
                  <span className="text-zinc-500">Drag canvas</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Zoom in / out</span>
                  <span className="text-zinc-500">Scroll wheel / Pinch</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-zinc-100 dark:border-zinc-800/60">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Inspect file or folder</span>
                  <span className="text-zinc-500">Click node</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-zinc-700 dark:text-zinc-300 font-sans">Reset divider width</span>
                  <span className="text-zinc-500">Double-click divider</span>
                </div>
              </div>
            </div>

            <div className="px-4 py-2.5 bg-zinc-50 dark:bg-zinc-900/60 border-t border-zinc-200 dark:border-zinc-800 flex justify-end">
              <button
                type="button"
                onClick={() => setShowShortcuts(false)}
                className="px-3 py-1 bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-zinc-200 text-white dark:text-zinc-900 rounded text-[11px] font-medium transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
