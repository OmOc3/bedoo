import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BrandProps {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ className, inverse = false }: Omit<BrandProps, "compact">) {
  return (
    <div
      className={cn(
        "brand-grid grid h-12 w-12 place-items-center rounded-2xl border text-lg font-extrabold shadow-control",
        inverse
          ? "border-slate-700 bg-slate-900 text-teal-300"
          : "border-teal-100 bg-teal-50 text-teal-700 dark:border-slate-700 dark:bg-slate-900 dark:text-teal-300",
        className,
      )}
      aria-hidden="true"
    >
      <span className="relative block">
        B
        <span className="absolute -start-1.5 -top-1.5 h-2.5 w-2.5 rounded-full bg-teal-500" />
      </span>
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
