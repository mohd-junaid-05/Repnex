"use client";

export function LandingHeroHeadline() {
  return (
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold tracking-tight leading-[1.08] text-zinc-900 dark:text-zinc-100 mb-6">
      See the{" "}
      <span
        className="inline-block underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-8 decoration-2"
      >
        shape
      </span>{" "}
      of your codebase.
    </h1>
  );
}
