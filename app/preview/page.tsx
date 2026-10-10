import fs from "fs";
import path from "path";
import React from "react";
import type { ParseResult } from "@/parser/types";
import { computeFoldedGraph } from "@/lib/folding";
import { PreviewExplorer } from "@/components/preview-explorer";

/** Load the bundled parse result and prepare its folded graph for the explorer. */
export default async function PreviewPage() {
  const filePath = path.join(process.cwd(), "parser-output-mantine.json");
  const data: ParseResult = JSON.parse(fs.readFileSync(filePath, "utf-8"));

  // Calculate folding
  const { nodes, edges, fileToNode } = computeFoldedGraph(data);

  // Extract categories (by language for left rail)
  const categoriesMap = new Map<string, number>();
  data.files.forEach((f) => {
    categoriesMap.set(f.language, (categoriesMap.get(f.language) || 0) + 1);
  });
  const categories = Array.from(categoriesMap.entries()).map(([lang, count]) => ({
    lang,
    count,
  }));

  const fileToNodeObj = Object.fromEntries(fileToNode.entries());

  return (
    <PreviewExplorer
      data={data}
      nodes={nodes}
      edges={edges}
      fileToNode={fileToNodeObj}
      categories={categories}
    />
  );
}
