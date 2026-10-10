import dagre from 'dagre';
import { FolderNode, GraphEdge } from './folding';

export interface LayoutNode extends FolderNode {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeLayout(nodes: FolderNode[], edges: GraphEdge[], expandedNodes: Set<string>): { nodes: LayoutNode[] } {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'LR', align: 'UL', ranksep: 100, nodesep: 50 });
  g.setDefaultEdgeLabel(() => ({ weight: 1, minlen: 1 }));

  nodes.forEach(node => {
    // Width comes from label, approximate: 100 + label.length * 8
    let width = 100 + (node.label?.length || 10) * 8;
    // Height carries how many things depend on it (fan-in)
    let height = 40 + ((node.fanIn || 0) * 4);
    
    if (expandedNodes.has(node.id)) {
      // Panel state: capped height for scrollable file list
      const maxVisibleRows = 12;
      const visibleRows = Math.min(node.files.length, maxVisibleRows);
      height = 44 + (visibleRows * 25);
      width = Math.max(width, 270); // Minimum width for a panel
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
      const width = 100 + (node.label?.length || 10) * 8;
      let height = 40 + ((node.fanIn || 0) * 4);
      if (expandedNodes.has(node.id)) {
        const maxVisibleRows = 12;
        const visibleRows = Math.min(node.files.length, maxVisibleRows);
        height = 44 + (visibleRows * 25);
      }
      return {
        ...node,
        x: col * 350,
        y: row * 200,
        width: Math.max(width, expandedNodes.has(node.id) ? 250 : 0),
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
