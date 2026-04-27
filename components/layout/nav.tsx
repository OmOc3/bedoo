"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactElement, type SVGProps } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandMark } from "@/components/layout/brand";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/types";

interface DashboardNavProps {
  role: Exclude<UserRole, "technician">;
}

interface NavItem {
  href: string;
  icon: IconName;
  label: string;
}

const managerItems: NavItem[] = [
  { href: "/dashboard/manager", icon: "dashboard", label: "لوحة القيادة" },
  { href: "/dashboard/manager/tasks", icon: "tasks", label: "مهام اليوم" },
  { href: "/dashboard/manager/stations", icon: "stations", label: "المحطات" },
  { href: "/dashboard/manager/reports", icon: "reports", label: "التقارير" },
  { href: "/dashboard/manager/analytics", icon: "analytics", label: "التحليلات" },
  { href: "/dashboard/manager/users", icon: "team", label: "الفريق" },
  { href: "/dashboard/manager/audit", icon: "audit", label: "السجل" },
  { href: "/dashboard/supervisor", icon: "supervisor", label: "لوحة المشرف" },
];

const supervisorItems: NavItem[] = [
  { href: "/dashboard/supervisor", icon: "dashboard", label: "لوحة المشرف" },
  { href: "/dashboard/supervisor/tasks", icon: "tasks", label: "مهام اليوم" },
  { href: "/dashboard/supervisor/reports", icon: "reports", label: "التقارير" },
];

type IconName = "analytics" | "audit" | "dashboard" | "reports" | "stations" | "supervisor" | "tasks" | "team";

const SIDEBAR_STORAGE_KEY = "ecopest-dashboard-sidebar";

function IconFrame({ children, className, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      aria-hidden="true"
      className={cn("h-5 w-5 shrink-0", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.9"
      viewBox="0 0 24 24"
      {...props}
    >
      {children}
    </svg>
  );
}

function DashboardIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <rect height="7" rx="1.5" width="7" x="3" y="3" />
      <rect height="7" rx="1.5" width="7" x="14" y="3" />
      <rect height="7" rx="1.5" width="7" x="3" y="14" />
      <rect height="7" rx="1.5" width="7" x="14" y="14" />
    </IconFrame>
  );
}

function ReportsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M5 19V5" />
      <path d="M19 19H5" />
      <path d="M9 15v-4" />
      <path d="M13 15V8" />
      <path d="M17 15v-6" />
    </IconFrame>
  );
}

function StationsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M8 8.5a4 4 0 0 1 8 0v5a4 4 0 0 1-8 0z" />
      <path d="M12 4V2" />
      <path d="M12 22v-2" />
      <path d="M4 13h4" />
      <path d="M16 13h4" />
      <path d="M5 6l3 2" />
      <path d="M19 6l-3 2" />
      <path d="M5 19l3-2" />
      <path d="M19 19l-3-2" />
    </IconFrame>
  );
}

function TeamIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M16 19a4 4 0 0 0-8 0" />
      <circle cx="12" cy="8" r="3" />
      <path d="M21 19a3.5 3.5 0 0 0-4-3.45" />
      <path d="M3 19a3.5 3.5 0 0 1 4-3.45" />
    </IconFrame>
  );
}

function TasksIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <rect height="16" rx="2" width="14" x="5" y="4" />
      <path d="m9 12 2 2 4-5" />
      <path d="M9 17h6" />
    </IconFrame>
  );
}

function AnalyticsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M4 19V5" />
      <path d="M4 19h16" />
      <path d="m7 15 4-5 3 3 5-7" />
    </IconFrame>
  );
}

function AuditIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M7 4h10v16H7z" />
      <path d="M10 8h4" />
      <path d="M10 12h4" />
      <path d="M10 16h2" />
    </IconFrame>
  );
}

function SupervisorIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M12 3 5 6v5c0 4.5 2.9 8.4 7 10 4.1-1.6 7-5.5 7-10V6z" />
      <path d="m9 12 2 2 4-5" />
    </IconFrame>
  );
}

function SidebarToggleIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <IconFrame className="h-5 w-5">
      <rect height="16" rx="2" width="16" x="4" y="4" />
      <path d="M14 4v16" />
      <path d={isOpen ? "m9 9-3 3 3 3" : "m7 9 3 3-3 3"} />
    </IconFrame>
  );
}

function MobileMenuIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <IconFrame className="h-5 w-5">
      {isOpen ? (
        <>
          <path d="M6 6l12 12" />
          <path d="M18 6 6 18" />
        </>
      ) : (
        <>
          <path d="M5 7h14" />
          <path d="M5 12h14" />
          <path d="M5 17h14" />
        </>
      )}
    </IconFrame>
  );
}

const icons: Record<IconName, (props: SVGProps<SVGSVGElement>) => ReactElement> = {
  analytics: AnalyticsIcon,
  audit: AuditIcon,
  dashboard: DashboardIcon,
  reports: ReportsIcon,
  stations: StationsIcon,
  supervisor: SupervisorIcon,
  tasks: TasksIcon,
  team: TeamIcon,
};

function isItemActive(pathname: string, href: string): boolean {
  if (href === "/dashboard/manager" || href === "/dashboard/supervisor") {
    return pathname === href;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const items = role === "manager" ? managerItems : supervisorItems;
  const currentPathname = pathname ?? "";
  const toggleLabel = isSidebarOpen ? "إغلاق القائمة" : "فتح القائمة";
  const mobileToggleLabel = isMobileNavOpen ? "إغلاق القائمة" : "فتح القائمة";

  useEffect(() => {
    const storedState = window.localStorage.getItem(SIDEBAR_STORAGE_KEY);

    if (storedState === "collapsed") {
      setIsSidebarOpen(false);
    }
  }, []);

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentPathname]);

  function toggleSidebar(): void {
    setIsSidebarOpen((currentState) => {
      const nextState = !currentState;

      window.localStorage.setItem(SIDEBAR_STORAGE_KEY, nextState ? "expanded" : "collapsed");

      return nextState;
    });
  }

  return (
    <>
      <button
        aria-controls="dashboard-mobile-sidebar"
        aria-expanded={isMobileNavOpen}
        aria-label={mobileToggleLabel}
        className="fixed bottom-24 right-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-lg border border-slate-800 bg-slate-950 text-slate-100 shadow-2xl transition-colors hover:bg-slate-900 lg:hidden"
        onClick={() => setIsMobileNavOpen((currentState) => !currentState)}
        title={mobileToggleLabel}
        type="button"
      >
        <MobileMenuIcon isOpen={isMobileNavOpen} />
        <span className="sr-only">{mobileToggleLabel}</span>
      </button>

      {isMobileNavOpen ? (
        <>
          <button
            aria-label="إغلاق القائمة"
            className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-sm lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <aside
            className="fixed inset-y-0 right-0 z-[55] flex w-72 max-w-[calc(100vw-3rem)] flex-col bg-slate-950 text-slate-100 shadow-2xl lg:hidden"
            data-dashboard-nav="mobile-drawer"
            dir="rtl"
            id="dashboard-mobile-sidebar"
          >
            <div className="border-b border-slate-800 px-5 py-6">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <BrandMark className="h-12 w-12" />
                  <div className="min-w-0">
                    <p className="text-xl font-extrabold leading-6 text-white">
                      إيكوبست
                      <span className="ms-2 text-sm font-semibold text-slate-400">EcoPest</span>
                    </p>
                    <p className="mt-1 text-xs font-medium text-teal-400">إدارة محطات الطعوم</p>
                  </div>
                </div>
                <button
                  aria-label="إغلاق القائمة"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
                  onClick={() => setIsMobileNavOpen(false)}
                  title="إغلاق القائمة"
                  type="button"
                >
                  <MobileMenuIcon isOpen />
                  <span className="sr-only">إغلاق القائمة</span>
                </button>
              </div>
            </div>

            <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label="التنقل الرئيسي">
              {items.map((item) => {
                const isActive = isItemActive(currentPathname, item.href);
                const Icon = icons[item.icon];

                return (
                  <Link
                    className={cn(
                      "flex min-h-11 items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors",
                      isActive ? "bg-teal-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    <Icon className={cn(isActive ? "text-white" : "text-slate-500")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="space-y-3 border-t border-slate-800 p-4">
              <ThemeToggle className="!w-full !border-slate-800 !bg-slate-900 !text-slate-200 hover:!bg-slate-800 hover:!text-white" />
              <LogoutButton
                buttonClassName="!w-full !border-slate-800 !bg-slate-900 !text-slate-200 hover:!bg-slate-800 hover:!text-white"
                className="text-slate-200"
              />
            </div>
          </aside>
        </>
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 hidden flex-col bg-slate-950 text-slate-100 shadow-2xl transition-[width] duration-200 ease-out lg:flex",
          isSidebarOpen ? "w-64" : "w-20",
        )}
        data-dashboard-nav={isSidebarOpen ? "expanded" : "collapsed"}
        id="dashboard-sidebar"
        dir="rtl"
      >
        <div className={cn("border-b border-slate-800 py-6", isSidebarOpen ? "px-5" : "px-3")}>
          <div className={cn("flex items-center gap-3", isSidebarOpen ? "justify-between" : "flex-col")}>
            <div className={cn("flex min-w-0 items-center gap-3", isSidebarOpen ? "flex-1" : "justify-center")}>
              <BrandMark className="h-12 w-12" />
              <div className={cn("min-w-0", isSidebarOpen ? "block" : "sr-only")}>
                <p className="text-xl font-extrabold leading-6 text-white">
                  إيكوبست
                  <span className="ms-2 text-sm font-semibold text-slate-400">EcoPest</span>
                </p>
                <p className="mt-1 text-xs font-medium text-teal-400">إدارة محطات الطعوم</p>
              </div>
            </div>
            <button
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={toggleLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-300 transition-colors hover:bg-slate-800 hover:text-white"
              onClick={toggleSidebar}
              title={toggleLabel}
              type="button"
            >
              <SidebarToggleIcon isOpen={isSidebarOpen} />
              <span className="sr-only">{toggleLabel}</span>
            </button>
          </div>
        </div>

        <nav
          className={cn("min-h-0 flex-1 space-y-1 overflow-y-auto py-5", isSidebarOpen ? "px-3" : "px-2")}
          aria-label="التنقل الرئيسي"
        >
          {items.map((item) => {
            const isActive = isItemActive(currentPathname, item.href);
            const Icon = icons[item.icon];

            return (
              <Link
                aria-label={item.label}
                className={cn(
                  "flex min-h-11 items-center gap-3 rounded-xl py-2.5 text-sm font-semibold transition-colors",
                  isSidebarOpen ? "px-3" : "justify-center px-2",
                  isActive ? "bg-teal-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white",
                )}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon className={cn(isActive ? "text-white" : "text-slate-500")} />
                <span className={cn("truncate", isSidebarOpen ? "block" : "sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className={cn("space-y-3 border-t border-slate-800 p-4", isSidebarOpen ? "block" : "hidden")}>
          <ThemeToggle className="!w-full !border-slate-800 !bg-slate-900 !text-slate-200 hover:!bg-slate-800 hover:!text-white" />
          <LogoutButton
            buttonClassName="!w-full !border-slate-800 !bg-slate-900 !text-slate-200 hover:!bg-slate-800 hover:!text-white"
            className="text-slate-200"
          />
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-slate-800 bg-slate-950/95 px-2 py-2 shadow-2xl backdrop-blur lg:hidden"
        data-dashboard-nav="mobile"
        dir="rtl"
        aria-label="التنقل الرئيسي"
      >
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item) => {
            const isActive = isItemActive(currentPathname, item.href);
            const Icon = icons[item.icon];

            return (
              <Link
                className={cn(
                  "flex min-w-20 flex-col items-center justify-center gap-1 rounded-xl px-3 py-2 text-xs font-semibold transition-colors",
                  isActive ? "bg-teal-600 text-white" : "text-slate-400 hover:bg-slate-900 hover:text-white",
                )}
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                <span className="whitespace-nowrap">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
