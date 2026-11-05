"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";

export function LandingHeroForm() {
  const [repoUrl, setRepoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const router = useRouter();
  const { isSignedIn } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let trimmed = repoUrl.trim();
    if (!trimmed) {
      setErrorMessage("Enter a repository URL or owner/repo.");
      return;
    }

    // Auto-prefix shorthand owner/repo to full GitHub URL
    if (/^[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+$/.test(trimmed)) {
      trimmed = `https://github.com/${trimmed}`;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      if (typeof window !== "undefined") {
        sessionStorage.setItem("cartograph_pending_repo", trimmed);
      }

      if (isSignedIn) {
        // If already authenticated, submit straight to analysis pipeline
        const res = await fetch("/api/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ repoUrl: trimmed }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Failed to submit repository");
        }
        router.push(`/analysis/${data.analysisId}`);
        return;
      }

      // If signed out, redirect straight to sign-in with return URL
      const returnTarget = `/?repoUrl=${encodeURIComponent(trimmed)}`;
      router.push(`/sign-in?redirect_url=${encodeURIComponent(returnTarget)}`);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Failed to initiate repository analysis."
      );
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="https://github.com/owner/repository or owner/repo"
            disabled={isSubmitting}
            className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded px-3.5 py-2.5 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:focus:ring-indigo-400 disabled:opacity-50 transition-colors"
          />
          <button
            type="submit"
            disabled={isSubmitting || !repoUrl.trim()}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-xs font-mono font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center justify-center gap-1.5 shadow-xs"
          >
            {isSubmitting ? (
              <span>Preparing...</span>
            ) : (
              <>
                <span>Map repository</span>
                <span>&rarr;</span>
              </>
            )}
          </button>
        </div>
        {errorMessage && (
          <p className="text-xs font-mono text-rose-600 dark:text-rose-400">
            {errorMessage}
          </p>
        )}
      </form>
      <p className="mt-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        Public TypeScript and JavaScript repositories. Identity-only sign-in; no token storage.
      </p>
    </div>
  );
}

