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
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        {backHref ? (
          <Link
            className="mb-3 inline-flex text-sm font-semibold text-slate-500 transition-colors hover:text-slate-900"
            href={backHref}
          >
            {backLabel}
          </Link>
        ) : null}
        <h1 className="text-3xl font-extrabold leading-tight text-slate-950">{title}</h1>
        {description ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}
