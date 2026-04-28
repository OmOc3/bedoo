"use client";

import { useState, useTransition } from "react";
import { clockInAction, clockOutAction } from "@/app/actions/attendance";
import type { AttendanceSession } from "@/types";

interface AttendancePanelProps {
  openSession: AttendanceSession | null;
}

function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function AttendancePanel({ openSession }: AttendancePanelProps) {
  const [notes, setNotes] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submitClockIn(): void {
    const formData = new FormData();
    if (notes.trim()) {
      formData.set("notes", notes.trim());
    }

    startTransition(async () => {
      const result = await clockInAction(formData);
      setMessage(result.error ?? "تم تسجيل الحضور بنجاح.");
      if (result.success) {
        setNotes("");
      }
    });
  }

  function submitClockOut(): void {
    const formData = new FormData();
    if (notes.trim()) {
      formData.set("notes", notes.trim());
    }

    startTransition(async () => {
      const result = await clockOutAction(formData);
      setMessage(result.error ?? "تم تسجيل الانصراف بنجاح.");
      if (result.success) {
        setNotes("");
      }
    });
  }

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-control">
      <h2 className="text-lg font-bold text-slate-900">الحضور والانصراف</h2>
      <p className="mt-1 text-sm text-slate-600">سجل بداية ونهاية يوم العمل من داخل النظام مباشرة.</p>
      <div className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700">
        {openSession ? (
          <span>
            حالة اليوم: <strong className="text-teal-700">حضور مسجل</strong> منذ {formatDateTime(openSession.clockInAt.toDate())}
          </span>
        ) : (
          <span>
            حالة اليوم: <strong className="text-slate-700">لم يتم تسجيل الحضور بعد</strong>
          </span>
        )}
      </div>
      <textarea
        className="mt-3 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 focus:border-transparent focus:outline-none focus:ring-2 focus:ring-teal-500"
        dir="rtl"
        onChange={(event) => setNotes(event.target.value)}
        placeholder="ملاحظة اختيارية للحضور/الانصراف"
        value={notes}
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-green-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-green-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(openSession) || isPending}
          onClick={submitClockIn}
          type="button"
        >
          تسجيل حضور
        </button>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
          disabled={!openSession || isPending}
          onClick={submitClockOut}
          type="button"
        >
          تسجيل انصراف
        </button>
      </div>
      {message ? <p className="mt-3 text-sm font-medium text-slate-700">{message}</p> : null}
    </section>
  );
}
