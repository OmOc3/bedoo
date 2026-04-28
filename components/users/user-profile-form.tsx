"use client";

import { useState } from "react";
import { updateUserProfileAction } from "@/app/actions/users";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/text-field";
import type { AppUser } from "@/types";

export function UserProfileForm({ user, disabled }: { user: Pick<AppUser, "uid" | "displayName" | "image">; disabled?: boolean }) {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (disabled || isSubmitting) return;
    setIsSubmitting(true);
    setMessage(null);

    try {
      let imageUrl = user.image || undefined;
      
      if (imageFile) {
        const fileForm = new FormData();
        fileForm.set("image", imageFile);
        fileForm.set("uid", user.uid);
        
        const res = await fetch("/api/upload-profile-image", { method: "POST", body: fileForm });
        if (!res.ok) {
          throw new Error("فشل رفع الصورة");
        }
        const { url } = await res.json();
        imageUrl = url;
      }

      const formData = new FormData();
      formData.set("displayName", displayName);
      if (imageUrl) {
        formData.set("image", imageUrl);
      }

      const result = await updateUserProfileAction(user.uid, formData);

      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: "تم تحديث الملف الشخصي بنجاح." });
        setImageFile(null);
      }
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "حدث خطأ غير متوقع.";
      setMessage({ type: "error", text: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-4 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-card" onSubmit={handleSubmit}>
      <h3 className="border-r-2 border-[var(--primary)] pr-3 text-base font-semibold text-[var(--foreground)]">تحديث الملف الشخصي</h3>
      
      {message && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${message.type === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/30 dark:text-emerald-300" : "border-[var(--danger-muted)] bg-[var(--danger-soft)] text-[var(--danger)]"}`}>
          {message.text}
        </div>
      )}

      <TextField
        id={`name-${user.uid}`}
        label="الاسم"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        disabled={disabled || isSubmitting}
      />
      
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-[var(--foreground)]" htmlFor={`image-${user.uid}`}>
          تحديث الصورة
        </label>
        <input
          accept="image/*"
          className="block w-full text-sm text-[var(--muted)] file:mr-4 file:rounded-full file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-teal-700 hover:file:bg-teal-100 dark:file:bg-teal-900/30 dark:file:text-teal-300"
          id={`image-${user.uid}`}
          onChange={(e) => setImageFile(e.target.files?.[0] ?? null)}
          type="file"
          disabled={disabled || isSubmitting}
        />
      </div>

      <Button disabled={disabled || isSubmitting} isLoading={isSubmitting} type="submit" variant="secondary" className="w-full">
        حفظ التعديلات
      </Button>
    </form>
  );
}
