"use client";

import React, { useState } from "react";
import type { CoverageReport } from "@/parser/types";

interface CoverageBannerProps {
  coverage: CoverageReport;
}

export function CoverageBanner({ coverage }: CoverageBannerProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const resolved = coverage.resolvedImports || 0;
  const unresolved = coverage.unresolvedImports?.length || 0;
  const internalAndUnresolved = resolved + unresolved;

  // Percentage of internal repository imports successfully resolved
  const resolutionPct =
    internalAndUnresolved > 0
      ? Math.round((resolved / internalAndUnresolved) * 100)
      : 100;

  const filesParsed = coverage.filesParsed || 0;
  const totalFiles = coverage.totalFilesFound || filesParsed;
  const filesPct =
    totalFiles > 0 ? Math.round((filesParsed / totalFiles) * 100) : 100;

  const isPartial = resolutionPct < 95 || coverage.filesSkipped > 0 || unresolved > 0;

  if (!isPartial) {
    return null;
  }

  return (
    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30 max-w-xl w-11/12">
      <div className="bg-amber-50/95 dark:bg-[#1a140a]/95 border border-amber-300 dark:border-amber-800/80 rounded shadow-xs text-xs backdrop-blur-xs">
        {/* Collapsed header / single line summary */}
        <div className="flex items-center justify-between px-3 py-1.5 gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
            <span className="font-semibold text-amber-900 dark:text-amber-200">
              Partial Graph ({resolutionPct}% resolution)
            </span>
            <span className="text-amber-700/80 dark:text-amber-400/80 font-mono text-[11px] truncate">
              {unresolved} unresolved imports
              {coverage.filesSkipped > 0 && `, ${coverage.filesSkipped} skipped files`}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="text-[11px] font-mono text-amber-800 dark:text-amber-300 hover:underline cursor-pointer shrink-0"
          >
            {isExpanded ? "Collapse" : "Details"}
          </button>
        </div>

        {/* Expanded detailed breakdown */}
        {isExpanded && (
          <div className="border-t border-amber-200 dark:border-amber-900/60 px-3 py-2.5 flex flex-col gap-2 font-mono text-[11px] text-amber-900 dark:text-amber-200">
            <div className="grid grid-cols-2 gap-2 pb-1 border-b border-amber-200/50 dark:border-amber-900/40">
              <div>
                <span className="text-amber-700 dark:text-amber-400">Import coverage: </span>
                <span>{resolutionPct}% ({resolved}/{internalAndUnresolved})</span>
              </div>
              <div>
                <span className="text-amber-700 dark:text-amber-400">File coverage: </span>
                <span>{filesPct}% ({filesParsed}/{totalFiles})</span>
              </div>
            </div>

            {unresolved > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-amber-950 dark:text-amber-100">
                  Unresolved Imports ({unresolved}):
                </span>
                <div className="max-h-24 overflow-y-auto flex flex-col gap-0.5 bg-amber-100/50 dark:bg-amber-950/40 p-1.5 rounded">
                  {coverage.unresolvedImports.slice(0, 5).map((u, i) => (
                    <div key={i} className="truncate text-[10px]">
                      <span className="text-amber-700 dark:text-amber-400">[{u.reason}] </span>
                      <span>{u.sourcePath} → {u.importSpecifier}</span>
                    </div>
                  ))}
                  {unresolved > 5 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                      ...and {unresolved - 5} more
                    </span>
                  )}
                </div>
              </div>
            )}

            {coverage.skippedFiles && coverage.skippedFiles.length > 0 && (
              <div className="flex flex-col gap-1">
                <span className="font-semibold text-amber-950 dark:text-amber-100">
                  Skipped Files ({coverage.skippedFiles.length}):
                </span>
                <div className="max-h-20 overflow-y-auto flex flex-col gap-0.5 bg-amber-100/50 dark:bg-amber-950/40 p-1.5 rounded">
                  {coverage.skippedFiles.slice(0, 4).map((s, i) => (
                    <div key={i} className="truncate text-[10px]">
                      <span className="text-amber-700 dark:text-amber-400">[{s.reason}] </span>
                      <span>{s.path}</span>
                    </div>
                  ))}
                  {coverage.skippedFiles.length > 4 && (
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 italic">
                      ...and {coverage.skippedFiles.length - 4} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
