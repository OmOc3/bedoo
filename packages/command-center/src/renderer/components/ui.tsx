import type { ReactNode } from "react";
import { formatStatus, type ScheduleStatus, type TaskStatus } from "../../shared/schema";

export function Icon({
  name,
  size = 18,
}: {
  name: "timeline" | "board" | "agent" | "calendar" | "sun" | "moon" | "close" | "check" | "copy";
  size?: number;
}): ReactNode {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  switch (name) {
    case "timeline":
      return (
        <svg {...common}>
          <path d="M4 18h16" />
          <path d="M7 18V7" />
          <path d="M12 18V4" />
          <path d="M17 18v-8" />
          <circle cx="7" cy="7" r="2" />
          <circle cx="12" cy="4" r="2" />
          <circle cx="17" cy="10" r="2" />
        </svg>
      );
    case "board":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="5" height="14" rx="1.5" />
          <rect x="10.5" y="5" width="4" height="14" rx="1.5" />
          <rect x="16" y="5" width="4" height="14" rx="1.5" />
        </svg>
      );
    case "agent":
      return (
        <svg {...common}>
          <path d="m13 2-8 12h6l-1 8 9-13h-6z" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...common}>
          <rect x="4" y="5" width="16" height="15" rx="2" />
          <path d="M8 3v4" />
          <path d="M16 3v4" />
          <path d="M4 10h16" />
        </svg>
      );
    case "sun":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2" />
          <path d="M12 20v2" />
          <path d="m4.93 4.93 1.41 1.41" />
          <path d="m17.66 17.66 1.41 1.41" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m6.34 17.66-1.41 1.41" />
          <path d="m19.07 4.93-1.41 1.41" />
        </svg>
      );
    case "moon":
      return (
        <svg {...common}>
          <path d="M20 14.5A8 8 0 0 1 9.5 4 6.7 6.7 0 1 0 20 14.5z" />
        </svg>
      );
    case "close":
      return (
        <svg {...common}>
          <path d="M18 6 6 18" />
          <path d="m6 6 12 12" />
        </svg>
      );
    case "check":
      return (
        <svg {...common}>
          <path d="m5 12 4 4L19 6" />
        </svg>
      );
    case "copy":
      return (
        <svg {...common}>
          <rect x="9" y="9" width="10" height="10" rx="2" />
          <path d="M5 15H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
        </svg>
      );
  }
}

export function ProgressRing({
  done,
  total,
  size = 36,
  color = "var(--accent)",
}: {
  done: number;
  total: number;
  size?: number;
  color?: string;
}): ReactNode {
  const radius = size / 2 - 3;
  const circumference = 2 * Math.PI * radius;
  const value = total > 0 ? done / total : 0;
  return (
    <svg className="progress-ring" width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={size / 2} cy={size / 2} r={radius} className="progress-ring-track" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        className="progress-ring-value"
        stroke={color}
        strokeDasharray={`${value * circumference} ${circumference}`}
      />
      <text x="50%" y="52%" dominantBaseline="middle" textAnchor="middle">
        {done}/{total}
      </text>
    </svg>
  );
}

export function StatusPill({ status }: { status: TaskStatus }): ReactNode {
  return <span className={`status-pill status-${status}`}>{formatStatus(status)}</span>;
}

export function SchedulePill({ status }: { status: ScheduleStatus }): ReactNode {
  const labels: Record<ScheduleStatus, string> = {
    on_track: "حسب الخطة",
    behind: "متأخر",
    ahead: "متقدم",
  };
  return <span className={`status-pill schedule-${status}`}>{labels[status]}</span>;
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }): ReactNode {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function timeAgo(value: string | null): string {
  if (!value) return "لا يوجد";
  const diffMs = Date.now() - new Date(value).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60_000));
  if (minutes < 1) return "الآن";
  if (minutes < 60) return `قبل ${minutes} د`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `قبل ${hours} س`;
  return `قبل ${Math.floor(hours / 24)} يوم`;
}

export function formatShortDate(value: string | null): string {
  if (!value) return "غير محدد";
  return new Intl.DateTimeFormat("ar-EG", { month: "short", day: "numeric" }).format(new Date(value));
}
