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
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:border-[color-mix(in_srgb,var(--border)_60%,var(--foreground)_40%)] hover:bg-[var(--surface-subtle)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
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
        className={cn("h-2.5 w-2.5 rounded-full", theme === "dark" ? "bg-amber-400" : "bg-[var(--foreground)]")}
      />
      {theme === "dark" ? i18n.theme.light : i18n.theme.dark}
    </button>
  );
}
