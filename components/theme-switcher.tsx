"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

/** Offer light, system, and dark themes after mounting to avoid hydration mismatches. */
export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex items-center bg-zinc-100/80 dark:bg-zinc-900/80 p-0.5 rounded border border-zinc-200 dark:border-zinc-800 h-7 w-[148px]" />
    );
  }

  return (
    <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded border border-zinc-200 dark:border-zinc-800 text-[11px] font-mono select-none">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
          theme === "light"
            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
          theme === "system"
            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
      >
        System
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-2 py-0.5 rounded transition-colors cursor-pointer ${
          theme === "dark"
            ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 font-medium shadow-xs"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
