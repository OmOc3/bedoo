"use client";

import { useState } from "react";

interface ReportPhotoLinksProps {
  photoCount: number;
  reportId: string;
}

interface ReportPhotoUrlsResponse {
  photos?: {
    after?: string;
    before?: string;
    station?: string;
  };
}

export function ReportPhotoLinks({ photoCount, reportId }: ReportPhotoLinksProps) {
  const [photos, setPhotos] = useState<ReportPhotoUrlsResponse["photos"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (photoCount === 0) {
    return <p className="mt-3 text-xs text-[var(--muted)]">لا توجد صور مرفقة.</p>;
  }

  async function loadPhotos(): Promise<void> {
    if (photos || isLoading) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(reportId)}/photos`, {
        cache: "no-store",
      });
      const payload = (await response.json().catch(() => ({}))) as ReportPhotoUrlsResponse & { message?: string };

      if (!response.ok) {
        throw new Error(payload.message ?? "تعذر تحميل الصور.");
      }

      setPhotos(payload.photos ?? {});
    } catch (loadError: unknown) {
      setError(loadError instanceof Error ? loadError.message : "تعذر تحميل الصور.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="mt-3">
      <button
        className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--surface-subtle)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        disabled={isLoading}
        onClick={loadPhotos}
        type="button"
      >
        {isLoading ? "جار تحميل الصور..." : `عرض الصور (${photoCount})`}
      </button>

      {error ? <p className="mt-2 text-xs text-[var(--danger)]">{error}</p> : null}

      {photos ? (
        photos.before || photos.after || photos.station ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {photos.station ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
                href={photos.station}
                rel="noreferrer"
                target="_blank"
              >
                صورة المحطة
              </a>
            ) : null}
            {photos.before ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
                href={photos.before}
                rel="noreferrer"
                target="_blank"
              >
                صورة قبل
              </a>
            ) : null}
            {photos.after ? (
              <a
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm font-semibold text-[var(--foreground)] shadow-sm transition-colors hover:bg-[var(--surface-subtle)]"
                href={photos.after}
                rel="noreferrer"
                target="_blank"
              >
                صورة بعد
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-2 text-xs text-[var(--muted)]">لا توجد صور متاحة.</p>
        )
      ) : null}
    </div>
  );
}
