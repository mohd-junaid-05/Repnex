"use client";

import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className="flex gap-2 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-md border border-zinc-200 dark:border-zinc-800">
      <button
        onClick={() => setTheme("light")}
        className={`px-3 py-1 text-sm rounded ${
          theme === "light"
            ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white"
            : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
        }`}
      >
        Light
      </button>
      <button
        onClick={() => setTheme("system")}
        className={`px-3 py-1 text-sm rounded ${
          theme === "system"
            ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white"
            : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
        }`}
      >
        System
      </button>
      <button
        onClick={() => setTheme("dark")}
        className={`px-3 py-1 text-sm rounded ${
          theme === "dark"
            ? "bg-white dark:bg-zinc-800 shadow-sm text-black dark:text-white"
            : "text-zinc-600 dark:text-zinc-400 hover:text-black dark:hover:text-white"
        }`}
      >
        Dark
      </button>
    </div>
  );
}
