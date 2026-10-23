"use client";

import React from "react";
import {
  parseExplanation,
  type ExplanationBlock,
  type ExplanationInline,
} from "@/lib/render-explanation";

interface ExplanationViewProps {
  text: string;
  fileSet: Set<string>;
  onSelectFile: (path: string) => void;
}

/** Renders a model explanation with only inline code, bold and bullets; repo paths become links. */
export function ExplanationView({ text, fileSet, onSelectFile }: ExplanationViewProps) {
  const blocks = React.useMemo(() => parseExplanation(text, fileSet), [text, fileSet]);

  return (
    <div className="flex flex-col gap-2.5 text-[11px] leading-relaxed text-zinc-700 dark:text-zinc-300">
      {blocks.map((block, i) => (
        <Block key={i} block={block} onSelectFile={onSelectFile} />
      ))}
    </div>
  );
}

function Block({
  block,
  onSelectFile,
}: {
  block: ExplanationBlock;
  onSelectFile: (path: string) => void;
}) {
  if (block.type === "bullet") {
    return (
      <div className="flex gap-1.5">
        <span className="text-zinc-400 dark:text-zinc-500 select-none shrink-0">•</span>
        <span className="flex-1">
          <Inline nodes={block.children} onSelectFile={onSelectFile} />
        </span>
      </div>
    );
  }

  return (
    <p>
      <Inline nodes={block.children} onSelectFile={onSelectFile} />
    </p>
  );
}

function Inline({
  nodes,
  onSelectFile,
}: {
  nodes: ExplanationInline[];
  onSelectFile: (path: string) => void;
}) {
  return (
    <>
      {nodes.map((node, i) => {
        switch (node.type) {
          case "text":
            return <React.Fragment key={i}>{node.text}</React.Fragment>;
          case "code":
            return (
              <code
                key={i}
                className="px-1 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-300 font-mono text-[10px] break-all"
              >
                {node.text}
              </code>
            );
          case "bold":
            return (
              <strong key={i} className="font-semibold text-zinc-900 dark:text-zinc-100">
                <Inline nodes={node.children} onSelectFile={onSelectFile} />
              </strong>
            );
          case "link":
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelectFile(node.path)}
                className="font-mono text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer break-all"
                title={node.path}
              >
                {node.path}
              </button>
            );
        }
      })}
    </>
  );
}
