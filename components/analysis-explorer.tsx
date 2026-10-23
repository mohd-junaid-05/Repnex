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

  // In-memory cache of explanations keyed by target (filePath or folderId).
  // "An explanation already fetched stays in the pane. Move the selection away, come back,
  // and it is still there without a second click. A cache nobody can feel is not a cache."
  const [explanations, setExplanations] = useState<Record<string, StoredExplanation>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [errorKey, setErrorKey] = useState<Record<string, string>>({});
  const [isAssigningRole, setIsAssigningRole] = useState(false);
  const [fileRoles, setFileRoles] = useState<Record<string, string>>(data.fileRoles || {});
  const [tracingConfigured, setTracingConfigured] = useState<boolean>(true);

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

  // Merge updated dynamic fileRoles into parse data so labels update instantly
  const activeData: ParseResult = useMemo(() => {
    return {
      ...data,
      fileRoles,
    };
  }, [data, fileRoles]);

  return (
    <div className="flex flex-1 h-full overflow-hidden text-xs bg-white dark:bg-black">
      {/* Left rail - Categories */}
      <aside className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d14] flex flex-col overflow-y-auto flex-shrink-0">
        <div className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#10121d] flex items-center justify-between">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Categories</h2>
          {selectedCategory && (
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className="text-[10px] text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              Reset
            </button>
          )}
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
                    ? "bg-indigo-50 dark:bg-indigo-600/30 text-indigo-900 dark:text-white font-semibold ring-1 ring-indigo-500/50"
                    : "hover:bg-zinc-100 dark:hover:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
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

      {/* Middle - Canvas */}
      <main className="flex-1 relative bg-slate-50 dark:bg-[#090a0f] overflow-hidden flex flex-col">
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

      {/* Right rail - Detail pane */}
      <DetailPane
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
      />
    </div>
  );
}
