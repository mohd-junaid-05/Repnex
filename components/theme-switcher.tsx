"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex gap-1 bg-zinc-100 dark:bg-zinc-800/80 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 h-7 w-[154px] animate-pulse" />
    );
  }

  return (
    <div className="flex items-center bg-zinc-100 dark:bg-zinc-900 p-0.5 rounded-md border border-zinc-200 dark:border-zinc-800 text-xs">
      <button
        type="button"
        onClick={() => setTheme("light")}
        className={`px-2.5 py-1 font-mono rounded transition-colors cursor-pointer ${
          theme === "light"
            ? "bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-zinc-100 font-semibold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("system")}
        className={`px-2.5 py-1 font-mono rounded transition-colors cursor-pointer ${
          theme === "system"
            ? "bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-zinc-100 font-semibold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        System
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        className={`px-2.5 py-1 font-mono rounded transition-colors cursor-pointer ${
          theme === "dark"
            ? "bg-white dark:bg-zinc-800 shadow-xs text-zinc-900 dark:text-zinc-100 font-semibold"
            : "text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
