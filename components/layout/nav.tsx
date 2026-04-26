"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BrandLockup } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface DashboardNavProps {
  role: Exclude<UserRole, "technician">;
}

interface NavItem {
  href: string;
  label: string;
}

const managerItems: NavItem[] = [
  { href: "/dashboard/manager", label: "لوحة المدير" },
  { href: "/dashboard/manager/tasks", label: "مهام اليوم" },
  { href: "/dashboard/manager/stations", label: "المحطات" },
  { href: "/dashboard/manager/reports", label: "التقارير" },
  { href: "/dashboard/manager/analytics", label: "التحليلات" },
  { href: "/dashboard/manager/audit", label: "السجل" },
  { href: "/dashboard/manager/users", label: "المستخدمون" },
  { href: "/dashboard/supervisor", label: "لوحة المشرف" },
];

const supervisorItems: NavItem[] = [
  { href: "/dashboard/supervisor", label: "لوحة المشرف" },
  { href: "/dashboard/supervisor/tasks", label: "مهام اليوم" },
  { href: "/dashboard/supervisor/reports", label: "التقارير" },
];

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const items = role === "manager" ? managerItems : supervisorItems;

  return (
    <nav className="rounded-2xl border border-slate-200 bg-white p-4 shadow-control" dir="rtl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <BrandLockup compact />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex min-w-max flex-1 flex-wrap gap-1">
            {items.map((item) => {
              const currentPathname = pathname ?? "";
              const isActive = currentPathname === item.href || currentPathname.startsWith(`${item.href}/`);

              return (
                <Link
                  className={cn(
                    "rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    isActive
                      ? "bg-teal-700 text-white"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white",
                  )}
                  href={item.href}
                  key={item.href}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
          <ThemeToggle />
        </div>
      </div>
    </nav>
  );
}
