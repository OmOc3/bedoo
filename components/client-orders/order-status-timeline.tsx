"use client";

import { cn } from "@/lib/utils";

// Serializable order type for client components
interface SerializableOrder {
  orderId: string;
  clientUid: string;
  stationId: string;
  stationLabel: string;
  clientName: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  note?: string | null;
  photoUrl?: string | null;
  createdAt?: string | null;
}

type OrderStage = {
  key: "order_placed" | "in_progress" | "inspection_active" | "completed";
  label: string;
  description: string;
  icon: React.ReactNode;
};

const stages: OrderStage[] = [
  {
    key: "order_placed",
    label: "تم الطلب",
    description: "تم استلام طلب الفحص",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
      </svg>
    ),
  },
  {
    key: "in_progress",
    label: "قيد التنفيذ",
    description: "تم قبول الطلب وتحديد موعد",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    key: "inspection_active",
    label: "جاري الفحص",
    description: "الفني في الموقع يعمل على الفحص",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </svg>
    ),
  },
  {
    key: "completed",
    label: "تم الانتهاء",
    description: "اكتمل الفحص بنجاح",
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
];

// Serializable attendance info for client component
interface AttendanceInfo {
  technicianName: string;
  clockInAt?: string | null; // ISO date string
  clockOutAt?: string | null; // ISO date string
}

interface OrderStatusTimelineProps {
  order: SerializableOrder;
  attendanceSession?: AttendanceInfo | null;
  className?: string;
  compact?: boolean;
}

export function OrderStatusTimeline({ order, attendanceSession, className, compact }: OrderStatusTimelineProps) {
  // Determine current stage based on order status and attendance
  const getCurrentStageIndex = (): number => {
    // Cancelled orders show as cancelled
    if (order.status === "cancelled") return -1;
    
    // Completed order
    if (order.status === "completed") return 3;
    
    // Check attendance for active inspection
    if (attendanceSession) {
      if (attendanceSession.clockOutAt) {
        // Technician has clocked out - inspection done but order not marked completed yet
        return 3;
      }
      if (attendanceSession.clockInAt) {
        // Technician is on site
        return 2;
      }
    }
    
    // In progress
    if (order.status === "in_progress") return 1;
    
    // Default: pending (order placed)
    return 0;
  };

  const currentIndex = getCurrentStageIndex();
  
  // Cancelled state
  if (currentIndex === -1) {
    return (
      <div className={cn("rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-800 dark:bg-rose-900/20", className)}>
        <div className="flex items-center gap-3 text-rose-700 dark:text-rose-300">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          <div>
            <p className="font-semibold">تم إلغاء الطلب</p>
            <p className="text-sm opacity-80">تم إلغاء هذا الطلب</p>
          </div>
        </div>
      </div>
    );
  }

  if (compact) {
    // Compact horizontal version
    return (
      <div className={cn("flex items-center gap-1", className)}>
        {stages.map((stage, index) => {
          const isActive = index <= currentIndex;
          const isCurrent = index === currentIndex;
          
          return (
            <div key={stage.key} className="flex items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full transition-colors",
                  isActive
                    ? "bg-teal-500 text-white"
                    : "bg-[var(--surface-subtle)] text-[var(--muted)]",
                  isCurrent && "ring-2 ring-teal-500 ring-offset-2"
                )}
                title={stage.label}
              >
                {stage.icon}
              </div>
              {index < stages.length - 1 && (
                <div
                  className={cn(
                    "mx-1 h-0.5 w-4 transition-colors",
                    index < currentIndex ? "bg-teal-500" : "bg-[var(--border)]"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  }

  // Full vertical timeline
  return (
    <div className={cn("space-y-0", className)}>
      {stages.map((stage, index) => {
        const isActive = index <= currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={stage.key} className="relative flex gap-4">
            {/* Connector line */}
            {index < stages.length - 1 && (
              <div
                className={cn(
                  "absolute right-5 top-10 w-0.5",
                  index < currentIndex ? "bg-teal-500" : "bg-[var(--border-subtle)]"
                )}
                style={{ height: "calc(100% - 20px)" }}
              />
            )}
            
            {/* Icon circle */}
            <div
              className={cn(
                "relative z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-full transition-all",
                isActive
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-500/30"
                  : "bg-[var(--surface-subtle)] text-[var(--muted)] ring-1 ring-[var(--border)]",
                isCurrent && "ring-2 ring-teal-500 ring-offset-2"
              )}
            >
              {stage.icon}
            </div>
            
            {/* Content */}
            <div className={cn("pb-8", !isActive && "opacity-50")}>
              <p className={cn("font-semibold", isActive ? "text-[var(--foreground)]" : "text-[var(--muted)]")}>
                {stage.label}
                {isCurrent && (
                  <span className="me-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                    الحالية
                  </span>
                )}
              </p>
              <p className="mt-1 text-sm text-[var(--muted)]">{stage.description}</p>
              
              {/* Show attendance details for current stage */}
              {isCurrent && attendanceSession && (
                <div className="mt-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-subtle)] p-2 text-xs">
                  {attendanceSession.clockInAt && !attendanceSession.clockOutAt && (
                    <p className="flex items-center gap-1 text-teal-600">
                      <span className="h-2 w-2 animate-pulse rounded-full bg-teal-500" />
                      الفني {attendanceSession.technicianName} في الموقع الآن
                    </p>
                  )}
                  {attendanceSession.clockOutAt && (
                    <p className="text-emerald-600">
                      اكتمل الفحص - {attendanceSession.technicianName}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
