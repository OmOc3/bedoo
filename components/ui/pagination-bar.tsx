import Link from "next/link";
import { buildPaginationItems } from "@/lib/pagination/numeric-pages";

export interface PaginationBarProps {
  currentPage: number;
  totalPages: number;
  buildHref: (page: number) => string;
}

/**
 * شريط ترقيم LTR: أكبر رقم صفحة على اليسار وأصغرها على اليمين (مثل النمط الشائع في لوحات RTL).
 */
export function PaginationBar({ currentPage, totalPages, buildHref }: PaginationBarProps) {
  if (totalPages <= 1) {
    return null;
  }

  const ascendingItems = buildPaginationItems(currentPage, totalPages, 2);
  const displayItems = ascendingItems.slice().reverse();

  const prevDisabled = currentPage <= 1;
  const nextDisabled = currentPage >= totalPages;

  const inactivePageClass =
    "inline-flex min-h-9 min-w-9 max-w-full items-center justify-center border-s border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium text-[var(--primary)] hover:bg-[var(--surface-subtle)] sm:px-3";
  const activePageClass =
    "inline-flex min-h-9 min-w-9 max-w-full items-center justify-center border-s border-[var(--border)] bg-[var(--primary)] px-2.5 py-1.5 text-sm font-bold text-[var(--primary-foreground)] sm:px-3";
  const ellipsisClass =
    "inline-flex min-h-9 min-w-9 select-none items-center justify-center border-s border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--muted)] sm:px-3";
  const edgeClass =
    "inline-flex min-h-9 min-w-9 shrink-0 items-center justify-center border-s border-[var(--border)] bg-[var(--surface)] px-2.5 py-1.5 text-sm font-medium sm:px-3";

  return (
    <nav aria-label="ترقيم الصفحات" className="mt-6 flex w-full min-w-0 flex-wrap items-center justify-center" dir="ltr">
      <div className="inline-flex max-w-full min-w-0 flex-wrap items-stretch overflow-x-auto overflow-y-hidden rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm">
        {prevDisabled ? (
          <span
            aria-disabled="true"
            className={`${edgeClass} cursor-not-allowed text-[var(--muted)] opacity-50 first:border-s-0`}
            tabIndex={-1}
          >
            ‹
          </span>
        ) : (
          <Link
            aria-label="الصفحة السابقة (أحدث في السجل)"
            className={`${edgeClass} text-[var(--primary)] first:border-s-0 hover:bg-[var(--surface-subtle)]`}
            href={buildHref(currentPage - 1)}
          >
            ‹
          </Link>
        )}

        {displayItems.map((item, index) => {
          const key = item === "ellipsis" ? `e-${index}` : `p-${item}`;

          if (item === "ellipsis") {
            return (
              <span className={ellipsisClass} key={key}>
                …
              </span>
            );
          }

          const isActive = item === currentPage;

          if (isActive) {
            return (
              <span aria-current="page" className={activePageClass} key={key}>
                {item.toLocaleString("ar-EG")}
              </span>
            );
          }

          return (
            <Link className={inactivePageClass} href={buildHref(item)} key={key}>
              {item.toLocaleString("ar-EG")}
            </Link>
          );
        })}

        {nextDisabled ? (
          <span
            aria-disabled="true"
            className={`${edgeClass} cursor-not-allowed text-[var(--muted)] opacity-50`}
            tabIndex={-1}
          >
            ›
          </span>
        ) : (
          <Link
            aria-label="الصفحة التالية (أقدم في السجل)"
            className={`${edgeClass} text-[var(--primary)] hover:bg-[var(--surface-subtle)]`}
            href={buildHref(currentPage + 1)}
          >
            ›
          </Link>
        )}
      </div>
    </nav>
  );
}
