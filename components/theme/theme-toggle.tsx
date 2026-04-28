"use client";

import { useEffect, useState } from "react";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ecopest-theme";

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;

  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const nextTheme = theme === "dark" ? "light" : "dark";

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.classList.contains("dark") ? "dark" : "light";

    setTheme(currentTheme);
  }, []);

  return (
    <button
      className={cn(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:hover:bg-slate-800",
        className,
      )}
      onClick={() => {
        applyTheme(nextTheme);
        setTheme(nextTheme);
      }}
      type="button"
    >
      <span
        aria-hidden="true"
        className={cn("h-2.5 w-2.5 rounded-full", theme === "dark" ? "bg-amber-400" : "bg-slate-900")}
      />
      {theme === "dark" ? i18n.theme.light : i18n.theme.dark}
    </button>
  );
}
