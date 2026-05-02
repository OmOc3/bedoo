"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { UserRole } from "@/types";

interface ReportNotificationListenerProps {
  role: Exclude<UserRole, "technician">;
}

interface PendingReportNotificationPayload {
  latestReport?: {
    reportId: string;
    stationLabel: string;
    submittedAt: string;
    technicianName: string;
  };
  pendingCount: number;
}

type NotificationState = NotificationPermission | "unsupported";

const storageKey = "ecopest-last-pending-report-notification";

function isPendingReportNotificationPayload(value: unknown): value is PendingReportNotificationPayload {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const record = value as Record<string, unknown>;

  if (typeof record.pendingCount !== "number") {
    return false;
  }

  if (record.latestReport === undefined) {
    return true;
  }

  if (typeof record.latestReport !== "object" || record.latestReport === null) {
    return false;
  }

  const latestReport = record.latestReport as Record<string, unknown>;

  return (
    typeof latestReport.reportId === "string" &&
    typeof latestReport.stationLabel === "string" &&
    typeof latestReport.submittedAt === "string" &&
    typeof latestReport.technicianName === "string"
  );
}

function parsePayload(data: string): PendingReportNotificationPayload | null {
  try {
    const parsed = JSON.parse(data) as unknown;

    return isPendingReportNotificationPayload(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function reportHref(role: ReportNotificationListenerProps["role"]): string {
  return role === "manager"
    ? "/dashboard/manager/reports?reviewStatus=pending"
    : "/dashboard/supervisor/reports?reviewStatus=pending";
}

export function ReportNotificationListener({ role }: ReportNotificationListenerProps) {
  const [permission, setPermission] = useState<NotificationState>("unsupported");
  const [toast, setToast] = useState<PendingReportNotificationPayload["latestReport"] | null>(null);
  const hasInitializedRef = useRef(false);
  const permissionRef = useRef<NotificationState>("unsupported");
  const toastTimerRef = useRef<number | null>(null);
  const targetHref = reportHref(role);

  useEffect(() => {
    permissionRef.current = permission;
  }, [permission]);

  useEffect(() => {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(Notification.permission);
  }, []);

  useEffect(() => {
    const source = new EventSource("/api/reports/pending-notifications");

    function handleMessage(event: MessageEvent<string>): void {
      const payload = parsePayload(event.data);
      const latestReport = payload?.latestReport;

      if (!payload || !latestReport) {
        return;
      }

      const storedReportId = window.localStorage.getItem(storageKey);

      if (!hasInitializedRef.current) {
        hasInitializedRef.current = true;
        window.localStorage.setItem(storageKey, storedReportId ?? latestReport.reportId);
        return;
      }

      if (storedReportId === latestReport.reportId) {
        return;
      }

      window.localStorage.setItem(storageKey, latestReport.reportId);
      setToast(latestReport);

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }

      toastTimerRef.current = window.setTimeout(() => setToast(null), 9_000);

      if (permissionRef.current === "granted") {
        const notification = new Notification("تقرير جديد يحتاج مراجعة", {
          body: `${latestReport.stationLabel} - ${latestReport.technicianName}`,
          icon: "/brand/ecopest-icon.png",
          tag: latestReport.reportId,
        });

        notification.onclick = () => {
          window.focus();
          window.location.href = targetHref;
          notification.close();
        };
      }
    }

    source.addEventListener("pending-report", handleMessage);

    return () => {
      source.removeEventListener("pending-report", handleMessage);
      source.close();

      if (toastTimerRef.current) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, [targetHref]);

  async function requestNotifications(): Promise<void> {
    if (!("Notification" in window)) {
      setPermission("unsupported");
      return;
    }

    setPermission(await Notification.requestPermission());
  }

  return (
    <>
      {permission === "default" ? (
        <button
          className="fixed bottom-6 left-4 z-[70] inline-flex min-h-11 max-w-[calc(100vw-2rem)] items-center justify-center rounded-lg border border-teal-200 bg-[var(--surface)] px-4 py-2 text-sm font-bold text-teal-800 shadow-2xl transition-colors hover:bg-teal-50 dark:border-teal-900/40 dark:bg-[var(--surface-elevated)] dark:text-teal-300 dark:hover:bg-teal-900/30 lg:bottom-4"
          onClick={() => void requestNotifications()}
          type="button"
        >
          تفعيل إشعارات التقارير
        </button>
      ) : null}

      {toast ? (
        <div
          className="fixed left-4 top-4 z-[80] w-[calc(100vw-2rem)] max-w-sm rounded-xl border border-teal-200 bg-[var(--surface)] p-4 text-right shadow-2xl dark:border-teal-900/40"
          dir="rtl"
          role="status"
        >
          <p className="text-sm font-bold text-[var(--foreground)]">تقرير جديد يحتاج مراجعة</p>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">
            {toast.stationLabel} - {toast.technicianName}
          </p>
          <Link
            className="mt-3 inline-flex min-h-11 items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98]"
            href={targetHref}
            onClick={() => setToast(null)}
          >
            عرض التقارير
          </Link>
        </div>
      ) : null}
    </>
  );
}
