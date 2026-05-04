"use client";

import { useRouter } from "next/navigation";
import { startTransition } from "react";
import { setPreferredLocaleAction } from "@/app/actions/locale";
import { supportedLocales, type Locale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { useLanguage } from "./language-provider";

const localeCodes: Record<Locale, string> = {
  ar: "AR",
  en: "EN",
};

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden className={className} fill="none" stroke="currentColor" strokeWidth="1.75" viewBox="0 0 24 24">
      <path
        d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 0 1 4 9 15.3 15.3 0 0 1-4 9 15.3 15.3 0 0 1-4-9 15.3 15.3 0 0 1 4-9Z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

interface LanguageSwitcherProps {
  className?: string;
  placement?: "floating" | "inline";
}

export function LanguageSwitcher({ className, placement = "floating" }: LanguageSwitcherProps = {}) {
  const router = useRouter();
  const { direction, locale, messages, setLocale } = useLanguage();
  const isRtl = direction === "rtl";
  const isFloating = placement === "floating";

  async function handleLocaleChange(nextLocale: Locale): Promise<void> {
    if (nextLocale === locale) {
      return;
    }

    setLocale(nextLocale);
    await setPreferredLocaleAction(nextLocale);
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <div
      aria-label={messages.common.chooseLanguage}
      className={cn(
        "flex items-center gap-1.5 border px-1.5 py-1",
        isFloating
          ? "fixed top-3 z-[80] rounded-full border-[var(--border)] bg-[var(--surface)]/95 shadow-lg shadow-black/5 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--surface)]/80"
          : "rounded-xl border-[var(--sidebar-border)] bg-[var(--sidebar-surface)]",
        isFloating ? (isRtl ? "start-3 sm:start-5" : "end-3 sm:end-5") : null,
        className,
      )}
      data-no-translate
      role="group"
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center",
          isFloating
            ? "rounded-full bg-[var(--surface-subtle)] text-[var(--primary)]"
            : "rounded-lg bg-[var(--sidebar)] text-[var(--sidebar-text)]",
        )}
      >
        <GlobeIcon className="h-4 w-4" />
      </span>
      <div
        className={cn(
          "flex overflow-hidden p-0.5",
          isFloating ? "rounded-full bg-[var(--surface-subtle)]" : "rounded-lg bg-[var(--sidebar)]",
        )}
      >
        {supportedLocales.map((localeOption) => {
          const isActive = localeOption === locale;

          const label =
            localeOption === "ar" ? messages.common.languageArabic : messages.common.languageEnglish;

          return (
            <button
              aria-label={label}
              aria-pressed={isActive}
              className={cn(
                "min-h-8 min-w-[2.75rem] rounded-full px-2.5 text-xs font-bold transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
                isActive
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm"
                  : isFloating
                    ? "text-[var(--muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
              )}
              key={localeOption}
              onClick={() => {
                void handleLocaleChange(localeOption);
              }}
              title={label}
              type="button"
            >
              {localeCodes[localeOption]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
