"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSupabase } from "@/lib/client-supabase";

// Status badge colours — colour carries meaning, nothing else does.
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-zinc-100 text-zinc-600 dark:bg-zinc-800/80 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60",
  running:  "bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60",
  complete: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60",
  failed:   "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60",
  stale:    "bg-zinc-100 text-zinc-500 dark:bg-zinc-800/60 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700/60",
};

export type Project = {
  name: string;
  repo_url: string;
};

export type Analysis = {
  id: string;
  status: string;
  stage?: string | null;
  created_at: string;
  started_at: string | null;
  finished_at: string | null;
  projects: Project | Project[] | null;
};

/** Normalize a joined project relation to its first project, or null if absent. */
function firstProject(p: Project | Project[] | null): Project | null {
  if (!p) return null;
  return Array.isArray(p) ? (p[0] ?? null) : p;
}

/** Format a creation timestamp as elapsed minutes, hours, or days from now. */
function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/** Check if an in-progress analysis is stale (>5 minutes old). */
function isAnalysisStale(analysis: Analysis): boolean {
  if (analysis.status !== "running" && analysis.status !== "pending") {
    return false;
  }
  const time = analysis.started_at || analysis.created_at;
  const elapsedMs = Date.now() - new Date(time).getTime();
  return elapsedMs > 5 * 60 * 1000;
}

/** Render project names, analysis ages, live statuses, and handle real-time stage updates. */
export function AnalysesList({ analyses: initialAnalyses }: { analyses: Analysis[] }) {
  const [liveUpdates, setLiveUpdates] = useState<
    Record<string, { status: string; stage?: string | null }>
  >({});
  const { getToken } = useAuth();
  const supabase = useSupabase();

  const analyses = initialAnalyses.map((item) => {
    const update = liveUpdates[item.id];
    if (update) {
      return {
        ...item,
        status: update.status,
        stage: update.stage !== undefined ? update.stage : item.stage,
      };
    }
    return item;
  });

  // Subscribe to realtime broadcasts for active analyses so multiple tabs update live
  useEffect(() => {
    const activeAnalyses = initialAnalyses.filter(
      (a) => a.status === "running" || a.status === "pending"
    );

    if (activeAnalyses.length === 0) return;

    const channels: ReturnType<typeof supabase.channel>[] = [];

    const setupSubscriptions = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (token) {
          await supabase.realtime.setAuth(token);
        }

        for (const analysis of activeAnalyses) {
          const ch = supabase.channel(`analysis:${analysis.id}`, {
            config: {
              private: true,
              broadcast: {
                replay: {
                  since: Date.now() - 60000,
                  limit: 10,
                },
              },
            },
          });

          ch.on(
            "broadcast",
            { event: "stage_change" },
            (payload: {
              payload: {
                analysis_id: string;
                status: string;
                stage: string;
                error_message?: string | null;
              };
            }) => {
              const data = payload.payload;
              setLiveUpdates((prev) => ({
                ...prev,
                [data.analysis_id]: {
                  status: data.status,
                  stage: data.stage,
                },
              }));
            }
          ).subscribe();

          channels.push(ch);
        }
      } catch (err) {
        console.error("[realtime] Failed to subscribe to active analyses:", err);
      }
    };

    setupSubscriptions();

    return () => {
      for (const ch of channels) {
        supabase.removeChannel(ch);
      }
    };
  }, [initialAnalyses, getToken, supabase]);

  if (analyses.length === 0) {
    return (
      <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg p-8 text-center bg-white dark:bg-zinc-900 shadow-xs">
        <p className="text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300">
          No analyses recorded yet for this organization.
        </p>
        <p className="text-xs text-zinc-400 dark:text-zinc-500 font-sans mt-1">
          Paste a repository URL in the form above to generate an AST dependency graph.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg divide-y divide-zinc-200/70 dark:divide-zinc-800/70 bg-white dark:bg-zinc-900 overflow-hidden shadow-xs">
      {analyses.map((analysis) => {
        const project = firstProject(analysis.projects);
        const isStale = isAnalysisStale(analysis);
        const displayStatus = isStale ? "stale" : analysis.status;
        const displayStage = !isStale && analysis.status === "running" && analysis.stage ? ` (${analysis.stage})` : "";

        return (
          <Link
            key={analysis.id}
            href={`/analysis/${analysis.id}`}
            className="flex items-center justify-between px-4 py-3 gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors group"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-xs font-mono font-semibold text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                {project?.name ?? "Unknown project"}
              </span>
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500 truncate">
                {project?.repo_url ?? ""}
              </span>
            </div>

            <div className="flex items-center gap-3.5 shrink-0">
              <span className="text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
                {formatRelative(analysis.created_at)}
              </span>
              <span
                className={`text-[11px] font-mono px-2 py-0.5 rounded ${
                  STATUS_STYLES[displayStatus] ?? STATUS_STYLES.pending
                }`}
              >
                {displayStatus}{displayStage}
              </span>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
