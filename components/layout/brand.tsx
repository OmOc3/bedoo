import { cn } from "@/lib/utils";
import { LogoLockupSvg, LogoMarkSvg } from "@/components/layout/logo";

interface BrandProps {
  className?: string;
  compact?: boolean;
  inverse?: boolean;
}

export function BrandMark({ className }: Omit<BrandProps, "compact" | "inverse">) {
  return (
    <div className={cn("shrink-0", className)} aria-hidden="true">
      <LogoMarkSvg className="h-full w-full" />
    </div>
  );
}

export function BrandLockup({ className, compact = false, inverse = false }: BrandProps) {
  return (
    <div className={cn("shrink-0", className)}>
      <LogoLockupSvg className={cn(compact ? "h-12" : "h-16 sm:h-20")} inverse={inverse} />
    </div>
  );
}
