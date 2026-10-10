import { ParseResult, ParsedFile } from "../parser/types";

export interface GraphFile extends ParsedFile {
  fanIn: number;
  fanOut: number;
}

export interface FolderNode {
  id: string; // The folder path (empty string for root)
  label: string; // Shortest unique label
  files: GraphFile[];
  fanIn: number;
  fanOut: number;
}

export interface GraphEdge {
  id: string;
  source: string; // id of the source FolderNode (or File if we link files?)
  target: string;
  // edges connect to the rows. So edges are between files!
  sourceFile: string;
  targetFile: string;
}

/**
 * Calculates the shortest unique label for each folder path.
 */
function computeLabels(paths: string[]): Map<string, string> {
  const labels = new Map<string, string>();
  
  // Split paths into parts. e.g. "a/b/c" -> ["c", "b", "a"] (reversed for easy popping)
  const partsByPath = new Map<string, string[]>();
  for (const p of paths) {
    if (p === "") {
      partsByPath.set(p, ["root"]);
    } else {
      partsByPath.set(p, p.split("/").reverse());
    }
  }

  // Find shortest unique slice for each path
  for (const p of paths) {
    if (p === "") {
      labels.set(p, "root");
      continue;
    }

    const parts = partsByPath.get(p)!;
    let lengthToTry = 1;
    let uniqueLabel = parts[0];

    while (lengthToTry <= parts.length) {
      const candidate = parts.slice(0, lengthToTry).reverse().join("/");
      
      // Check if candidate is unique among all paths
      let isUnique = true;
      for (const other of paths) {
        if (other === p) continue;
        const otherParts = partsByPath.get(other)!;
        const otherCandidate = otherParts.slice(0, lengthToTry).reverse().join("/");
        if (candidate === otherCandidate) {
          isUnique = false;
          break;
        }
      }

      if (isUnique) {
        uniqueLabel = candidate;
        break;
      }
      lengthToTry++;
    }
    
    // Fallback if fully identical (shouldn't happen with unique paths)
    labels.set(p, uniqueLabel);
  }

  return labels;
}

/**
 * Runs the folding algorithm to find a configuration with roughly under 24 nodes.
 */
export function computeFoldedGraph(result: ParseResult) {
  const allFolders = new Set<string>();
  result.files.forEach(f => {
    // add folder and all its ancestors
    let current = f.folder;
    allFolders.add(current);
    while (current !== "") {
      const lastSlash = current.lastIndexOf("/");
      current = lastSlash === -1 ? "" : current.slice(0, lastSlash);
      allFolders.add(current);
    }
  });
  
  // Sort folders deepest first (by number of slashes, descending)
  const sortedFolders = Array.from(allFolders).sort((a, b) => {
    const aDepth = a === "" ? 0 : a.split("/").length;
    const bDepth = b === "" ? 0 : b.split("/").length;
    return bDepth - aDepth;
  });

  let threshold = 2;
  const MAX_NODES = 24;
  
  let finalNodeMap = new Map<string, ParsedFile[]>();

  while (true) {
    // Initialize mapping
    const folderFiles = new Map<string, ParsedFile[]>();
    for (const f of allFolders) {
      folderFiles.set(f, []);
    }
    for (const file of result.files) {
      folderFiles.get(file.folder)!.push(file);
    }

    const activeFolders = new Set(allFolders);

    for (const folder of sortedFolders) {
      if (folder === "") continue; // Never merge root up

      const filesInFolder = folderFiles.get(folder)!;
      if (filesInFolder.length < threshold) {
        // Merge into parent
        const parent = folder.lastIndexOf("/") === -1 ? "" : folder.slice(0, folder.lastIndexOf("/"));
        
        // Move files to parent
        const parentFiles = folderFiles.get(parent)!;
        parentFiles.push(...filesInFolder);
        folderFiles.set(parent, parentFiles);
        folderFiles.set(folder, []);
        
        activeFolders.delete(folder);
      }
    }

    if (activeFolders.size <= MAX_NODES) {
      finalNodeMap = folderFiles;
      break;
    }
    
    // Safeguard against infinite loop if a repository has huge flat directories
    // or if max threshold doesn't reduce nodes (e.g. many directories with lots of files)
    if (threshold > 100) {
      finalNodeMap = folderFiles;
      break;
    }

    threshold++;
  }

  const keptFolders = Array.from(allFolders).filter(f => finalNodeMap.get(f)!.length > 0 || f === ""); 
  // wait, what if root is empty but kept? We just use folders that have > 0 files, unless it's the only one
  const activeNodes = keptFolders.filter(f => finalNodeMap.get(f)!.length > 0);
  
  const labels = computeLabels(activeNodes);

  // Compute edges and metrics
  // "Every edge terminates on a node that exists." (The file row)
  // Edges are between files.
  
  // Create a quick lookup for file -> which active node it belongs to
  const fileToNode = new Map<string, string>();
  for (const node of activeNodes) {
    const files = finalNodeMap.get(node)!;
    for (const f of files) {
      fileToNode.set(f.path, node);
    }
  }

  // Filter edges to only those where both source and target files exist in our mapped nodes
  // (In case there are external unresolved imports left over in the edges array)
  const validEdges = result.edges.filter(e => fileToNode.has(e.sourcePath) && fileToNode.has(e.targetPath));

  const graphEdges: GraphEdge[] = validEdges.map(e => {
    const sourceNodeId = fileToNode.get(e.sourcePath)!;
    const targetNodeId = fileToNode.get(e.targetPath)!;
    return {
      id: `${e.sourcePath}->${e.targetPath}`,
      source: sourceNodeId === "" ? "root" : sourceNodeId,
      target: targetNodeId === "" ? "root" : targetNodeId,
      sourceFile: e.sourcePath,
      targetFile: e.targetPath
    };
  });

  const nodes: FolderNode[] = activeNodes.map(id => {
    const files = finalNodeMap.get(id)!;
    
    // Fan-in/out for the node itself: cross-node edges only
    const filesSet = new Set(files.map(f => f.path));
    
    let fanIn = 0;
    let fanOut = 0;
    
    // Node fan-in: edges targeting a file in this node, coming from a file outside
    const incoming = validEdges.filter(e => filesSet.has(e.targetPath) && !filesSet.has(e.sourcePath));
    const uniqueIncomingSources = new Set(incoming.map(e => e.sourcePath));
    fanIn = uniqueIncomingSources.size;

    // Node fan-out: edges from a file in this node, targeting a file outside
    const outgoing = validEdges.filter(e => filesSet.has(e.sourcePath) && !filesSet.has(e.targetPath));
    const uniqueOutgoingTargets = new Set(outgoing.map(e => e.targetPath));
    fanOut = uniqueOutgoingTargets.size;

    const graphFiles: GraphFile[] = files.sort((a, b) => a.path.localeCompare(b.path)).map(f => {
      const fileFanIn = validEdges.filter(e => e.targetPath === f.path).length;
      const fileFanOut = validEdges.filter(e => e.sourcePath === f.path).length;
      return {
        ...f,
        fanIn: fileFanIn,
        fanOut: fileFanOut,
      };
    });

    return {
      id: id === "" ? "root" : id,
      label: labels.get(id)!,
      files: graphFiles,
      fanIn,
      fanOut
    };
  });

  return { nodes, edges: graphEdges, fileToNode };
}
