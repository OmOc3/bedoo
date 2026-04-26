import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { LogoMarkSvg } from "@/components/layout/logo";

interface BrandProps {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ className, inverse = false }: Omit<BrandProps, "compact">) {
  return (
    <div
      className={cn(
        "grid h-12 w-12 place-items-center rounded-2xl border shadow-control",
        inverse
          ? "border-slate-700 bg-slate-900 text-white"
          : "border-teal-100 bg-teal-50 text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-300",
        className,
      )}
      aria-hidden="true"
    >
      <LogoMarkSvg className="h-9 w-9" title={i18n.appName} />
    </div>
  );
}

export function BrandLockup({ className, compact = false, inverse = false }: BrandProps) {
  const titleClassName = inverse ? "text-white" : "text-slate-900 dark:text-slate-50";
  const subtitleClassName = inverse ? "text-slate-400" : "text-slate-500 dark:text-slate-400";

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <BrandMark inverse={inverse} />
      <div className="min-w-0">
        <p className={cn("text-sm font-bold leading-5", titleClassName)}>
          {i18n.appNameArabic}
          <span className="me-2 text-xs font-medium uppercase tracking-[0.08em] text-teal-600 dark:text-teal-400">
            {i18n.appName}
          </span>
        </p>
        {!compact ? <p className={cn("text-sm leading-6", subtitleClassName)}>{i18n.brandTagline}</p> : null}
      </div>
    </div>
  );
}
