import dagre from 'dagre';
import { FolderNode, GraphEdge } from './folding';

export interface LayoutNode extends FolderNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Return folder nodes with top-left positions and dimensions based on expansion state.
 * Use a left-to-right Dagre layout, falling back to a grid if layout fails.
 */
export function computeLayout(nodes: FolderNode[], edges: GraphEdge[], expandedNodes: Set<string>): { nodes: LayoutNode[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 100, nodesep: 50 });
  g.setDefaultEdgeLabel(() => ({ weight: 1, minlen: 1 }));

  nodes.forEach(node => {
    let width: number;
    let height: number;

    if (expandedNodes.has(node.id)) {
      // Expanded panel: exactly 7 rows max before scrolling
      const maxVisibleRows = 7;
      const visibleRows = Math.min(node.files.length, maxVisibleRows);
      height = 56 + (visibleRows * 28);

      let maxFileNameLen = node.label?.length || 10;
      for (const f of node.files) {
        const name = f.path.split('/').pop() || f.path;
        if (name.length > maxFileNameLen) maxFileNameLen = name.length;
      }
      width = Math.min(360, Math.max(280, 120 + maxFileNameLen * 8.5));
    } else {
      // Collapsed folder: width sized to prevent truncating folder names
      height = 38;
      width = Math.min(320, Math.max(170, 110 + (node.label?.length || 4) * 9.5));
    }

    g.setNode(node.id, { width, height });
  });

  const edgeSet = new Set<string>();
  
  edges.forEach(edge => {
    if (edge.source && edge.target && edge.source !== edge.target) {
      const key = `${edge.source}|${edge.target}`;
      if (!edgeSet.has(key)) {
        edgeSet.add(key);
        if (g.hasNode(edge.source) && g.hasNode(edge.target)) {
          g.setEdge(edge.source, edge.target, { weight: 1, minlen: 1 });
        }
      }
    }
  });

  try {
    dagre.layout(g);
  } catch (err) {
    console.error("Dagre layout failed, using grid fallback", err);
    // Grid fallback
    const cols = Math.ceil(Math.sqrt(nodes.length));
    const layoutNodes = nodes.map((node, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      let width: number;
      let height: number;

      if (expandedNodes.has(node.id)) {
        const maxVisibleRows = 7;
        const visibleRows = Math.min(node.files.length, maxVisibleRows);
        height = 56 + (visibleRows * 28);
        width = 280;
      } else {
        height = 38;
        width = Math.min(320, Math.max(170, 110 + (node.label?.length || 4) * 9.5));
      }

      return {
        ...node,
        x: col * 350,
        y: row * 200,
        width,
        height
      };
    });
    return { nodes: layoutNodes };
  }

  const layoutNodes = nodes.map(node => {
    const nodeWithPos = g.node(node.id);
    return {
      ...node,
      x: (nodeWithPos?.x || 0) - (nodeWithPos?.width || 0) / 2,
      y: (nodeWithPos?.y || 0) - (nodeWithPos?.height || 0) / 2,
      width: nodeWithPos?.width || 100,
      height: nodeWithPos?.height || 40
    };
  });

  return { nodes: layoutNodes };
}
