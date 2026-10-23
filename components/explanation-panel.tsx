"use client";

import { ExplanationView } from "@/components/explanation-view";

interface ExplanationPanelProps {
  targetKind: "file" | "folder" | "repo";
  targetLabel: string;
  explanation: { content: string; stale: boolean; cacheHit: boolean } | null;
  isLoading: boolean;
  errorText: string;
  fileSet: Set<string>;
  onSelectFile: (path: string) => void;
  onExplain: () => void;
  showRoleAssign: boolean;
  currentRoleLabel?: string;
  assigningRole: boolean;
  onAssignRole: () => void;
  onReanalyse?: () => void;
  isReanalysing: boolean;
  tracingConfigured: boolean;
}

/** The Explanation tab. Explain a file or a folded folder, cache-aware and stale-aware. */
export function ExplanationPanel({
  targetKind,
  targetLabel,
  explanation,
  isLoading,
  errorText,
  fileSet,
  onSelectFile,
  onExplain,
  showRoleAssign,
  currentRoleLabel,
  assigningRole,
  onAssignRole,
  onReanalyse,
  isReanalysing,
  tracingConfigured,
}: ExplanationPanelProps) {
  const explainAction = () => onExplain();

  return (
    <div className="flex flex-col gap-3">
      <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-lg border border-zinc-200 dark:border-zinc-800">
        <div className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 dark:text-zinc-500 mb-1">
          Target
        </div>
        <div className="font-mono text-xs text-zinc-900 dark:text-zinc-100 font-semibold break-all">
          {targetLabel}
        </div>
      </div>

      {targetKind === "repo" ? (
        <div className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed p-2 rounded-lg border border-dashed border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/20">
          Select a file or a folder, then click Explain to read what it does in the context of its real
          neighbours.
        </div>
      ) : isLoading ? (
        <div className="flex items-center gap-2 text-[11px] text-zinc-500 dark:text-zinc-400 p-2">
          <span className="w-3 h-3 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          Generating explanation…
        </div>
      ) : errorText ? (
        <div className="flex flex-col gap-2 p-2 rounded-lg border border-red-500/30 bg-red-500/5 text-[11px] text-red-600 dark:text-red-400">
          <span>{errorText}</span>
          <button
            type="button"
            onClick={explainAction}
            className="self-start px-2 py-0.5 rounded bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-600 dark:text-red-400 font-mono transition-colors cursor-pointer"
          >
            Retry
          </button>
        </div>
      ) : explanation ? (
        <div className="flex flex-col gap-2.5">
          {explanation.stale && (
            <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-amber-500/30 bg-amber-500/5 text-[11px] text-amber-700 dark:text-amber-400">
              <span className="font-medium">
                This analysis is stale. The repository has moved past the commit that was analysed.
              </span>
              {onReanalyse && (
                <button
                  type="button"
                  onClick={onReanalyse}
                  disabled={isReanalysing}
                  className="self-start px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 font-mono transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isReanalysing ? "Re-parsing…" : "Re-analyse"}
                </button>
              )}
            </div>
          )}
          <ExplanationView text={explanation.content} fileSet={fileSet} onSelectFile={onSelectFile} />
          <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500">
            <span>{explanation.cacheHit ? "Cached" : "Generated"} · {targetKind === "file" ? "file" : "folder"}</span>
            <button
              type="button"
              onClick={explainAction}
              className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-mono transition-colors cursor-pointer"
            >
              Explain again
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-relaxed">
            Ask the model to explain what this {targetKind} does in the context of its real neighbours.
          </p>
          <button
            type="button"
            onClick={explainAction}
            className="self-start px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            Explain
          </button>
        </div>
      )}
      {showRoleAssign && (
        <div className="flex flex-col gap-1.5 p-2 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/40 text-[11px]">
          <span className="text-zinc-500 dark:text-zinc-400">
            No adapter matched this file. Its role is currently{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {currentRoleLabel ?? "unidentified"}
            </span>.
          </span>
          <button
            type="button"
            onClick={onAssignRole}
            disabled={assigningRole}
            className="self-start px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 font-mono transition-colors cursor-pointer disabled:opacity-50"
          >
            {assigningRole ? "Assigning…" : "Suggest role"}
          </button>
        </div>
      )}

      {!tracingConfigured && (
        <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-relaxed">
          Tracing is not configured. Calls still work but won&apos;t appear in a tracing dashboard.
        </div>
      )}

    </div>
  );
}
