"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { submitStationReportAction, type SubmitReportActionResult } from "@/app/actions/reports";
import { useLanguage } from "@/components/i18n/language-provider";
import { Button } from "@/components/ui/button";
import { getIntlLocaleForApp } from "@/lib/i18n";
import { distanceMeters, maxLocationAccuracyMeters, stationAccessRadiusMeters } from "@/lib/geo";
import { maxReportImageSizeBytes } from "@/lib/reports/image-constraints";
import { submitReportSchema, type SubmitReportValues } from "@/lib/validation/reports";
import type { Coordinates, PestTypeOption, StatusOption } from "@/types";
import { pestTypeOptions, reportStatusOptions } from "@ecopest/shared/constants";

const statusOptions = reportStatusOptions as unknown as StatusOption[];
const maxReportImagePayloadBytes = 11 * 1024 * 1024;

type ReportLocationCheck =
  | { status: "idle" | "checking"; message: string | null; distanceMeters?: undefined }
  | { status: "ready"; message: string; distanceMeters: number }
  | { status: "blocked"; message: string; distanceMeters?: number };

type ReportPosition = Coordinates & {
  accuracyMeters?: number;
};

interface ReportFormProps {
  blockedReason?: string;
  canSubmit?: boolean;
  requiresLocationCheck?: boolean;
  stationCoordinates?: Coordinates;
  stationId: string;
  stationLabel: string;
}

function readPosition(geoUnsupportedMessage: string): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error(geoUnsupportedMessage));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      maximumAge: 10_000,
      timeout: 20_000,
    });
  });
}

function positionToReportLocation(position: GeolocationPosition): ReportPosition {
  return {
    ...(Number.isFinite(position.coords.accuracy) ? { accuracyMeters: position.coords.accuracy } : {}),
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  };
}

function locationToFormData(formData: FormData, location: ReportPosition): void {
  formData.set("lat", String(location.lat));
  formData.set("lng", String(location.lng));

  if (typeof location.accuracyMeters === "number") {
    formData.set("accuracyMeters", String(location.accuracyMeters));
  }
}

function toFormData(values: SubmitReportValues): FormData {
  const formData = new FormData();

  values.status.forEach((status) => {
    formData.append("status", status);
  });

  values.pestTypes.forEach((pest) => {
    formData.append("pestTypes", pest);
  });

  if (values.notes) {
    formData.set("notes", values.notes);
  }

  if (values.beforePhoto instanceof File) {
    formData.set("beforePhoto", values.beforePhoto);
  }
  if (values.afterPhoto instanceof File) {
    formData.set("afterPhoto", values.afterPhoto);
  }
  if (values.stationPhoto instanceof File) {
    formData.set("stationPhoto", values.stationPhoto);
  }
  values.duringPhotos?.forEach((file) => {
    if (file instanceof File) {
      formData.append("duringPhotos", file);
    }
  });
  values.otherPhotos?.forEach((file) => {
    if (file instanceof File) {
      formData.append("otherPhotos", file);
    }
  });

  return formData;
}

function getFieldError(
  actionResult: SubmitReportActionResult | null,
  fieldName: keyof SubmitReportValues,
): string | undefined {
  return actionResult?.fieldErrors?.[fieldName]?.[0];
}

function selectedReportFiles(values: SubmitReportValues): File[] {
  return [
    values.beforePhoto,
    values.afterPhoto,
    values.stationPhoto,
    ...(values.duringPhotos ?? []),
    ...(values.otherPhotos ?? []),
  ].filter((file): file is File => file instanceof File && file.size > 0);
}

export function ReportForm({
  blockedReason,
  canSubmit = true,
  requiresLocationCheck = false,
  stationCoordinates,
  stationId,
  stationLabel,
}: ReportFormProps) {
  const { direction, locale, messages, pestTypeLabels, statusOptionLabels, translate } = useLanguage();
  const intlLocale = useMemo(() => getIntlLocaleForApp(locale), [locale]);
  const [actionResult, setActionResult] = useState<SubmitReportActionResult | null>(null);
  const [submittedAt, setSubmittedAt] = useState<Date | null>(null);
  const [locationCheck, setLocationCheck] = useState<ReportLocationCheck>({
    status: requiresLocationCheck ? "checking" : "idle",
    message: requiresLocationCheck ? messages.reportFlow.checkingLocation : null,
  });
  const form = useForm<SubmitReportValues>({
    resolver: zodResolver(submitReportSchema),
    defaultValues: {
      stationId,
      status: [],
      pestTypes: [] as PestTypeOption[],
      notes: "",
    },
  });

  const formatDistanceLabel = useCallback(
    (value: number): string => {
      if (locale === "en") {
        return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
      }
      return value < 1000 ? `${Math.round(value)} متر` : `${(value / 1000).toFixed(1)} كم`;
    },
    [locale],
  );

  const validateReportLocation = useCallback(
    (stationCoords: Coordinates | undefined, location: ReportPosition): ReportLocationCheck => {
      if (!stationCoords) {
        return {
          status: "blocked",
          message:
            locale === "en"
              ? "No coordinates are saved for this station. Contact the manager to update the station location before saving the report."
              : "لا توجد إحداثيات مسجلة لهذه المحطة. تواصل مع المدير لتحديث موقع المحطة قبل حفظ التقرير.",
        };
      }

      if (
        typeof location.accuracyMeters === "number" &&
        (!Number.isFinite(location.accuracyMeters) || location.accuracyMeters > maxLocationAccuracyMeters)
      ) {
        return {
          status: "blocked",
          message:
            locale === "en"
              ? "Location accuracy is low. Turn on GPS, move closer to the station, then try again."
              : "دقة الموقع ضعيفة. فعّل GPS واقترب من المحطة ثم حاول مرة أخرى.",
        };
      }

      const distance = Math.round(distanceMeters(location, stationCoords));

      if (distance > stationAccessRadiusMeters) {
        return {
          distanceMeters: distance,
          status: "blocked",
          message:
            locale === "en"
              ? `This station is outside the allowed radius (distance: ${formatDistanceLabel(distance)}). You must be within ${stationAccessRadiusMeters} meters to submit the report.`
              : `المحطة دي خارج النطاق المسموح (المسافة: ${formatDistanceLabel(distance)}). لازم تكون داخل ${stationAccessRadiusMeters} متر عشان تسجل التقرير.`,
        };
      }

      return {
        distanceMeters: distance,
        status: "ready",
        message:
          locale === "en"
            ? `You are within the station radius (distance: ${formatDistanceLabel(distance)}).`
            : `أنت داخل نطاق المحطة (المسافة: ${formatDistanceLabel(distance)}).`,
      };
    },
    [formatDistanceLabel, locale],
  );

  const imageSizeError = useCallback(
    (values: SubmitReportValues): string | null => {
      const files = selectedReportFiles(values);
      const oversizedFile = files.find((file) => file.size > maxReportImageSizeBytes);

      if (oversizedFile) {
        return locale === "en"
          ? `Image ${oversizedFile.name} must not exceed 5 MB.`
          : `حجم الصورة ${oversizedFile.name} يجب ألا يتجاوز 5 ميجابايت.`;
      }

      const totalBytes = files.reduce((total, file) => total + file.size, 0);

      if (totalBytes > maxReportImagePayloadBytes) {
        return locale === "en"
          ? "Total report images are too large. Reduce the number or size of images and try again."
          : "إجمالي صور التقرير كبير جدًا. قلل عدد الصور أو حجمها ثم حاول مرة أخرى.";
      }

      return null;
    },
    [locale],
  );

  const refreshLocationCheck = useCallback(async (): Promise<{
    check: ReportLocationCheck;
    location: ReportPosition | null;
  }> => {
    if (!requiresLocationCheck) {
      const nextCheck: ReportLocationCheck = { status: "idle", message: null };
      setLocationCheck(nextCheck);
      return { check: nextCheck, location: null };
    }

    setLocationCheck({
      status: "checking",
      message: messages.reportFlow.checkingLocation,
    });

    try {
      const position = await readPosition(messages.reportFlow.geoUnsupported);
      const location = positionToReportLocation(position);
      const nextCheck = validateReportLocation(stationCoordinates, location);

      setLocationCheck(nextCheck);

      return {
        check: nextCheck,
        location: nextCheck.status === "ready" ? location : null,
      };
    } catch {
      const nextCheck: ReportLocationCheck = {
        status: "blocked",
        message:
          locale === "en"
            ? "Unable to read your current location. Allow location access and try again."
            : "تعذر قراءة موقعك الحالي. اسمح بقراءة الموقع ثم حاول مرة أخرى.",
      };

      setLocationCheck(nextCheck);
      return { check: nextCheck, location: null };
    }
  }, [locale, messages.reportFlow, requiresLocationCheck, stationCoordinates, validateReportLocation]);

  useEffect(() => {
    if (requiresLocationCheck) {
      void refreshLocationCheck();
    }
  }, [refreshLocationCheck, requiresLocationCheck]);

  async function onSubmit(values: SubmitReportValues): Promise<void> {
    setActionResult(null);
    const fileError = imageSizeError(values);

    if (fileError) {
      setActionResult({ error: fileError });
      return;
    }

    const formData = toFormData(values);

    if (requiresLocationCheck) {
      const { check, location } = await refreshLocationCheck();

      if (check.status !== "ready" || !location) {
        setActionResult({
          error:
            check.message ??
            (locale === "en"
              ? "This station is outside the allowed area; the report cannot be saved."
              : "المحطة دي خارج النطاق ولا يمكن حفظ التقرير."),
        });
        return;
      }

      locationToFormData(formData, location);
    }

    const result = await submitStationReportAction(stationId, formData);

    if (result.success) {
      setSubmittedAt(new Date());
    }

    setActionResult(result);
  }

  const formDir = direction === "rtl" ? "rtl" : "ltr";

  if (actionResult?.success) {
    const formattedSuccessDate = new Intl.DateTimeFormat(intlLocale, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(submittedAt ?? new Date());

    return (
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center shadow-card sm:p-6">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[var(--success-soft)] text-lg font-bold text-[var(--success)]">
          ✓
        </div>
        <h2 className="text-xl font-bold text-[var(--foreground)]">{messages.reportFlow.savedTitle}</h2>
        <p className="mt-2 text-base leading-7 text-[var(--muted)]">
          {locale === "en" ? (
            <>
              Report for <span className="font-semibold text-[var(--foreground)]">{stationLabel}</span> saved on{" "}
              {formattedSuccessDate}
            </>
          ) : (
            <>
              تم تسجيل تقرير {stationLabel} في {formattedSuccessDate}
            </>
          )}
        </p>
        <Link
          className="mt-5 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-3 text-base font-semibold text-[var(--primary-foreground)] shadow-sm transition-all duration-150 hover:bg-[var(--primary-hover)] active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          href="/scan"
        >
          {messages.reportFlow.scanAnother}
        </Link>
      </div>
    );
  }

  const statusError = form.formState.errors.status?.message ?? getFieldError(actionResult, "status");
  const pestTypesError = form.formState.errors.pestTypes?.message ?? getFieldError(actionResult, "pestTypes");
  const notesError = form.formState.errors.notes?.message ?? getFieldError(actionResult, "notes");
  const duringPhotosError = form.formState.errors.duringPhotos?.message ?? getFieldError(actionResult, "duringPhotos");
  const otherPhotosError = form.formState.errors.otherPhotos?.message ?? getFieldError(actionResult, "otherPhotos");
  const isLocationBlocked = requiresLocationCheck && locationCheck.status !== "ready";
  const locationMessageTone =
    locationCheck.status === "ready"
      ? "border-green-200 bg-green-50 text-green-800"
      : locationCheck.status === "blocked"
        ? "border-red-200 bg-red-50 text-red-800"
        : "border-amber-200 bg-amber-50 text-amber-800";

  return (
    <form className="space-y-5" dir={formDir} onSubmit={form.handleSubmit(onSubmit)}>
      {actionResult?.error ? (
        <p className="rounded-lg border border-[var(--danger-muted)] bg-[var(--danger-soft)] px-4 py-3 text-sm font-medium text-[var(--danger)]" role="alert">
          {translate(actionResult.error)}
        </p>
      ) : null}

      {!canSubmit && blockedReason ? (
        <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800">{translate(blockedReason)}</p>
      ) : null}

      {requiresLocationCheck && locationCheck.message ? (
        <div
          className={`rounded-lg border px-4 py-3 text-sm font-medium ${locationMessageTone}`}
          role={locationCheck.status === "blocked" ? "alert" : "status"}
        >
          <p>{translate(locationCheck.message)}</p>
          {locationCheck.status === "blocked" ? (
            <button
              className="mt-3 inline-flex min-h-10 items-center justify-center rounded-lg border border-current px-3 py-2 text-sm font-semibold"
              onClick={() => void refreshLocationCheck()}
              type="button"
            >
              {messages.reportFlow.recheckLocation}
            </button>
          ) : null}
        </div>
      ) : null}

      <input type="hidden" value={stationId} {...form.register("stationId")} />

      <div className="rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-4">
        <h2 className="text-lg font-bold text-[var(--foreground)]">{messages.reportFlow.treatmentProgram}</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">{messages.reportFlow.treatmentProgramLead}</p>
      </div>

      <fieldset
        aria-describedby={pestTypesError ? "pest-types-error" : undefined}
        aria-invalid={Boolean(pestTypesError)}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-bold text-[var(--foreground)]">{messages.reportFlow.pestTypesLegend}</legend>
        {pestTypeOptions.map((pest) => (
          <label
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:hover:bg-teal-900/30 dark:has-[:checked]:bg-teal-900/30"
            key={pest}
          >
            <input
              className="h-5 w-5 rounded accent-teal-600"
              type="checkbox"
              value={pest}
              {...form.register("pestTypes")}
            />
            <span className="text-base font-medium text-[var(--foreground)]">{pestTypeLabels[pest]}</span>
          </label>
        ))}
        {pestTypesError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="pest-types-error" role="alert">
            {pestTypesError}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        aria-describedby={statusError ? "status-error" : undefined}
        aria-invalid={Boolean(statusError)}
        className="space-y-2"
      >
        <legend className="mb-2 text-base font-bold text-[var(--foreground)]">{messages.reportFlow.stationStatusLegend}</legend>
        {statusOptions.map((status) => (
          <label
            className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 transition-colors hover:border-teal-300 hover:bg-teal-50 has-[:checked]:border-teal-500 has-[:checked]:bg-teal-50 dark:hover:bg-teal-900/30 dark:has-[:checked]:bg-teal-900/30"
            key={status}
          >
            <input
              className="h-5 w-5 rounded accent-teal-600"
              type="checkbox"
              value={status}
              {...form.register("status")}
            />
            <span className="text-base font-medium text-[var(--foreground)]">{statusOptionLabels[status]}</span>
          </label>
        ))}
        {statusError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="status-error" role="alert">
            {statusError}
          </p>
        ) : null}
      </fieldset>

      <div className="space-y-2">
        <label className="block text-base font-bold text-[var(--foreground)]" htmlFor="notes">
          {messages.reportFlow.notes}
        </label>
        <textarea
          aria-describedby={notesError ? "notes-error" : undefined}
          aria-invalid={Boolean(notesError)}
          className="min-h-24 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-3 text-base text-[var(--foreground)] placeholder:text-[var(--muted)] transition-colors hover:border-[color-mix(in_srgb,var(--border)_50%,var(--foreground)_50%)] focus:border-[var(--primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          id="notes"
          maxLength={500}
          placeholder={messages.reportFlow.notesPlaceholder}
          {...form.register("notes")}
        />
        {notesError ? (
          <p className="text-sm font-medium text-[var(--danger)]" id="notes-error" role="alert">
            {notesError}
          </p>
        ) : null}
      </div>

      <div className="space-y-2">
        <p className="text-base font-bold text-[var(--foreground)]">{messages.reportFlow.reportPhotosOptional}</p>
        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="beforePhoto">
              {messages.reportFlow.photoBefore}
            </label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="beforePhoto"
              type="file"
              onChange={(event) => form.setValue("beforePhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="afterPhoto">
              {messages.reportFlow.photoAfter}
            </label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="afterPhoto"
              type="file"
              onChange={(event) => form.setValue("afterPhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="stationPhoto">
              {messages.reportFlow.photoStation}
            </label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="stationPhoto"
              type="file"
              onChange={(event) => form.setValue("stationPhoto", event.target.files?.[0])}
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="duringPhotos">
              {messages.reportFlow.photoDuring}
            </label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="duringPhotos"
              multiple
              type="file"
              onChange={(event) => form.setValue("duringPhotos", Array.from(event.target.files ?? []), { shouldValidate: true })}
            />
            {duringPhotosError ? <p className="mt-1 text-xs text-[var(--danger)]">{duringPhotosError}</p> : null}
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-[var(--foreground)]" htmlFor="otherPhotos">
              {messages.reportFlow.photoExtra}
            </label>
            <input
              accept="image/*"
              className="block min-h-11 w-full rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--muted)] file:me-3 file:rounded-md file:border-0 file:bg-teal-50 file:px-2 file:py-1.5 file:font-semibold file:text-teal-700 dark:file:bg-teal-900/30 dark:file:text-teal-300"
              id="otherPhotos"
              multiple
              type="file"
              onChange={(event) => form.setValue("otherPhotos", Array.from(event.target.files ?? []), { shouldValidate: true })}
            />
            {otherPhotosError ? <p className="mt-1 text-xs text-[var(--danger)]">{otherPhotosError}</p> : null}
          </div>
        </div>
      </div>

      <Button className="w-full py-3 text-base" disabled={!canSubmit || form.formState.isSubmitting || isLocationBlocked} isLoading={form.formState.isSubmitting} type="submit">
        {messages.reportFlow.saveReport}
      </Button>
    </form>
  );
}
