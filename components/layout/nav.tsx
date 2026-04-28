"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactElement, type SVGProps } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { BrandMark } from "@/components/layout/brand";
import { ReportNotificationListener } from "@/components/notifications/report-notification-listener";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { cn } from "@/lib/utils";

interface DashboardNavProps {
  role: "manager" | "supervisor";
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
  { href: "/dashboard/manager/stations/map", icon: "map", label: "خريطة المحطات" },
  { href: "/dashboard/manager/reports", icon: "reports", label: "التقارير" },
  { href: "/dashboard/manager/client-orders", icon: "team", label: "طلبات العملاء" },
  { href: "/dashboard/manager/analytics", icon: "analytics", label: "التحليلات" },
  { href: "/dashboard/manager/users", icon: "team", label: "الفريق" },
  { href: "/dashboard/manager/audit", icon: "audit", label: "السجل" },
  { href: "/dashboard/supervisor", icon: "supervisor", label: "لوحة المشرف" },
];

const supervisorItems: NavItem[] = [
  { href: "/dashboard/supervisor", icon: "dashboard", label: "لوحة المشرف" },
  { href: "/dashboard/supervisor/tasks", icon: "tasks", label: "مهام اليوم" },
  { href: "/dashboard/supervisor/reports", icon: "reports", label: "التقارير" },
  { href: "/dashboard/supervisor/client-orders", icon: "team", label: "طلبات العملاء" },
];

type IconName = "analytics" | "audit" | "dashboard" | "map" | "reports" | "stations" | "supervisor" | "tasks" | "team";

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

function MapIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M9 18 3 21V6l6-3 6 3 6-3v15l-6 3z" />
      <path d="M9 3v15" />
      <path d="M15 6v15" />
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
  map: MapIcon,
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

  if (href === "/dashboard/manager/stations") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/map`));
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

function UserAvatar({ isSidebarOpen, role }: { isSidebarOpen: boolean; role: DashboardNavProps["role"] }) {
  const roleLabel = role === "manager" ? "Manager" : "Supervisor";

  return (
    <div className={cn("flex items-center gap-3", isSidebarOpen ? "justify-start" : "justify-center")}>
      <div
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-teal-400/30 bg-teal-500/15 text-sm font-bold text-teal-200 shadow-inset-border"
        title={roleLabel}
      >
        EP
      </div>
      <div className={cn("min-w-0", isSidebarOpen ? "block" : "sr-only")}>
        <p className="truncate text-sm font-semibold text-[var(--sidebar-text)]">EcoPest</p>
        <p className="truncate text-xs text-[var(--sidebar-muted)]">{roleLabel}</p>
      </div>
    </div>
  );
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
      <ReportNotificationListener role={role} />

      <button
        aria-controls="dashboard-mobile-sidebar"
        aria-expanded={isMobileNavOpen}
        aria-label={mobileToggleLabel}
        className="fixed bottom-24 right-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-card-lg transition-all duration-150 hover:bg-[var(--sidebar-surface)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] lg:hidden"
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
            className="fixed inset-0 z-50 bg-[rgb(2_6_23_/_0.8)] backdrop-blur-md lg:hidden"
            onClick={() => setIsMobileNavOpen(false)}
            type="button"
          />
          <aside
            className="fixed inset-y-0 right-0 z-[55] flex w-72 max-w-[calc(100vw-3rem)] flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl lg:hidden"
            data-dashboard-nav="mobile-drawer"
            dir="rtl"
            id="dashboard-mobile-sidebar"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent_40%)]" />
            <div className="relative border-b border-[var(--sidebar-border)] px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-3">
                  <BrandMark className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight text-[var(--sidebar-text)]">
                      إيكوبست
                      <span className="ms-1.5 text-xs font-semibold text-[var(--sidebar-muted)]">EcoPest</span>
                    </p>
                    <p className="text-[11px] font-medium text-teal-400 truncate">إدارة محطات الطعوم</p>
                  </div>
                </Link>
                <button
                  aria-label="إغلاق القائمة"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] text-[var(--sidebar-muted)] transition-all duration-150 hover:bg-[var(--sidebar-border)] hover:text-[var(--sidebar-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
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
                      "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "border-r-2 border-teal-300 bg-teal-600/90 text-white"
                        : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => setIsMobileNavOpen(false)}
                  >
                    <Icon className={cn(isActive ? "text-white" : "text-[var(--sidebar-muted)]")} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative space-y-3 border-t border-[var(--sidebar-border)] p-4">
              <UserAvatar isSidebarOpen role={role} />
              <ThemeToggle className="!w-full !border-[var(--sidebar-border)] !bg-[var(--sidebar-surface)] !text-[var(--sidebar-text)] hover:!bg-[var(--sidebar-border)] hover:!text-[var(--sidebar-text)]" />
              <LogoutButton
                buttonClassName="!w-full !border-[var(--sidebar-border)] !bg-[var(--sidebar-surface)] !text-[var(--sidebar-text)] hover:!bg-[var(--sidebar-border)] hover:!text-[var(--sidebar-text)]"
                className="text-[var(--sidebar-text)]"
              />
            </div>
          </aside>
        </>
      ) : null}

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 hidden flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl transition-[width] duration-200 ease-out lg:flex",
          isSidebarOpen ? "w-64" : "w-20",
        )}
        data-dashboard-nav={isSidebarOpen ? "expanded" : "collapsed"}
        id="dashboard-sidebar"
        dir="rtl"
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent_42%)]" />
        <div className={cn("relative border-b border-[var(--sidebar-border)] py-5", isSidebarOpen ? "px-5" : "px-3")}>
          <div className={cn("flex items-center gap-3", isSidebarOpen ? "justify-between" : "flex-col")}>
            <Link href="/" className={cn("flex min-w-0 items-center gap-2.5", isSidebarOpen ? "flex-1" : "justify-center")}>
              <BrandMark className={cn("shrink-0 transition-all", isSidebarOpen ? "h-9 w-9" : "h-11 w-11")} />
              <div className={cn("min-w-0", isSidebarOpen ? "block" : "sr-only")}>
                <p className="truncate text-base font-bold leading-tight text-[var(--sidebar-text)]">
                  إيكوبست
                  <span className="ms-1.5 text-xs font-semibold text-[var(--sidebar-muted)]">EcoPest</span>
                </p>
                <p className="text-[11px] font-medium text-teal-400 truncate">إدارة محطات الطعوم</p>
              </div>
            </Link>
            <button
              aria-controls="dashboard-sidebar"
              aria-expanded={isSidebarOpen}
              aria-label={toggleLabel}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] text-[var(--sidebar-muted)] transition-all duration-150 hover:bg-[var(--sidebar-border)] hover:text-[var(--sidebar-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
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
          className={cn("relative min-h-0 flex-1 space-y-1 overflow-y-auto py-5", isSidebarOpen ? "px-3" : "px-2")}
          aria-label="التنقل الرئيسي"
        >
          {items.map((item) => {
            const isActive = isItemActive(currentPathname, item.href);
            const Icon = icons[item.icon];

            return (
              <Link
                aria-label={item.label}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
                  isSidebarOpen ? "px-3" : "justify-center px-2",
                  isActive
                    ? "border-r-2 border-teal-300 bg-teal-600/90 text-white"
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
                )}
                href={item.href}
                key={item.href}
                title={item.label}
              >
                <Icon className={cn(isActive ? "text-white" : "text-[var(--sidebar-muted)]")} />
                <span className={cn("truncate", isSidebarOpen ? "block" : "sr-only")}>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="relative space-y-3 border-t border-[var(--sidebar-border)] p-4">
          <UserAvatar isSidebarOpen={isSidebarOpen} role={role} />
          <div className={cn("space-y-3", isSidebarOpen ? "block" : "hidden")}>
            <ThemeToggle className="!w-full !border-[var(--sidebar-border)] !bg-[var(--sidebar-surface)] !text-[var(--sidebar-text)] hover:!bg-[var(--sidebar-border)] hover:!text-[var(--sidebar-text)]" />
            <LogoutButton
              buttonClassName="!w-full !border-[var(--sidebar-border)] !bg-[var(--sidebar-surface)] !text-[var(--sidebar-text)] hover:!bg-[var(--sidebar-border)] hover:!text-[var(--sidebar-text)]"
              className="text-[var(--sidebar-text)]"
            />
          </div>
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] px-2 py-2 shadow-2xl backdrop-blur lg:hidden"
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
                  "relative flex min-w-20 flex-col items-center justify-center gap-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
                  isActive ? "text-white" : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
                )}
                href={item.href}
                key={item.href}
              >
                {isActive ? <span aria-hidden="true" className="absolute top-1 h-1.5 w-1.5 rounded-full bg-teal-300" /> : null}
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
