"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "ecopest-theme";

function applyTheme(theme: "dark" | "light") {
  const root = document.documentElement;
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

interface ThemeIconToggleProps {
  className?: string;
}

export function ThemeIconToggle({ className }: ThemeIconToggleProps) {
  const [theme, setTheme] = useState<"dark" | "light">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const root = document.documentElement;
    const currentTheme = root.classList.contains("dark") ? "dark" : "light";
    setTheme(currentTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === "dark" ? "light" : "dark";
    applyTheme(nextTheme);
    setTheme(nextTheme);
  };

  // Prevent hydration mismatch - render placeholder while mounting
  if (!mounted) {
    return (
      <div
        className={cn(
          "h-10 w-10 rounded-full bg-[var(--surface-subtle)] animate-pulse",
          className
        )}
        aria-hidden="true"
      />
    );
  }

  const isDark = theme === "dark";
  const toggleThemeLabel = isDark ? "Switch to light mode" : "Switch to dark mode";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={toggleThemeLabel}
      title={toggleThemeLabel}
      className={cn(
        "group relative h-10 w-10 rounded-full bg-[var(--surface)] border border-[var(--border)]",
        "shadow-sm hover:shadow-md transition-all duration-300 ease-out",
        "hover:border-[var(--primary)]/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]",
        className
      )}
    >
      {/* Sun Icon */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring",
          isDark
            ? "opacity-0 rotate-90 scale-50"
            : "opacity-100 rotate-0 scale-100"
        )}
      >
        <svg
          className="h-5 w-5 text-amber-500"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      </span>

      {/* Moon Icon */}
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-all duration-500 ease-spring",
          isDark
            ? "opacity-100 rotate-0 scale-100"
            : "opacity-0 -rotate-90 scale-50"
        )}
      >
        <svg
          className="h-5 w-5 text-indigo-400"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      </span>

      {/* Glow effect on hover */}
      <span
        className={cn(
          "absolute inset-0 rounded-full transition-all duration-300",
          "opacity-0 group-hover:opacity-100",
          isDark
            ? "bg-indigo-500/10 shadow-[0_0_20px_rgba(99,102,241,0.3)]"
            : "bg-amber-500/10 shadow-[0_0_20px_rgba(245,158,11,0.3)]"
        )}
      />
    </button>
  );
}
