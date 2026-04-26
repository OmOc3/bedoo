import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLockup } from "@/components/layout/brand";

interface PageHeaderProps {
  action?: ReactNode;
  backHref?: string;
  backLabel?: string;
  description?: string;
  title: string;
}

export function PageHeader({ action, backHref, backLabel = "رجوع", description, title }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-control sm:flex-row sm:items-center sm:justify-between">
      <div>
        {backHref ? (
          <Link className="mb-2 inline-flex text-sm font-medium text-slate-500 hover:text-slate-900" href={backHref}>
            {backLabel}
          </Link>
        ) : null}
        <BrandLockup className="mb-4" compact />
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description ? <p className="mt-1 text-sm leading-6 text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  );
}
