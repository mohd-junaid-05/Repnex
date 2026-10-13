"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useSupabase } from "@/lib/client-supabase";
import Link from "next/link";

interface AnalysisProgressProps {
  initialAnalysis: {
    id: string;
    status: string;
    stage: string;
    repoUrl: string;
    projectName: string;
    errorMessage: string | null;
  };
}

const STAGES = [
  {
    key: "fetching",
    label: "Fetching repository archive",
    desc: "Downloading public archive and resolving commit metadata",
  },
  {
    key: "parsing",
    label: "Parsing syntax and dependency graph",
    desc: "Extracting imports, exports, and file relationships via ts-morph",
  },
  {
    key: "storing",
    label: "Storing graph and coverage metrics",
    desc: "Persisting files, edges, and insights to Postgres",
  },
  {
    key: "complete",
    label: "Complete",
    desc: "Repository mapped and ready to explore",
  },
];

export function AnalysisProgress({ initialAnalysis }: AnalysisProgressProps) {
  const [status, setStatus] = useState(initialAnalysis.status);
  const [stage, setStage] = useState(initialAnalysis.stage || "fetching");
  const [errorMessage, setErrorMessage] = useState(initialAnalysis.errorMessage);
  const [isRetrying, setIsRetrying] = useState(false);

  const router = useRouter();
  const { getToken } = useAuth();
  const supabase = useSupabase();

  // If initial status is complete, reload to show map
  useEffect(() => {
    if (status === "complete") {
      router.refresh();
    }
  }, [status, router]);

  // Subscribe to Realtime private channel for stage updates
  useEffect(() => {
    if (status === "complete" || status === "failed") return;

    let channel: ReturnType<typeof supabase.channel> | null = null;

    const setupSubscription = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (token) {
          await supabase.realtime.setAuth(token);
        }

        channel = supabase.channel(`analysis:${initialAnalysis.id}`, {
          config: { private: true },
        });

        channel
          .on(
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
              if (data.status) setStatus(data.status);
              if (data.stage) setStage(data.stage);
              if (data.error_message) setErrorMessage(data.error_message);

              if (data.status === "complete") {
                // Refresh server page to load the completed explorer view
                setTimeout(() => {
                  router.refresh();
                }, 500);
              }
            }
          )
          .subscribe();
      } catch (err) {
        console.error("[realtime] Failed to subscribe to analysis channel:", err);
      }
    };

    setupSubscription();

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [initialAnalysis.id, status, getToken, supabase, router]);

  const handleRetry = async () => {
    setIsRetrying(true);
    setErrorMessage(null);
    setStatus("running");
    setStage("fetching");

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          repoUrl: initialAnalysis.repoUrl,
          forceRerun: true,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Retry failed");

      if (data.analysisId !== initialAnalysis.id) {
        router.push(`/analysis/${data.analysisId}`);
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Retry failed");
      setStatus("failed");
    } finally {
      setIsRetrying(false);
    }
  };

  const getStageIndex = (key: string) => {
    return STAGES.findIndex((s) => s.key === key);
  };

  const currentIdx = getStageIndex(stage);

  return (
    <div className="flex flex-col flex-1 items-center justify-center p-6 bg-zinc-50 dark:bg-black font-sans">
      <div className="w-full max-w-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-[#0c0d14] rounded-lg p-6 flex flex-col gap-6 shadow-xs">
        {/* Header */}
        <div className="flex flex-col gap-1 border-b border-zinc-100 dark:border-zinc-800/80 pb-4">
          <div className="flex items-center justify-between">
            <Link
              href="/"
              className="text-xs font-mono text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-colors"
            >
              ← Back to dashboard
            </Link>
            <span
              className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                status === "failed"
                  ? "bg-red-50 text-red-600 dark:bg-red-950 dark:text-red-400"
                  : status === "complete"
                  ? "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-400"
              }`}
            >
              {status}
            </span>
          </div>

          <h1 className="text-lg font-semibold text-black dark:text-white mt-2 truncate">
            {initialAnalysis.projectName}
          </h1>
          <p className="text-xs font-mono text-zinc-400 dark:text-zinc-500 truncate">
            {initialAnalysis.repoUrl}
          </p>
        </div>

        {/* Stages list */}
        <div className="flex flex-col gap-4">
          {STAGES.map((s, idx) => {
            const isPassed = status === "complete" || (status !== "failed" && currentIdx > idx);
            const isCurrent = status !== "complete" && status !== "failed" && currentIdx === idx;
            const isFailedStage = status === "failed" && currentIdx === idx;

            return (
              <div
                key={s.key}
                className={`flex items-start gap-3.5 p-3 rounded-md transition-colors ${
                  isCurrent
                    ? "bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200/50 dark:border-blue-900/40"
                    : isFailedStage
                    ? "bg-red-50/50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-900/40"
                    : "border border-transparent"
                }`}
              >
                <div className="mt-0.5 flex items-center justify-center w-5 h-5 rounded-full text-xs shrink-0 font-mono">
                  {isPassed ? (
                    <span className="text-emerald-600 dark:text-emerald-400 font-bold">✓</span>
                  ) : isFailedStage ? (
                    <span className="text-red-600 dark:text-red-400 font-bold">✕</span>
                  ) : isCurrent ? (
                    <span className="w-2 h-2 rounded-full bg-blue-600 dark:bg-blue-400" />
                  ) : (
                    <span className="text-zinc-300 dark:text-zinc-700">{idx + 1}</span>
                  )}
                </div>

                <div className="flex flex-col gap-0.5 min-w-0">
                  <span
                    className={`text-xs font-medium truncate ${
                      isPassed
                        ? "text-zinc-900 dark:text-zinc-100"
                        : isCurrent
                        ? "text-blue-600 dark:text-blue-400 font-semibold"
                        : isFailedStage
                        ? "text-red-600 dark:text-red-400 font-semibold"
                        : "text-zinc-400 dark:text-zinc-600"
                    }`}
                  >
                    {s.label}
                  </span>
                  <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-mono">
                    {s.desc}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Failure Details & Actions */}
        {status === "failed" && (
          <div className="flex flex-col gap-3 border-t border-zinc-100 dark:border-zinc-800 pt-4">
            <div className="p-3 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-md">
              <p className="text-xs font-semibold text-red-700 dark:text-red-400">
                Analysis failed in stage: {stage}
              </p>
              {errorMessage && (
                <p className="text-xs font-mono text-red-600 dark:text-red-300 mt-1 break-words">
                  {errorMessage}
                </p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleRetry}
                disabled={isRetrying}
                className="px-4 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded text-xs font-medium cursor-pointer transition-colors disabled:opacity-50"
              >
                {isRetrying ? "Retrying..." : "Retry analysis"}
              </button>
              <Link
                href="/"
                className="text-xs font-mono text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
              >
                Return to dashboard
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
