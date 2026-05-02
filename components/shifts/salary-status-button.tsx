"use client";

import { useTransition, useState } from "react";
import { updateSalaryStatusAction } from "@/app/actions/shifts";
import type { ShiftSalaryStatus } from "@/types";

interface SalaryStatusButtonProps {
  shiftId: string;
  current: ShiftSalaryStatus;
  readOnly?: boolean;
}

const labels: Record<ShiftSalaryStatus, string> = {
  pending: "قيد الانتظار",
  paid: "تم الدفع",
  unpaid: "غير مدفوع",
};

const styles: Record<ShiftSalaryStatus, string> = {
  pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  paid: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  unpaid: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

export function SalaryStatusButton({ shiftId, current, readOnly }: SalaryStatusButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [status, setStatus] = useState<ShiftSalaryStatus>(current);
  const [error, setError] = useState<string | null>(null);

  if (readOnly) {
    return <span className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${styles[status]}`}>{labels[status]}</span>;
  }

  function cycle(): void {
    const next: Record<ShiftSalaryStatus, ShiftSalaryStatus> = { pending: "paid", paid: "unpaid", unpaid: "pending" };
    const nextStatus = next[status];
    startTransition(async () => {
      setError(null);
      const result = await updateSalaryStatusAction(shiftId, nextStatus);
      if (result.success) {
        setStatus(nextStatus);
      } else {
        setError(result.error ?? "خطأ غير معروف");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold transition-all hover:opacity-80 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 ${styles[status]}`}
        disabled={isPending}
        onClick={cycle}
        title="انقر للتغيير"
        type="button"
      >
        {isPending ? "..." : labels[status]}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
