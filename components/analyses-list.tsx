"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useSupabase } from "@/lib/client-supabase";

// Status badge colours — colour carries meaning, nothing else does.
const STATUS_STYLES: Record<string, string> = {
  pending:  "bg-zinc-100 text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400",
  running:  "bg-blue-50  text-blue-600  dark:bg-blue-950  dark:text-blue-400",
  complete: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400",
  failed:   "bg-red-50   text-red-700   dark:bg-red-950   dark:text-red-400",
  stale:    "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-500 line-through-none",
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
      <div className="border border-dashed border-zinc-200 dark:border-zinc-800 rounded-md px-6 py-12 text-center">
        <p className="text-sm text-zinc-400 dark:text-zinc-600 font-mono">
          No analyses yet for this organization.
        </p>
        <p className="text-xs text-zinc-300 dark:text-zinc-700 font-mono mt-1">
          Paste a repository URL above to generate your first dependency map.
        </p>
      </div>
    );
  }

  return (
    <div className="border border-zinc-200 dark:border-zinc-800 rounded-md divide-y divide-zinc-100 dark:divide-zinc-900 bg-white dark:bg-[#0c0d14]">
      {analyses.map((analysis) => {
        const project = firstProject(analysis.projects);
        const isStale = isAnalysisStale(analysis);
        const displayStatus = isStale ? "stale" : analysis.status;
        const displayStage = !isStale && analysis.status === "running" && analysis.stage ? ` (${analysis.stage})` : "";

        return (
          <Link
            key={analysis.id}
            href={`/analysis/${analysis.id}`}
            className="flex items-center justify-between px-4 py-3 gap-4 hover:bg-zinc-50 dark:hover:bg-zinc-900/60 transition-colors"
          >
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-sm font-medium text-black dark:text-white truncate">
                {project?.name ?? "Unknown project"}
              </span>
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600 truncate">
                {project?.repo_url ?? ""}
              </span>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <span className="text-xs font-mono text-zinc-400 dark:text-zinc-600">
                {formatRelative(analysis.created_at)}
              </span>
              <span
                className={`text-xs font-mono px-2 py-0.5 rounded-full ${
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
