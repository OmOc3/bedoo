"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useLanguage } from "@/components/i18n/language-provider";
import { formatDateTimeRome } from "@/lib/datetime";
import { getIntlLocaleForApp } from "@/lib/i18n";

interface NearbyStation {
  distanceMeters: number;
  label: string;
  lastVisitedAt?: string;
  lastVisitedBy?: string;
  location: string;
  photoUrl?: string;
  stationId: string;
  zone?: string;
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
      timeout: 15_000,
    });
  });
}

export function NearbyStations() {
  const { locale, messages, translate } = useLanguage();
  const rf = messages.reportFlow;
  const intlLocale = useMemo(() => getIntlLocaleForApp(locale), [locale]);

  const formatDistanceLabel = useCallback(
    (value: number): string => {
      if (locale === "en") {
        return value < 1000 ? `${Math.round(value)} m` : `${(value / 1000).toFixed(1)} km`;
      }
      return value < 1000 ? `${Math.round(value)} م` : `${(value / 1000).toFixed(1)} كم`;
    },
    [locale],
  );

  const formatTimestamp = useCallback(
    (value?: string): string => {
      if (!value) {
        return messages.stations.neverVisited;
      }

      const date = new Date(value);

      if (Number.isNaN(date.getTime())) {
        return messages.common.unavailable;
      }

      return formatDateTimeRome(date, {
        locale: intlLocale,
        unavailableLabel: messages.common.unavailable,
      });
    },
    [intlLocale, messages.common.unavailable, messages.stations.neverVisited],
  );

  const [stations, setStations] = useState<NearbyStation[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "ready">("idle");
  const [message, setMessage] = useState<string | null>(null);

  const loadNearbyStations = useCallback(async (): Promise<void> => {
    setStatus("loading");
    setMessage(null);

    try {
      const position = await readPosition(rf.geoUnsupported);
      const params = new URLSearchParams({
        lat: String(position.coords.latitude),
        lng: String(position.coords.longitude),
      });

      if (Number.isFinite(position.coords.accuracy)) {
        params.set("accuracyMeters", String(position.coords.accuracy));
      }

      const response = await fetch(`/api/stations/nearby?${params.toString()}`, { cache: "no-store" });
      const payload = (await response.json()) as unknown;

      if (!response.ok) {
        const error = payload && typeof payload === "object" && "error" in payload ? String(payload.error) : "";
        throw new Error(error || rf.nearbyFetchFailed);
      }

      setStations(Array.isArray(payload) ? (payload as NearbyStation[]) : []);
      setStatus("ready");
    } catch (error: unknown) {
      setStations([]);
      setStatus("idle");
      setMessage(error instanceof Error ? error.message : rf.nearbyLocationFailed);
    }
  }, [rf.geoUnsupported, rf.nearbyFetchFailed, rf.nearbyLocationFailed]);

  useEffect(() => {
    void loadNearbyStations();
  }, [loadNearbyStations]);

  return (
    <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 shadow-control">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-[var(--foreground)]">{rf.nearbyTitle}</h2>
          <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{rf.nearbyLead}</p>
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={status === "loading"}
          onClick={() => void loadNearbyStations()}
          type="button"
        >
          {status === "loading" ? rf.locating : rf.refreshLocation}
        </button>
      </div>

      {message ? <p className="mt-4 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--danger)]">{translate(message)}</p> : null}

      {status === "loading" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div className="h-40 animate-pulse rounded-xl bg-[var(--surface-subtle)]" key={item} />
          ))}
        </div>
      ) : null}

      {status === "ready" && stations.length === 0 ? (
        <div className="mt-4 rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] p-5 text-sm leading-6 text-[var(--muted)]">
          {rf.nearbyEmpty}
        </div>
      ) : null}

      {stations.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stations.map((station) => (
            <article className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4" key={station.stationId}>
              {station.photoUrl ? (
                <Image
                  alt={`${rf.stationPhotoAlt} ${station.label}`}
                  className="mb-3 h-32 w-full rounded-lg border border-[var(--border)] object-cover"
                  height={128}
                  src={station.photoUrl}
                  unoptimized
                  width={320}
                />
              ) : null}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-teal-700" dir="ltr">
                    #{station.stationId}
                  </p>
                  <h3 className="truncate text-base font-bold text-[var(--foreground)]">{station.label}</h3>
                  <p className="mt-1 text-sm leading-6 text-[var(--muted)]">{station.location}</p>
                </div>
                <span className="shrink-0 rounded-lg bg-teal-50 px-2 py-1 text-xs font-semibold text-teal-700 dark:bg-teal-900/30 dark:text-teal-300">
                  {formatDistanceLabel(station.distanceMeters)}
                </span>
              </div>
              <div className="mt-3 rounded-lg bg-[var(--surface-subtle)] px-3 py-2 text-xs leading-5 text-[var(--muted)]">
                {rf.lastVisit} {formatTimestamp(station.lastVisitedAt)}
                {station.lastVisitedBy ? ` · ${rf.by} ${station.lastVisitedBy}` : ""}
              </div>
              <Link
                className="mt-4 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold text-[var(--primary-foreground)] transition-colors hover:bg-[var(--primary-hover)]"
                href={`/station/${station.stationId}/report`}
              >
                {rf.openStation}
              </Link>
            </article>
          ))}
        </div>
      ) : null}
    </section>
  );
}
