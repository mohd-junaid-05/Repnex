"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { useTheme } from "next-themes";
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  Node,
  Edge as FlowEdge,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  useUpdateNodeInternals,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { FolderNode, GraphEdge } from "@/lib/folding";
import { computeLayout } from "@/lib/layout";

export interface GraphViewProps {
  initialNodes: FolderNode[];
  initialEdges: GraphEdge[];
  selectedFile: string | null;
  selectedNodeId: string | null;
  hoveredFile: string | null;
  hoveredNodeId: string | null;
  expandedNodes: Set<string>;
  selectedCategory?: string | null;
  onToggleNode: (id: string) => void;
  onSelectFile: (path: string) => void;
  onSelectNode: (nodeId: string) => void;
  onHoverFile: (path: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  onPaneClick: () => void;
}

interface FolderNodeData extends Record<string, unknown> {
  node: FolderNode;
  expanded: boolean;
  onToggle: (e: React.MouseEvent) => void;
  selectedFile: string | null;
  onSelectFile: (path: string) => void;
  hoveredFile: string | null;
  onHoverFile: (path: string | null) => void;
  onHoverNode: (nodeId: string | null) => void;
  isDimmed: boolean;
  activeFiles: Set<string> | null;
  isNodeHovered: boolean;
  selectedCategory: string | null;
  categoryMatchCount: number;
}

function fileMatchesCategory(file: { language: string; path: string }, category: string | null): boolean {
  if (!category) return true;
  return file.language.toLowerCase() === category.toLowerCase();
}

/** Render a collapsible folder node with file rows and their connection handles. */
function FolderNodeComponent({ id, data, selected }: { id: string; data: FolderNodeData; selected?: boolean }) {
  const {
    node,
    expanded,
    onToggle,
    selectedFile,
    onSelectFile,
    hoveredFile,
    onHoverFile,
    onHoverNode,
    isDimmed,
    activeFiles,
    isNodeHovered,
    selectedCategory,
    categoryMatchCount,
  } = data;
  const updateNodeInternals = useUpdateNodeInternals();
  const [scrollTop, setScrollTop] = useState(0);

  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      setScrollTop(e.currentTarget.scrollTop);
      updateNodeInternals(id);
    },
    [updateNodeInternals, id]
  );

  const containsHoveredFile = !!(hoveredFile && node.files.some((f) => f.path === hoveredFile));

  if (expanded) {
    const cardHeight = 44 + Math.min(node.files.length, 12) * 26 + 8;
    const minTop = 48; // Just below header (44px)
    const maxTop = cardHeight - 12; // Above bottom card border

    return (
      <div
        className={`bg-white dark:bg-[#0d0e15]/95 border ${
          selected
            ? "border-indigo-600 dark:border-indigo-500 shadow-indigo-500/20 shadow-lg ring-1 ring-indigo-500"
            : containsHoveredFile || isNodeHovered
            ? "border-cyan-500 dark:border-cyan-400/80 shadow-cyan-500/10 shadow-md ring-1 ring-cyan-400/40"
            : "border-zinc-200 dark:border-indigo-900/40"
        } rounded-xl text-xs font-mono overflow-hidden w-[270px] h-full flex flex-col relative shadow-md dark:shadow-2xl transition-all duration-200 ${
          isDimmed ? "opacity-25 grayscale" : "opacity-100"
        }`}
      >
        <Handle type="target" position={Position.Left} className="opacity-0" />

        {/* Dynamic Clamped Handles overlay for each file row */}
        {node.files.map((f, i) => {
          const rowTop = 44 + 4 + i * 26 + 13 - scrollTop;
          const clampedTop = Math.max(minTop, Math.min(maxTop, rowTop));

          return (
            <React.Fragment key={`handles-${f.path}`}>
              <Handle
                type="target"
                position={Position.Left}
                id={`tgt-${f.path}`}
                style={{ top: `${clampedTop}px`, left: 0 }}
                className="!w-2 !h-2 !min-w-0 !min-h-0 !border-0 !bg-transparent opacity-0 absolute pointer-events-none"
              />
              <Handle
                type="source"
                position={Position.Right}
                id={`src-${f.path}`}
                style={{ top: `${clampedTop}px`, right: 0 }}
                className="!w-2 !h-2 !min-w-0 !min-h-0 !border-0 !bg-transparent opacity-0 absolute pointer-events-none"
              />
            </React.Fragment>
          );
        })}

        <div
          className="bg-zinc-50 dark:bg-[#131522] px-3 py-2 border-b border-zinc-200 dark:border-indigo-900/40 cursor-grab active:cursor-grabbing flex items-center justify-between gap-1 hover:bg-zinc-100 dark:hover:bg-[#181a2b] transition-colors shrink-0 z-10 select-none"
          onMouseEnter={() => onHoverNode(node.id)}
          onMouseLeave={() => onHoverNode(null)}
        >
          <div className="flex flex-col gap-0.5 min-w-0 flex-1">
            <span className="font-bold text-zinc-900 dark:text-zinc-100 text-xs tracking-tight truncate">
              {node.label}
            </span>
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 dark:text-zinc-400">
              {selectedCategory ? (
                <span className="font-mono font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.2 rounded border border-indigo-500/20">
                  {categoryMatchCount} matched
                </span>
              ) : (
                <span>{node.files.length} files</span>
              )}
              <div className="flex gap-1.5 items-center font-mono">
                <span className="text-emerald-600 dark:text-emerald-400">&lt;-{node.fanIn}</span>
                <span className="text-amber-600 dark:text-amber-400">{node.fanOut}-&gt;</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onToggle}
            className="nodrag text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded hover:bg-zinc-200/70 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
            title="Collapse folder"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="18 15 12 9 6 15" />
            </svg>
          </button>
        </div>
        <div
          className="flex-1 min-h-0 overflow-y-auto nowheel nodrag custom-scrollbar flex flex-col bg-zinc-50/50 dark:bg-[#0d0e15]/90 py-1 z-10"
          onScroll={handleScroll}
        >
          {node.files.map((f) => {
            const isFileSelected = selectedFile === f.path;
            const isFileHovered = hoveredFile === f.path;
            const isFileActive = activeFiles ? activeFiles.has(f.path) : true;
            const isCategoryMatch = fileMatchesCategory(f, selectedCategory);
            const isFileDimmed = (activeFiles && !isFileActive) || (selectedCategory && !isCategoryMatch);
            const name = f.path.split("/").pop() || f.path;

            // Dynamic UX color coding for file swatch box
            let swatchColor = "bg-indigo-500/80";
            if (isFileSelected) {
              swatchColor = "bg-cyan-500 shadow-xs shadow-cyan-500/50 ring-2 ring-cyan-400/40";
            } else if (name.startsWith("index.")) {
              swatchColor = "bg-emerald-500 shadow-xs shadow-emerald-400/40";
            } else if (name.includes(".test.") || name.includes(".spec.")) {
              swatchColor = "bg-rose-500/80";
            } else if (f.fanIn > 0 && f.fanOut === 0) {
              swatchColor = "bg-teal-500/80";
            } else if (f.fanOut > 0 && f.fanIn === 0) {
              swatchColor = "bg-amber-500/80";
            }

            return (
              <div
                key={f.path}
                className={`px-3 py-1 shrink-0 h-[26px] cursor-pointer truncate flex items-center justify-between group transition-colors relative ${
                  isFileSelected
                    ? "bg-indigo-50 dark:bg-indigo-600/35 text-indigo-900 dark:text-white font-semibold ring-1 ring-indigo-500/50"
                    : isFileHovered
                    ? "bg-cyan-50 dark:bg-cyan-500/20 text-cyan-900 dark:text-cyan-200 ring-1 ring-cyan-400/50"
                    : isFileDimmed
                    ? "text-zinc-400 dark:text-zinc-600 opacity-25 grayscale"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800/50"
                }`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectFile(f.path);
                }}
                onMouseEnter={() => onHoverFile(f.path)}
                onMouseLeave={() => onHoverFile(null)}
              >
                <div className="flex items-center truncate mr-2 z-10">
                  <span
                    className={`w-2.5 h-2.5 rounded-[2px] ${swatchColor} shrink-0 inline-block mr-2 transition-all`}
                  />
                  <span className="truncate text-[11px] font-mono">{name}</span>
                </div>
                <div className="flex gap-2 items-center text-[10px] shrink-0 font-mono z-10 opacity-90">
                  <span className="text-emerald-600 dark:text-emerald-400">&lt;-{f.fanIn}</span>
                  <span className="text-amber-600 dark:text-amber-400">{f.fanOut}-&gt;</span>
                </div>
              </div>
            );
          })}
        </div>
        <Handle type="source" position={Position.Right} className="opacity-0" />
      </div>
    );
  }

  return (
    <div
      onMouseEnter={() => onHoverNode(node.id)}
      onMouseLeave={() => onHoverNode(null)}
      className={`bg-white dark:bg-[#0d0e15] border ${
        selected
          ? "border-indigo-600 dark:border-indigo-500 shadow-md ring-1 ring-indigo-500"
          : containsHoveredFile || isNodeHovered
          ? "border-cyan-500 dark:border-cyan-400/80 shadow-cyan-500/10 shadow-md ring-1 ring-cyan-400/40"
          : "border-zinc-200 dark:border-indigo-900/40 hover:border-zinc-300 dark:hover:border-indigo-500/60"
      } rounded-lg text-xs font-mono px-3 py-2 cursor-grab active:cursor-grabbing shadow-xs dark:shadow-none transition-all duration-200 flex items-center justify-between select-none ${
        isDimmed ? "opacity-25 grayscale" : "opacity-100"
      }`}
      style={{ height: "100%", width: "100%" }}
    >
      <Handle type="target" position={Position.Left} className="opacity-0" />
      <div className="flex items-center gap-1.5 truncate mr-2">
        <button
          type="button"
          onClick={onToggle}
          className="nodrag text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer transition-colors shrink-0"
          title="Expand folder"
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
        <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate">{node.label}</span>
      </div>
      <div className="flex items-center gap-1.5 ml-2 text-[10px] font-mono shrink-0">
        {selectedCategory && (
          <span className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 px-1 py-0.5 rounded border border-indigo-500/20 mr-1">
            {categoryMatchCount}
          </span>
        )}
        <span className="text-emerald-600 dark:text-emerald-400">&lt;-{node.fanIn}</span>
        <span className="text-amber-600 dark:text-amber-400">{node.fanOut}-&gt;</span>
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0" />
    </div>
  );
}

const nodeTypes = {
  folder: FolderNodeComponent,
};

function GraphInner({
  initialNodes,
  initialEdges,
  selectedFile,
  selectedNodeId,
  hoveredFile,
  hoveredNodeId,
  expandedNodes,
  selectedCategory = null,
  onToggleNode,
  onSelectFile,
  onSelectNode,
  onHoverFile,
  onHoverNode,
  onPaneClick,
}: GraphViewProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>([]);
  const { fitView } = useReactFlow();
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";

  const isInitialLayoutDone = useRef(false);

  const handleNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onSelectNode(node.id);
    },
    [onSelectNode]
  );

  // 1. Structural layout calculation (runs when graph topology or folder expansion changes)
  useEffect(() => {
    const layout = computeLayout(initialNodes, initialEdges, expandedNodes);

    setNodes((prevNodes) => {
      const prevMap = new Map(prevNodes.map((n) => [n.id, n]));

      return layout.nodes.map((n) => {
        const existing = prevMap.get(n.id);
        // If node already exists, preserve its current dragged position, only update dimensions
        const position = existing ? existing.position : { x: n.x, y: n.y };
        const matchCount = n.files.filter((f) => fileMatchesCategory(f, selectedCategory)).length;

        return {
          id: n.id,
          type: "folder",
          position,
          selected: selectedNodeId === n.id,
          style: { width: n.width, height: n.height },
          data: {
            node: n,
            expanded: expandedNodes.has(n.id),
            onToggle: (e: React.MouseEvent) => {
              e.stopPropagation();
              onToggleNode(n.id);
            },
            selectedFile,
            onSelectFile,
            hoveredFile,
            onHoverFile,
            onHoverNode,
            isDimmed: selectedCategory ? matchCount === 0 : false,
            activeFiles: null,
            isNodeHovered: hoveredNodeId === n.id,
            selectedCategory,
            categoryMatchCount: matchCount,
          },
        };
      });
    });

    if (!isInitialLayoutDone.current) {
      isInitialLayoutDone.current = true;
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 600 });
      }, 60);
    }
  }, [initialNodes, initialEdges, expandedNodes, selectedCategory, onToggleNode, onSelectFile, onHoverFile, onHoverNode]);

  // 2. Dynamic state, highlighting, edges & theme updates (without mutating node positions)
  useEffect(() => {
    const activeNodes = new Set<string>();
    const activeFiles = new Set<string>();

    const targetFile = selectedFile || hoveredFile;
    const targetNodeId = selectedNodeId || hoveredNodeId;
    const hasSelectionOrHover = !!targetFile || !!targetNodeId;

    if (targetFile) {
      activeFiles.add(targetFile);
      const parentNode = initialNodes.find((n) => n.files.some((f) => f.path === targetFile));
      if (parentNode) {
        activeNodes.add(parentNode.id);
        parentNode.files.forEach((f) => activeFiles.add(f.path));
      }

      initialEdges.forEach((e) => {
        if (e.sourceFile === targetFile || e.targetFile === targetFile) {
          activeFiles.add(e.sourceFile);
          activeFiles.add(e.targetFile);
          activeNodes.add(e.source);
          activeNodes.add(e.target);
        }
      });
    } else if (targetNodeId) {
      activeNodes.add(targetNodeId);
      initialNodes.find((n) => n.id === targetNodeId)?.files.forEach((f) => activeFiles.add(f.path));

      initialEdges.forEach((e) => {
        if (e.source === targetNodeId || e.target === targetNodeId) {
          activeNodes.add(e.source);
          activeNodes.add(e.target);
          activeFiles.add(e.sourceFile);
          activeFiles.add(e.targetFile);
        }
      });
    } else if (selectedCategory) {
      initialNodes.forEach((n) => {
        const matches = n.files.filter((f) => fileMatchesCategory(f, selectedCategory));
        if (matches.length > 0) {
          activeNodes.add(n.id);
          matches.forEach((f) => activeFiles.add(f.path));
        }
      });
    }

    setNodes((prevNodes) =>
      prevNodes.map((n) => {
        const matchCount = (n.data?.node as FolderNode)?.files.filter((f) =>
          fileMatchesCategory(f, selectedCategory)
        ).length ?? 0;

        let isDimmed = false;
        if (hasSelectionOrHover) {
          isDimmed = !activeNodes.has(n.id);
        } else if (selectedCategory) {
          isDimmed = matchCount === 0;
        }

        const isSelected = selectedNodeId === n.id;
        const isNodeHovered = hoveredNodeId === n.id;

        return {
          ...n,
          selected: isSelected,
          data: {
            ...n.data,
            selectedFile,
            hoveredFile,
            isDimmed,
            activeFiles: hasSelectionOrHover ? activeFiles : null,
            isNodeHovered,
            selectedCategory,
            categoryMatchCount: matchCount,
          },
        };
      })
    );

    const flowEdgesMap = new Map<string, FlowEdge>();

    initialEdges.forEach((e) => {
      const isInternal = e.source === e.target;
      if (isInternal) return;

      const sourceExpanded = expandedNodes.has(e.source);
      const targetExpanded = expandedNodes.has(e.target);

      const sourceNode = initialNodes.find((n) => n.id === e.source);
      const targetNode = initialNodes.find((n) => n.id === e.target);

      const sourceFileVisible =
        sourceExpanded && sourceNode && sourceNode.files.some((f) => f.path === e.sourceFile);
      const targetFileVisible =
        targetExpanded && targetNode && targetNode.files.some((f) => f.path === e.targetFile);

      const sourceHandle = sourceFileVisible ? `src-${e.sourceFile}` : null;
      const targetHandle = targetFileVisible ? `tgt-${e.targetFile}` : null;

      const edgeId = `${e.source}${sourceHandle ? ":" + sourceHandle : ""}->${e.target}${
        targetHandle ? ":" + targetHandle : ""
      }`;

      const isSelectedEdge = !!(
        (selectedFile && (e.sourceFile === selectedFile || e.targetFile === selectedFile)) ||
        (selectedNodeId && (e.source === selectedNodeId || e.target === selectedNodeId))
      );

      const isHoveredEdge = !!(
        (hoveredFile && (e.sourceFile === hoveredFile || e.targetFile === hoveredFile)) ||
        (hoveredNodeId && (e.source === hoveredNodeId || e.target === hoveredNodeId))
      );

      const isEdgeActive = isSelectedEdge || isHoveredEdge;
      let isDimmed = false;
      if (hasSelectionOrHover) {
        isDimmed = !isEdgeActive;
      } else if (selectedCategory) {
        const sourceMatch = sourceNode?.files.some(
          (f) => f.path === e.sourceFile && fileMatchesCategory(f, selectedCategory)
        );
        const targetMatch = targetNode?.files.some(
          (f) => f.path === e.targetFile && fileMatchesCategory(f, selectedCategory)
        );
        isDimmed = !(sourceMatch || targetMatch);
      }
      const bothExpanded = sourceExpanded && targetExpanded;

      let edgeColor = isDark ? "#27272a" : "#cbd5e1";
      let strokeWidth = 0.75;
      let opacity = isDark ? 0.45 : 0.7;

      const activeFile = selectedFile || hoveredFile;

      if (activeFile) {
        if (e.targetFile === activeFile) {
          edgeColor = isDark ? "#22c55e" : "#16a34a"; // Emerald green for incoming import
          strokeWidth = 1.5;
          opacity = 0.95;
        } else if (e.sourceFile === activeFile) {
          edgeColor = isDark ? "#f59e0b" : "#d97706"; // Amber gold for outgoing export
          strokeWidth = 1.5;
          opacity = 0.95;
        }
      } else if (isEdgeActive) {
        edgeColor = isDark ? "#22c55e" : "#16a34a";
        strokeWidth = 1.25;
        opacity = 0.95;
      } else if (bothExpanded) {
        edgeColor = isDark ? "#38bdf8" : "#0284c7"; // Sky blue for direct open connections
        strokeWidth = 1.1;
        opacity = 0.85;
      }

      if (isDimmed) {
        edgeColor = isDark ? "#18181b" : "#e2e8f0";
        strokeWidth = 0.4;
        opacity = isDark ? 0.15 : 0.25;
      }

      if (!flowEdgesMap.has(edgeId)) {
        flowEdgesMap.set(edgeId, {
          id: edgeId,
          source: e.source,
          target: e.target,
          sourceHandle,
          targetHandle,
          type: "default",
          animated: false,
          style: {
            stroke: edgeColor,
            strokeWidth,
            opacity,
            zIndex: isEdgeActive ? 20 : bothExpanded ? 10 : 0,
          },
          className: "transition-all duration-300",
        });
      } else if (isEdgeActive || bothExpanded) {
        const fe = flowEdgesMap.get(edgeId)!;
        fe.style = {
          stroke: edgeColor,
          strokeWidth,
          opacity,
          zIndex: isEdgeActive ? 20 : 10,
        };
      }
    });

    setEdges(Array.from(flowEdgesMap.values()));
  }, [
    initialNodes,
    initialEdges,
    expandedNodes,
    selectedNodeId,
    selectedFile,
    hoveredFile,
    hoveredNodeId,
    selectedCategory,
    isDark,
    setEdges,
  ]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      onNodeClick={handleNodeClick}
      onPaneClick={onPaneClick}
      nodeTypes={nodeTypes}
      minZoom={0.1}
      maxZoom={2}
      nodesDraggable={true}
      nodesConnectable={false}
      elementsSelectable={true}
      className="bg-slate-50 dark:bg-[#090a0f]"
    >
      <Background color={isDark ? "#1f212d" : "#cbd5e1"} gap={20} size={1} />
      <Controls
        showInteractive={false}
        className="!bg-white dark:!bg-[#131522] !border-zinc-200 dark:!border-indigo-900/40 !text-zinc-700 dark:!text-zinc-300 !shadow-xs"
      />
    </ReactFlow>
  );
}

/** Provide an isolated React Flow context for the interactive dependency graph. */
export function GraphView(props: GraphViewProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}
