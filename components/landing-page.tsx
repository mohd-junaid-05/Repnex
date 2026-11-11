import React from "react";
import { LandingHeroForm } from "./landing-hero-form";
import { LandingHeroHeadline } from "./landing-hero-headline";
import { RepnexLogo } from "./repnex-logo";
import {
  HeroFigure,
  WhatItDoesFigure,
  HowItWorksFigure,
  FrameworksFigure,
  BoundariesFigure,
} from "./landing-illustrations";

/**
 * Landing page meeting all Phase 13 specifications:
 * - One content column, capped around 1140px, centred, 24px gutter.
 * - Hero takes most of first screen with active repository submission.
 * - Generous vertical padding on every subsequent section (8rem).
 * - Tight leading (~1.1) and negative letter-spacing on headings.
 * - Measure-capped paragraphs: ~46ch beside figures, ~64ch across full width.
 * - Wide column gaps (5rem = 80px).
 * - Inline unlabelled SVG illustrations using product canvas color tokens.
 * - Sections: Hero, What it does, How it works, Framework adapters, Deliberate omissions, Quiet footer.
 */
export function LandingPage() {
  return (
    <div className="w-full bg-zinc-100/60 dark:bg-black text-zinc-900 dark:text-zinc-100 flex flex-col font-sans overflow-x-hidden min-h-screen">
      <div className="w-full max-w-[1140px] mx-auto bg-white dark:bg-zinc-950 border-x border-zinc-200 dark:border-zinc-800/80 shadow-xs flex flex-col">
        {/* ---------------- 1. HERO SECTION ---------------- */}
        <section className="w-full min-h-[calc(100vh-3rem)] flex flex-col justify-center py-16 md:py-24">
          <div className="w-full px-6 md:px-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
              {/* Left: Headline & Repository input */}
              <div className="lg:col-span-6 flex flex-col items-start">
                <div className="flex items-center gap-2 mb-4 font-mono text-xs text-zinc-500 dark:text-zinc-400">
                  <span>Codebase Architecture</span>
                  <span className="text-zinc-300 dark:text-zinc-700">·</span>
                  <span>AST Graph</span>
                </div>

                <LandingHeroHeadline />

                <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-8">
                  A dependency map of your TypeScript or JavaScript repository. Folders fold into boxes, imports become directional lines. Everything on screen comes from real code parsing.
                </p>

                <div className="w-full max-w-[480px]">
                  <LandingHeroForm />
                </div>
              </div>

              {/* Right: Inline SVG Canvas Illustration */}
              <div className="lg:col-span-6 w-full">
                <HeroFigure />
              </div>
            </div>
          </div>
        </section>

      {/* ---------------- 2. WHAT IT DOES ---------------- */}
      <section className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-24 md:py-32">
        <div className="w-full max-w-[1140px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            {/* Left: Text column */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                01 / Graph Resolution
              </span>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-[1.12] text-zinc-900 dark:text-zinc-100 mb-6">
                Real dependencies, not a directory tree.
              </h2>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                Folders fold into compact boxes and expand into individual files. Every line on screen connects an import to a real file on disk. Unresolved paths are reported with their reason, never approximated.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                Select any file to see what it imports and what depends on it. Instant blast radius and dependency chains calculate two levels out directly in memory, with zero database queries.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                When you ask for an explanation, the prompt is constructed exclusively from that file and its real graph neighbors.
              </p>
            </div>

            {/* Right: SVG Figure */}
            <div className="lg:col-span-7 w-full">
              <WhatItDoesFigure />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 3. HOW IT WORKS ---------------- */}
      <section className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-24 md:py-32">
        <div className="w-full max-w-[1140px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            {/* Left: SVG Figure */}
            <div className="lg:col-span-7 order-2 lg:order-1 w-full">
              <HowItWorksFigure />
            </div>

            {/* Right: Text column */}
            <div className="lg:col-span-5 order-1 lg:order-2 flex flex-col items-start">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                02 / Standalone Pipeline
              </span>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-[1.12] text-zinc-900 dark:text-zinc-100 mb-6">
                Compiler ASTs. Pure math. Traced runs.
              </h2>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                A standalone parser walks the repository without loading web frameworks or databases. It resolves ESM imports, re-exports, dynamic imports, and CommonJS require() calls using TypeScript compiler syntax trees.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                Graph metrics are pure functions over the file list and edge list. Fan-in, fan-out, circular references, and impact chains update instantaneously.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                AI calls run through a single wrapped client pinned to verified model checkpoints. Every call is traced with LangSmith and cached on content hash.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 4. FRAMEWORK ADAPTERS ---------------- */}
      <section className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-24 md:py-32">
        <div className="w-full max-w-[1140px] mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-center">
            {/* Left: Text column */}
            <div className="lg:col-span-5 flex flex-col items-start">
              <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3">
                03 / Framework Knowledge
              </span>

              <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-[1.12] text-zinc-900 dark:text-zinc-100 mb-6">
                Framework knowledge kept outside the parser.
              </h2>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                Knowing that a file in a particular location is a page is Next.js knowledge, not parser knowledge. Adapters inspect conventions without polluting core AST resolution.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch] mb-4">
                Next.js adapters map App and Pages router structures, server actions, and HTTP endpoints. NestJS inspects decorators for exact controllers and services. Express classifies routes, controllers, middleware, and models.
              </p>

              <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                Route tables follow an exact-or-absent rule: if both HTTP method and full path cannot be recovered cleanly from syntax, we emit none.
              </p>
            </div>

            {/* Right: SVG Figure */}
            <div className="lg:col-span-7 w-full">
              <FrameworksFigure />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 5. WHAT IT DELIBERATELY DOESN'T DO ---------------- */}
      <section className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-24 md:py-32">
        <div className="w-full max-w-[1140px] mx-auto px-6">
          {/* Header across full width */}
          <div className="mb-14">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400 dark:text-zinc-500 mb-3 block">
              04 / Deliberate Boundaries
            </span>

            <h2 className="text-2xl sm:text-3xl md:text-4xl font-semibold tracking-tight leading-[1.12] text-zinc-900 dark:text-zinc-100 mb-4">
              What we deliberately don&apos;t do.
            </h2>

            <p className="text-sm sm:text-base leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[64ch]">
              The easiest way to ruin a developer tool is to present guesses as facts. These boundaries are non-negotiable architectural commitments.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-20 items-start">
            {/* List of 5 commitments */}
            <div className="lg:col-span-6 flex flex-col divide-y divide-zinc-200 dark:divide-zinc-800/80">
              <div className="py-6 first:pt-0 group hover:translate-x-1 transition-transform duration-150">
                <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">01</span>
                  <span>/</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold font-mono">No scores, grades, or severity badges</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                  This tool explains a codebase; it does not grade one. The moment there is a score, people argue with the number instead of reading the map.
                </p>
              </div>

              <div className="py-6 group hover:translate-x-1 transition-transform duration-150">
                <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">02</span>
                  <span>/</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold font-mono">No model-guessed connections</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                  If an import cannot be resolved to a real file on disk, it is marked unresolved with a reason, never filled in by an LLM. An edge exists because syntax connects two files. Absent beats approximate.
                </p>
              </div>

              <div className="py-6 group hover:translate-x-1 transition-transform duration-150">
                <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">03</span>
                  <span>/</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold font-mono">No private repository token storage</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                  Sign-in provides identity only. We never request repository read or write OAuth scopes and never store GitHub access tokens. Public repositories only.
                </p>
              </div>

              <div className="py-6 group hover:translate-x-1 transition-transform duration-150">
                <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">04</span>
                  <span>/</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold font-mono">No approximate or inferred routes</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                  If both the HTTP method and full path pattern cannot be recovered from syntax, we emit none. A wrong route is the exact same failure as an invented edge.
                </p>
              </div>

              <div className="py-6 last:pb-0 group hover:translate-x-1 transition-transform duration-150">
                <div className="flex items-center gap-2 mb-1.5 font-mono text-xs text-zinc-400 dark:text-zinc-500">
                  <span className="group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">05</span>
                  <span>/</span>
                  <span className="text-zinc-900 dark:text-zinc-200 font-semibold font-mono">No languages beyond TypeScript and JavaScript</span>
                </div>
                <p className="text-xs sm:text-sm leading-relaxed text-zinc-600 dark:text-zinc-400 max-w-[46ch]">
                  Not because other ecosystems are hard, but because getting import resolution, barrel files, and framework conventions genuinely right for one ecosystem is the entire proposition.
                </p>
              </div>
            </div>

            {/* Boundary Illustration */}
            <div className="lg:col-span-6 w-full">
              <BoundariesFigure />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- 6. QUIET FOOTER ---------------- */}
      <footer className="w-full border-t border-zinc-200 dark:border-zinc-800/80 py-12 md:py-16">
        <div className="w-full max-w-[1140px] mx-auto px-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <RepnexLogo
                size={18}
                showText
                textClassName="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-100"
              />
              <span className="text-xs text-zinc-400 dark:text-zinc-500 ml-2 font-mono">
                &mdash; Parsed from real code. Traced with LangSmith.
              </span>
            </div>

            <div className="text-xs font-mono text-zinc-400 dark:text-zinc-500">
              TypeScript / JavaScript / Next.js / NestJS / Express
            </div>
          </div>
        </div>
      </footer>

      {/* SEO Structured Data (JSON-LD) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "SoftwareApplication",
            "name": "Repnex",
            "applicationCategory": "DeveloperApplication",
            "operatingSystem": "Web",
            "url": "https://repnex.com",
            "logo": "https://repnex.com/logo.png",
            "image": "https://repnex.com/og.png",
            "description":
              "Interactive AST-parsed dependency maps for TypeScript and JavaScript repositories. Real code parsing with zero hallucinated edges.",
            "offers": {
              "@type": "Offer",
              "price": "0",
              "priceCurrency": "USD",
            },
            "featureList": [
              "AST Codebase Architecture Mapping",
              "Directional Dependency Graph",
              "Architectural Clustering & Folding",
              "Blast Radius Computation",
              "AI Explanations Traced with LangSmith",
            ],
          }),
        }}
      />
      </div>
    </div>
  );
}

