"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { signOut } from "firebase/auth";
import { Button } from "@/components/ui/button";
import { getFirebaseAuth } from "@/lib/firebase";
import { i18n } from "@/lib/i18n";

export function LogoutButton() {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogout(): Promise<void> {
    try {
      setError(null);
      setIsPending(true);
      await fetch("/api/auth/session", { method: "DELETE" });
      await signOut(getFirebaseAuth());
      router.replace("/login");
      router.refresh();
    } catch (_error: unknown) {
      setError(i18n.auth.logoutError);
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="space-y-2">
      <Button isLoading={isPending} onClick={handleLogout} variant="secondary">
        {i18n.actions.logout}
      </Button>
      {error ? (
        <p className="text-center text-sm font-medium text-[var(--danger)]" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
