"use client";

import React, { useState, useCallback } from "react";
import type { ParseResult } from "@/parser/types";
import type { FolderNode, GraphEdge } from "@/lib/folding";
import { GraphView } from "@/components/graph-view";
import { DetailPane } from "@/components/detail-pane";

interface Category {
  lang: string;
  count: number;
}

interface PreviewExplorerProps {
  data: ParseResult;
  nodes: FolderNode[];
  edges: GraphEdge[];
  fileToNode: Record<string, string>;
  categories: Category[];
}

export function PreviewExplorer({
  data,
  nodes,
  edges,
  fileToNode,
  categories,
}: PreviewExplorerProps) {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [hoveredFile, setHoveredFile] = useState<string | null>(null);
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"structure" | "explanation">("structure");
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());

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

  const colors: Record<string, string> = {
    typescript: "bg-blue-500",
    typescriptreact: "bg-emerald-500",
    javascript: "bg-amber-500",
    javascriptreact: "bg-rose-500",
  };

  return (
    <div className="flex flex-1 h-full overflow-hidden text-xs bg-white dark:bg-black">
      {/* Left rail - Categories */}
      <aside className="w-56 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d14] flex flex-col overflow-y-auto flex-shrink-0">
        <div className="px-3 py-2.5 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-[#10121d]">
          <h2 className="font-semibold text-zinc-900 dark:text-zinc-100">Categories</h2>
        </div>
        <div className="flex-1 p-3 flex flex-col gap-2">
          {categories.map(({ lang, count }) => (
            <div key={lang} className="flex items-center justify-between group">
              <div className="flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-xs ${colors[lang] || "bg-zinc-500"}`} />
                <span className="text-zinc-700 dark:text-zinc-300">{lang}</span>
              </div>
              <span className="text-zinc-400 dark:text-zinc-500 font-mono">{count}</span>
            </div>
          ))}
        </div>
      </aside>

      {/* Middle - Canvas */}
      <main className="flex-1 relative bg-slate-50 dark:bg-[#090a0f] overflow-hidden flex flex-col">
        <GraphView
          initialNodes={nodes}
          initialEdges={edges}
          selectedFile={selectedFile}
          selectedNodeId={selectedNodeId}
          hoveredFile={hoveredFile}
          hoveredNodeId={hoveredNodeId}
          expandedNodes={expandedNodes}
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
        data={data}
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
      />
    </div>
  );
}
