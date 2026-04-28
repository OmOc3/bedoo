"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isRecord } from "@/lib/utils";
import type { LoginSuccessResponse, UserRole } from "@/types";

function isLoginSuccessResponse(value: unknown): value is LoginSuccessResponse {
  return (
    isRecord(value) &&
    typeof value.redirectTo === "string" &&
    isRecord(value.user) &&
    (value.user.role === "client" ||
      value.user.role === "technician" ||
      value.user.role === "supervisor" ||
      value.user.role === "manager")
  );
}

interface RoleRedirectWatcherProps {
  currentRole: UserRole;
}

export function RoleRedirectWatcher({ currentRole }: RoleRedirectWatcherProps) {
  const router = useRouter();

  useEffect(() => {
    let isCancelled = false;

    async function refreshRole(): Promise<void> {
      try {
        const response = await fetch("/api/auth/current", { cache: "no-store" });
        const payload = (await response.json()) as unknown;

        if (!response.ok || !isLoginSuccessResponse(payload) || isCancelled) {
          return;
        }

        if (payload.user.role !== currentRole) {
          router.replace(payload.redirectTo);
          router.refresh();
        }
      } catch (_error: unknown) {
        // The next navigation or polling tick will retry session refresh.
      }
    }

    void refreshRole();
    const intervalId = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        void refreshRole();
      }
    }, 5000);

    window.addEventListener("focus", refreshRole);

    return () => {
      isCancelled = true;
      window.clearInterval(intervalId);
      window.removeEventListener("focus", refreshRole);
    };
  }, [currentRole, router]);

  return null;
}
