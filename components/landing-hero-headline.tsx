"use client";

import React, { useState, useEffect } from "react";

const WORDS = ["shape", "imports", "blast radius", "architecture"];

export function LandingHeroHeadline() {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % WORDS.length);
        setFade(true);
      }, 250);
    }, 2800);

    return () => clearInterval(interval);
  }, []);

  return (
    <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.25rem] font-semibold tracking-tight leading-[1.08] text-zinc-900 dark:text-zinc-100 mb-6">
      See the{" "}
      <span
        className={`inline-block underline decoration-zinc-400 dark:decoration-zinc-600 underline-offset-8 decoration-2 transition-opacity duration-200 ${
          fade ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-1"
        }`}
      >
        {WORDS[index]}
      </span>{" "}
      of your codebase.
    </h1>
  );
}
