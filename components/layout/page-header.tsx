import Link from "next/link";
import type { ReactNode } from "react";

interface PageHeaderProps {
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  description?: string;
  title: string;
}

export function PageHeader({ action, backHref, backLabel = "رجوع", description, title }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-5 border-b border-[var(--border-subtle)] pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            className="mb-4 inline-flex text-sm font-semibold text-[var(--muted)] transition-colors hover:text-[var(--foreground)]"
            href={backHref}
          >
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-2xl font-bold leading-tight tracking-tight text-[var(--foreground)]">{title}</h1>
        {description ? <p className="mt-1 max-w-3xl text-sm leading-relaxed text-[var(--muted)]">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-3">{action}</div> : null}
    </div>
  );
}
