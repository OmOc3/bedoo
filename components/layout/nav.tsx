"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement, type SVGProps } from "react";
import { LogoutButton } from "@/components/auth/logout-button";
import { useLanguage } from "@/components/i18n/language-provider";
import { BrandMark } from "@/components/layout/brand";
import { ReportNotificationListener } from "@/components/notifications/report-notification-listener";
import { cn } from "@/lib/utils";
import type { I18nMessages } from "@/lib/i18n";

interface DashboardNavProps {
  role: "manager" | "supervisor";
}

interface NavItem {
  href: string;
  icon: IconName;
  labelKey: keyof I18nMessages["nav"];
}

const managerItems: NavItem[] = [
  { href: "/dashboard/manager/attendance", icon: "attendance", labelKey: "attendanceDeparture" },
  { href: "/dashboard/manager/payroll", icon: "payroll", labelKey: "payroll" },
  { href: "/dashboard/manager/daily-reports", icon: "reports", labelKey: "dailyReports" },
  { href: "/dashboard/manager/area-tasks", icon: "tasks", labelKey: "areaTasks" },
  { href: "/dashboard/manager", icon: "dashboard", labelKey: "managerDashboard" },
  { href: "/dashboard/manager/tasks", icon: "tasks", labelKey: "todayTasks" },
  { href: "/dashboard/manager/stations", icon: "stations", labelKey: "stations" },
  { href: "/dashboard/manager/stations/map", icon: "map", labelKey: "stationCoordinates" },
  { href: "/dashboard/manager/reports", icon: "reports", labelKey: "reports" },
  { href: "/dashboard/manager/client-orders", icon: "clients", labelKey: "clientsAndOrders" },
  { href: "/dashboard/manager/analytics", icon: "analytics", labelKey: "analytics" },
  { href: "/dashboard/manager/team", icon: "team", labelKey: "team" },
  { href: "/dashboard/manager/audit", icon: "audit", labelKey: "auditLog" },
  { href: "/dashboard/manager/settings", icon: "settings", labelKey: "settings" },
  { href: "/dashboard/supervisor", icon: "supervisor", labelKey: "supervisorBoard" },
];

const supervisorItems: NavItem[] = [
  { href: "/dashboard/supervisor/attendance", icon: "attendance", labelKey: "attendanceDeparture" },
  { href: "/dashboard/supervisor/daily-reports", icon: "reports", labelKey: "dailyReports" },
  { href: "/dashboard/supervisor/area-tasks", icon: "tasks", labelKey: "areaTasks" },
  { href: "/dashboard/supervisor", icon: "dashboard", labelKey: "supervisorDashboard" },
  { href: "/dashboard/supervisor/tasks", icon: "tasks", labelKey: "todayTasks" },
  { href: "/dashboard/supervisor/stations", icon: "stations", labelKey: "stations" },
  { href: "/dashboard/supervisor/shifts", icon: "team", labelKey: "technicianShifts" },
  { href: "/dashboard/supervisor/reports", icon: "reports", labelKey: "reports" },
  { href: "/dashboard/supervisor/client-orders", icon: "clients", labelKey: "clientsAndOrders" },
  { href: "/dashboard/supervisor/analytics", icon: "analytics", labelKey: "analytics" },
  { href: "/dashboard/supervisor/team", icon: "team", labelKey: "team" },
];

type IconName =
  | "analytics"
  | "attendance"
  | "audit"
  | "clients"
  | "dashboard"
  | "map"
  | "payroll"
  | "reports"
  | "settings"
  | "stations"
  | "supervisor"
  | "tasks"
  | "team";


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

function ClientsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <rect height="14" rx="2" width="10" x="7" y="5" />
      <path d="M10 9h4" />
      <path d="M10 12h4" />
      <path d="M10 15h2" />
      <path d="M5 8H4a1 1 0 0 0-1 1v9a2 2 0 0 0 2 2h12" />
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

function AttendanceIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
      <path d="M8 17h8" />
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

function PayrollIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <rect height="14" rx="2" width="18" x="3" y="5" />
      <path d="M7 9h4" />
      <path d="M7 13h10" />
      <path d="M16 9h1" />
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

function SettingsIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <IconFrame {...props}>
      <path d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z" />
      <path d="M19.4 15a1.8 1.8 0 0 0 .36 2l.05.06a2.2 2.2 0 0 1-1.55 3.74 2.2 2.2 0 0 1-1.56-.64l-.06-.05a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.08 1.66V21a2.2 2.2 0 0 1-4.4 0v-.1a1.8 1.8 0 0 0-1.08-1.66 1.8 1.8 0 0 0-2 .36l-.06.05a2.2 2.2 0 0 1-3.11 0 2.2 2.2 0 0 1 0-3.1l.05-.06a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.66-1.08H3a2.2 2.2 0 0 1 0-4.4h.1A1.8 1.8 0 0 0 4.76 7.9a1.8 1.8 0 0 0-.36-2l-.05-.06a2.2 2.2 0 0 1 0-3.1 2.2 2.2 0 0 1 3.11 0l.06.05a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.08-1.66V3a2.2 2.2 0 0 1 4.4 0v.1a1.8 1.8 0 0 0 1.08 1.66 1.8 1.8 0 0 0 2-.36l.06-.05a2.2 2.2 0 0 1 3.11 0 2.2 2.2 0 0 1 0 3.1l-.05.06a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.66 1.08H21a2.2 2.2 0 0 1 0 4.4h-.1A1.8 1.8 0 0 0 19.4 15z" />
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
  attendance: AttendanceIcon,
  audit: AuditIcon,
  clients: ClientsIcon,
  dashboard: DashboardIcon,
  map: MapIcon,
  payroll: PayrollIcon,
  reports: ReportsIcon,
  settings: SettingsIcon,
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

export function DashboardNav({ role }: DashboardNavProps) {
  const pathname = usePathname();
  const { direction, locale, messages } = useLanguage();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileCloseButtonRef = useRef<HTMLButtonElement>(null);
  const sidebarHoverTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const items = role === "manager" ? managerItems : supervisorItems;
  const currentPathname = pathname ?? "";
  const isRtl = direction === "rtl";
  const mobileToggleLabel = isMobileNavOpen ? messages.nav.closeMenu : messages.nav.openMenu;
  const closeMenuLabel = messages.nav.closeMenu;
  const mainMenuLabel = messages.nav.mainMenu;
  const primaryNavigationLabel = messages.nav.primaryNavigation;
  const brandTitle = locale === "ar" ? messages.brand.nameArabic : messages.brand.name;
  const brandTagline = messages.brandTagline;
  const showLatinBrandAlias = isRtl;

  function handleSidebarMouseEnter(): void {
    sidebarHoverTimer.current = setTimeout(() => setIsSidebarOpen(true), 250);
  }

  function handleSidebarMouseLeave(): void {
    if (sidebarHoverTimer.current !== null) {
      clearTimeout(sidebarHoverTimer.current);
      sidebarHoverTimer.current = null;
    }
    setIsSidebarOpen(false);
  }

  useEffect(() => {
    setIsMobileNavOpen(false);
  }, [currentPathname]);

  useEffect(() => {
    if (!isMobileNavOpen) {
      return;
    }

    const previousBodyOverflow = document.body.style.overflow;
    const focusTimer = window.setTimeout(() => mobileCloseButtonRef.current?.focus(), 0);

    document.body.style.overflow = "hidden";

    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousBodyOverflow;
    };
  }, [isMobileNavOpen]);

  function closeMobileNav(restoreFocus = true): void {
    setIsMobileNavOpen(false);

    if (restoreFocus) {
      window.setTimeout(() => mobileMenuButtonRef.current?.focus(), 0);
    }
  }

  function handleMobileDrawerKeyDown(event: KeyboardEvent<HTMLElement>): void {
    if (event.key === "Escape") {
      event.preventDefault();
      closeMobileNav();
      return;
    }

    if (event.key !== "Tab") {
      return;
    }

    const focusableSelector = [
      "a[href]",
      "button:not([disabled])",
      "input:not([disabled])",
      "select:not([disabled])",
      "textarea:not([disabled])",
      '[tabindex]:not([tabindex="-1"])',
    ].join(",");
    const focusableElements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => element.offsetParent !== null,
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements.at(-1);

    if (!firstElement || !lastElement) {
      event.preventDefault();
      return;
    }

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }

  return (
    <>
      <ReportNotificationListener role={role} />

      <button
        aria-controls="dashboard-mobile-sidebar"
        aria-expanded={isMobileNavOpen}
        aria-label={mobileToggleLabel}
        className={cn(
          "fixed bottom-24 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-card-lg transition-all duration-150 hover:bg-[var(--sidebar-surface)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] lg:hidden",
          isRtl ? "right-4" : "left-4",
        )}
        onClick={() => setIsMobileNavOpen((currentState) => !currentState)}
        ref={mobileMenuButtonRef}
        title={mobileToggleLabel}
        type="button"
      >
        <MobileMenuIcon isOpen={isMobileNavOpen} />
        <span className="sr-only">{mobileToggleLabel}</span>
      </button>

      {isMobileNavOpen ? (
        <>
          <button
            aria-label={closeMenuLabel}
            className="fixed inset-0 z-50 bg-[rgb(2_6_23_/_0.8)] backdrop-blur-md lg:hidden"
            onClick={() => closeMobileNav()}
            tabIndex={-1}
            type="button"
          />
          <aside
            aria-label={mainMenuLabel}
            aria-modal="true"
            className={cn(
              "fixed inset-y-0 z-[55] flex w-72 max-w-[calc(100vw-3rem)] flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl lg:hidden",
              isRtl ? "right-0" : "left-0",
            )}
            data-dashboard-nav="mobile-drawer"
            dir={direction}
            id="dashboard-mobile-sidebar"
            onKeyDown={handleMobileDrawerKeyDown}
            role="dialog"
          >
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent_40%)]" />
            <div className="relative border-b border-[var(--sidebar-border)] px-5 py-5">
              <div className="flex items-center justify-between gap-3">
                <Link href="/" className="flex min-w-0 items-center gap-3">
                  <BrandMark className="h-10 w-10 shrink-0" />
                  <div className="min-w-0">
                    <p className="truncate text-base font-bold leading-tight text-[var(--sidebar-text)]">
                      {brandTitle}
                      {showLatinBrandAlias ? (
                        <span className="ms-1.5 text-xs font-semibold text-[var(--sidebar-muted)]">EcoPest</span>
                      ) : null}
                    </p>
                    <p className="text-[11px] font-medium text-teal-400 truncate">{brandTagline}</p>
                  </div>
                </Link>
                <button
                  aria-label={closeMenuLabel}
                  className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-[var(--sidebar-border)] bg-[var(--sidebar-surface)] text-[var(--sidebar-muted)] transition-all duration-150 hover:bg-[var(--sidebar-border)] hover:text-[var(--sidebar-text)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
                  onClick={() => closeMobileNav()}
                  ref={mobileCloseButtonRef}
                  title={closeMenuLabel}
                  type="button"
                >
                  <MobileMenuIcon isOpen />
                  <span className="sr-only">{closeMenuLabel}</span>
                </button>
              </div>
            </div>

            <nav className="sidebar-scrollbar min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-5" aria-label={primaryNavigationLabel}>
              {items.map((item) => {
                const isActive = isItemActive(currentPathname, item.href);
                const Icon = icons[item.icon];
                const itemLabel = messages.nav[item.labelKey];

                return (
                  <Link
                    className={cn(
                      "relative flex min-h-11 items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-teal-300 text-[var(--sidebar)] ring-1 ring-inset ring-teal-200/70"
                        : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
                    )}
                    href={item.href}
                    key={item.href}
                    onClick={() => closeMobileNav(false)}
                  >
                    <Icon className={cn(isActive ? "text-[var(--sidebar)]" : "text-[var(--sidebar-muted)]")} />
                    <span className="truncate">{itemLabel}</span>
                  </Link>
                );
              })}
            </nav>

            <div className="relative mt-auto border-t border-[var(--sidebar-border)] p-4">
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
          "fixed inset-y-0 z-40 hidden flex-col overflow-hidden bg-[var(--sidebar)] text-[var(--sidebar-text)] shadow-2xl transition-[width] duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] lg:flex",
          isRtl ? "right-0" : "left-0",
          isSidebarOpen ? "w-64" : "w-[4.5rem]",
        )}
        data-dashboard-nav={isSidebarOpen ? "expanded" : "collapsed"}
        id="dashboard-sidebar"
        dir={direction}
        onMouseEnter={handleSidebarMouseEnter}
        onMouseLeave={handleSidebarMouseLeave}
      >
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgb(255_255_255_/_0.05),transparent_42%)]" />
        <div className={cn("relative border-b border-[var(--sidebar-border)] py-5", isSidebarOpen ? "px-5" : "px-3")}>
          <div className="flex items-center justify-between gap-3">
                <Link href="/" className={cn("flex min-w-0 items-center gap-2.5", isSidebarOpen ? "flex-1" : "justify-center")}>
              <BrandMark className={cn("shrink-0 transition-all duration-300", isSidebarOpen ? "h-9 w-9" : "h-11 w-11")} />
              <div
                className={cn(
                  "min-w-0 overflow-hidden transition-[opacity,max-width] duration-300",
                  isSidebarOpen ? "max-w-xs opacity-100" : "max-w-0 opacity-0",
                )}
              >
                <p className="truncate text-base font-bold leading-tight text-[var(--sidebar-text)] whitespace-nowrap">
                  {brandTitle}
                  {showLatinBrandAlias ? (
                    <span className="ms-1.5 text-xs font-semibold text-[var(--sidebar-muted)]">EcoPest</span>
                  ) : null}
                </p>
                <p className="text-[11px] font-medium text-teal-400 truncate whitespace-nowrap">{brandTagline}</p>
              </div>
            </Link>
          </div>
        </div>

        <nav
          className={cn("sidebar-scrollbar relative min-h-0 flex-1 space-y-1 overflow-y-auto py-5", isSidebarOpen ? "px-3" : "px-2")}
          aria-label={primaryNavigationLabel}
        >
          {items.map((item) => {
            const isActive = isItemActive(currentPathname, item.href);
            const Icon = icons[item.icon];
            const itemLabel = messages.nav[item.labelKey];

            return (
              <Link
                aria-label={itemLabel}
                className={cn(
                  "relative flex min-h-11 items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors duration-150",
                  isSidebarOpen ? "px-3" : "justify-center px-2",
                  isActive
                    ? "bg-teal-300 text-[var(--sidebar)] ring-1 ring-inset ring-teal-200/70"
                    : "text-[var(--sidebar-muted)] hover:bg-[var(--sidebar-surface)] hover:text-[var(--sidebar-text)]",
                )}
                href={item.href}
                key={item.href}
                title={itemLabel}
              >
                <Icon className={cn("shrink-0", isActive ? "text-[var(--sidebar)]" : "text-[var(--sidebar-muted)]")} />
                <span
                  className={cn(
                    "overflow-hidden whitespace-nowrap transition-[opacity,max-width] duration-300",
                    isSidebarOpen ? "max-w-xs opacity-100" : "max-w-0 opacity-0",
                  )}
                >
                  {itemLabel}
                </span>
              </Link>
            );
          })}
        </nav>

        <div
          className={cn(
            "relative mt-auto border-t border-[var(--sidebar-border)] p-4 overflow-hidden transition-[opacity,max-height] duration-300",
            isSidebarOpen ? "max-h-24 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <LogoutButton
            buttonClassName="!w-full !border-[var(--sidebar-border)] !bg-[var(--sidebar-surface)] !text-[var(--sidebar-text)] hover:!bg-[var(--sidebar-border)] hover:!text-[var(--sidebar-text)]"
            className="text-[var(--sidebar-text)]"
          />
        </div>
      </aside>

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-[var(--sidebar-border)] bg-[var(--sidebar)] px-2 py-2 shadow-2xl backdrop-blur lg:hidden"
        data-dashboard-nav="mobile"
        dir={direction}
        aria-label={primaryNavigationLabel}
      >
        <div className="flex gap-2 overflow-x-auto">
          {items.map((item) => {
            const isActive = isItemActive(currentPathname, item.href);
            const Icon = icons[item.icon];
            const itemLabel = messages.nav[item.labelKey];

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
                <span className="whitespace-nowrap">{itemLabel}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
