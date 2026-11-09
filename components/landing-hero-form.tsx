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
        sessionStorage.setItem("repnex_pending_repo", trimmed);
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
        <div className="flex items-center border border-zinc-300 dark:border-zinc-700 bg-zinc-50/70 dark:bg-zinc-900/70 rounded-lg p-1.5 pl-3.5 focus-within:ring-1 focus-within:ring-zinc-400 dark:focus-within:ring-zinc-500 focus-within:border-zinc-400 dark:focus-within:border-zinc-500 transition-colors shadow-xs">
          <svg
            className="w-4 h-4 text-zinc-400 dark:text-zinc-500 shrink-0 mr-2"
            viewBox="0 0 16 16"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5v-9Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8V1.5Z" />
          </svg>
          <input
            type="text"
            value={repoUrl}
            onChange={(e) => {
              setRepoUrl(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            placeholder="https://github.com/owner/repository or owner/repo"
            disabled={isSubmitting}
            className="min-w-0 flex-1 bg-transparent border-0 text-xs font-mono text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-0"
          />
          <button
            type="submit"
            disabled={isSubmitting || !repoUrl.trim()}
            className="px-3.5 py-1.5 bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-950 hover:bg-zinc-800 dark:hover:bg-zinc-200 rounded-md text-xs font-medium cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed shrink-0 flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <span>Preparing...</span>
            ) : (
              <>
                <span>Map repository</span>
                <span className="text-[10px] font-mono opacity-50">&rarr;</span>
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
      <div className="mt-2.5 flex items-center gap-1.5 flex-wrap text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        <span>Try:</span>
        {["facebook/react", "vercel/next.js", "expressjs/express"].map((sample) => (
          <button
            key={sample}
            type="button"
            onClick={() => {
              setRepoUrl(`https://github.com/${sample}`);
              setErrorMessage(null);
            }}
            className="px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800/80 hover:bg-zinc-200 dark:hover:bg-zinc-700/80 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer border border-zinc-200 dark:border-zinc-700/60"
          >
            {sample}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] font-mono text-zinc-400 dark:text-zinc-500">
        Public TypeScript and JavaScript repositories. Identity-only sign-in; no token storage.
      </p>
    </div>
  );
}

