"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toggleUserActiveAction } from "@/app/actions/users";

interface UserActivateToggleProps {
  disabled: boolean;
  displayName: string;
  isActive: boolean;
  targetUid: string;
}

export function UserActivateToggle({ disabled, displayName, isActive, targetUid }: UserActivateToggleProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ tone: "error" | "success"; text: string } | null>(null);

  function onActivateDeactivate(): void {
    setMessage(null);

    if (isActive) {
      const ok = window.confirm(
        `هل أنت متأكد من تعطيل حساب «${displayName}»؟\nلن يتمكن المستخدم من تسجيل الدخول حتى يتم تفعيله مرة أخرى.`,
      );
      if (!ok) {
        return;
      }
    }

    startTransition(async () => {
      const intent = isActive ? "deactivate" : "activate";
      const result = await toggleUserActiveAction(targetUid, intent);

      if (result.error) {
        setMessage({ tone: "error", text: result.error });
        return;
      }

      if (result.success) {
        setMessage({
          tone: "success",
          text: intent === "deactivate" ? "تم تعطيل الحساب بنجاح." : "تم تفعيل الحساب بنجاح.",
        });
        router.refresh();
      }
    });
  }

  return (
    <div className="space-y-2">
      {message ? (
        <p
          className={
            message.tone === "error"
              ? "text-sm font-medium text-[var(--danger)]"
              : "text-sm font-medium text-[var(--success)]"
          }
          role={message.tone === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      ) : null}
      <button
        className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:text-[var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
        disabled={disabled || pending}
        onClick={onActivateDeactivate}
        type="button"
      >
        {pending ? "جاري التحديث…" : isActive ? "تعطيل المستخدم" : "تفعيل المستخدم"}
      </button>
    </div>
  );
}
