"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
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
  const timeoutsRef = useRef<NodeJS.Timeout[]>([]);

  // When status reaches complete, reload into the canvas view
  useEffect(() => {
    if (status === "complete") {
      const timer = setTimeout(() => {
        router.refresh();
        window.location.reload();
      }, 700);
      return () => clearTimeout(timer);
    }
  }, [status, router]);

  // Clean up any pending stage animation timers on unmount
  useEffect(() => {
    return () => {
      timeoutsRef.current.forEach((t) => clearTimeout(t));
      timeoutsRef.current = [];
    };
  }, []);

  // Gracefully transition through any remaining stages so the user sees all steps complete
  const applyStageProgress = useCallback(
    (newStatus: string, newStage: string, errMessage?: string | null) => {
      if (newStatus === "failed") {
        timeoutsRef.current.forEach((t) => clearTimeout(t));
        timeoutsRef.current = [];
        setStatus("failed");
        if (newStage) setStage(newStage);
        if (errMessage) setErrorMessage(errMessage);
        return;
      }

      if (newStatus === "complete") {
        const stageKeys = ["fetching", "parsing", "storing", "complete"];
        setStage((currentStage) => {
          const startIdx = stageKeys.indexOf(currentStage);
          if (startIdx < 0 || startIdx >= 3) {
            setStatus("complete");
            return "complete";
          }

          // Step through skipped stages sequentially (300ms each)
          timeoutsRef.current.forEach((t) => clearTimeout(t));
          timeoutsRef.current = [];

          let delay = 0;
          for (let i = startIdx + 1; i < stageKeys.length; i++) {
            delay += 300;
            const nextKey = stageKeys[i];
            const t = setTimeout(() => {
              setStage(nextKey);
              if (nextKey === "complete") {
                setStatus("complete");
              }
            }, delay);
            timeoutsRef.current.push(t);
          }
          return currentStage;
        });
        return;
      }

      // Live intermediate stage update
      if (newStatus) setStatus(newStatus);
      if (newStage) setStage(newStage);
    },
    []
  );

  // Query server API for current analysis status
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/analyze/${initialAnalysis.id}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && data.status) {
        applyStageProgress(data.status, data.stage, data.error_message);
      }
    } catch (err) {
      console.warn("[analysis-progress] Status check error:", err);
    }
  }, [initialAnalysis.id, applyStageProgress]);

  // Subscribe to Realtime private channel and maintain liveness check
  useEffect(() => {
    if (status === "complete" || status === "failed") return;

    let isMounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    // 1. Check current database status on mount (deferred to avoid synchronous setState in effect)
    const initTimer = setTimeout(() => {
      if (isMounted) {
        checkStatus();
      }
    }, 0);

    // 2. Set up fallback check every 1500ms while running/pending
    const pollInterval = setInterval(() => {
      if (isMounted) {
        checkStatus();
      }
    }, 1500);

    // 3. Set up Realtime private channel subscription with replay
    const setupSubscription = async () => {
      try {
        const token = await getToken({ template: "supabase" });
        if (token && isMounted) {
          await supabase.realtime.setAuth(token);
        }

        if (!isMounted) return;

        channel = supabase.channel(`analysis:${initialAnalysis.id}`, {
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
              if (!isMounted) return;
              const data = payload.payload;
              applyStageProgress(data.status, data.stage, data.error_message);
            }
          )
          .subscribe((subStatus) => {
            if (subStatus === "SUBSCRIBED" && isMounted) {
              checkStatus();
            }
          });
      } catch (err) {
        console.error("[realtime] Failed to subscribe to analysis channel:", err);
      }
    };

    setupSubscription();

    return () => {
      isMounted = false;
      clearTimeout(initTimer);
      clearInterval(pollInterval);
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [initialAnalysis.id, status, getToken, supabase, checkStatus, applyStageProgress]);

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
