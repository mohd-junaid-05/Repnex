"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export interface AnalysisFormProps {
  initialRepoUrl?: string;
  autoSubmit?: boolean;
}

export function AnalysisForm({ initialRepoUrl = "", autoSubmit = false }: AnalysisFormProps = {}) {
  const [repoUrl, setRepoUrl] = useState<string>(() => {
    if (initialRepoUrl) return initialRepoUrl;
    if (typeof window !== "undefined") {
      const pending = sessionStorage.getItem("cartograph_pending_repo");
      if (pending) {
        sessionStorage.removeItem("cartograph_pending_repo");
        return pending;
      }
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [existingAnalysis, setExistingAnalysis] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const router = useRouter();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRepoUrl(e.target.value);
    if (errorMessage) setErrorMessage(null);
    if (existingAnalysis) setExistingAnalysis(null);
  };

  const submitRepo = useCallback(async (targetUrl: string, isAuto = false) => {
    const trimmed = targetUrl.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setErrorMessage(null);
    setExistingAnalysis(null);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to submit repository");
      }

      if (data.isExisting) {
        if (isAuto) {
          router.push(`/analysis/${data.analysisId}`);
          return;
        }
        // Repository already exists in this account: do not parse again, show notification
        setExistingAnalysis({
          id: data.analysisId,
          name: data.projectName || trimmed,
        });
        setIsLoading(false);
        return;
      }

      // Navigate to the analysis page for new analysis
      router.push(`/analysis/${data.analysisId}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "An unexpected error occurred."
      );
      setIsLoading(false);
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRepo(repoUrl, false);
  };

  useEffect(() => {
    if (autoSubmit && repoUrl) {
      const timer = setTimeout(() => {
        submitRepo(repoUrl, true);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [autoSubmit, repoUrl, submitRepo]);

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={handleInputChange}
            placeholder="https://github.com/owner/repository or owner/repo"
            disabled={isLoading}
            className="flex-1 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-md px-3.5 py-2 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-400 dark:focus:ring-zinc-500 focus:border-zinc-400 dark:focus:border-zinc-500 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !repoUrl.trim()}
            className="px-4 py-2 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-md text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5"
          >
            {isLoading ? (
              <span>Starting...</span>
            ) : (
              <>
                <span>Map repository</span>
                <span className="text-zinc-400 dark:text-zinc-600">&rarr;</span>
              </>
            )}
          </button>
        </div>

        {existingAnalysis && (
          <div className="flex items-center justify-between p-2.5 rounded-md bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/25 dark:border-amber-500/35 text-xs font-mono text-amber-900 dark:text-amber-200 mt-1">
            <div className="flex items-center gap-2 min-w-0 mr-2">
              <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <span className="truncate">
                Repository already exists in this account: <strong className="font-semibold">{existingAnalysis.name}</strong>
              </span>
            </div>
            <Link
              href={`/analysis/${existingAnalysis.id}`}
              className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-sans font-medium transition-colors shrink-0 flex items-center gap-1"
            >
              <span>View analysis</span>
              <span>&rarr;</span>
            </Link>
          </div>
        )}

        {errorMessage && (
          <p className="text-xs font-mono text-rose-600 dark:text-rose-400 mt-0.5">
            {errorMessage}
          </p>
        )}
      </form>
    </div>
  );
}
