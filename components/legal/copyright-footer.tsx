import Link from "next/link";
import { BRAND } from "@/lib/brand";
import { i18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface CopyrightFooterProps {
  className?: string;
}

export function CopyrightFooter({ className }: CopyrightFooterProps) {
  const year = BRAND.copyrightYear();

  return (
    <footer
      className={cn(
        "mx-auto w-full max-w-7xl px-4 py-6 text-center text-xs leading-6 text-[var(--muted)] sm:px-6 lg:px-8",
        className,
      )}
      dir="rtl"
    >
      <div className="flex flex-col items-center justify-center gap-2 border-t border-[var(--border)] pt-5 sm:flex-row sm:flex-wrap">
        <p>
          © {year} {BRAND.companyName}. {i18n.en.legal.allRightsReserved} / {BRAND.companyNameArabic}.{" "}
          {i18n.legal.allRightsReserved}
        </p>
        <nav className="flex items-center justify-center gap-3" aria-label={i18n.legal.copyright}>
          <Link className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]" href="/legal/terms">
            {i18n.legal.terms} / {i18n.en.legal.terms}
          </Link>
          <Link className="font-medium text-[var(--foreground)] hover:text-[var(--primary)]" href="/legal/privacy">
            {i18n.legal.privacy} / {i18n.en.legal.privacy}
          </Link>
        </nav>
      </div>
    </footer>
  );
}
