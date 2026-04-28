"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type MouseEvent } from "react";
import { cn } from "@/lib/utils";
import type { Coordinates } from "@/types";

const tileSize = 256;
const defaultMapCenter: Coordinates = { lat: 30.0444, lng: 31.2357 };
const emptyMarkers: StationMapMarker[] = [];
const minZoom = 3;
const maxZoom = 18;

export interface StationMapMarker {
  coordinates: Coordinates;
  href?: string;
  id: string;
  label: string;
}

interface StationMapProps {
  className?: string;
  defaultCenter?: Coordinates;
  markers?: StationMapMarker[];
  onSelect?: (coordinates: Coordinates) => void;
  selected?: Coordinates;
  zoom?: number;
}

interface Size {
  height: number;
  width: number;
}

interface WorldPoint {
  x: number;
  y: number;
}

interface Tile {
  key: string;
  left: number;
  top: number;
  url: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function normalizeLng(lng: number): number {
  if (!Number.isFinite(lng)) {
    return defaultMapCenter.lng;
  }

  return ((((lng + 180) % 360) + 360) % 360) - 180;
}

function normalizeCoordinates(coordinates: Coordinates): Coordinates {
  return {
    lat: clamp(coordinates.lat, -85.05112878, 85.05112878),
    lng: normalizeLng(coordinates.lng),
  };
}

function latLngToWorld(coordinates: Coordinates, zoom: number): WorldPoint {
  const normalized = normalizeCoordinates(coordinates);
  const sinLat = Math.sin((normalized.lat * Math.PI) / 180);
  const scale = tileSize * 2 ** zoom;

  return {
    x: ((normalized.lng + 180) / 360) * scale,
    y: (0.5 - Math.log((1 + sinLat) / (1 - sinLat)) / (4 * Math.PI)) * scale,
  };
}

function worldToLatLng(point: WorldPoint, zoom: number): Coordinates {
  const scale = tileSize * 2 ** zoom;
  const lng = (point.x / scale) * 360 - 180;
  const latitudeRadians = Math.atan(Math.sinh(Math.PI - (2 * Math.PI * point.y) / scale));

  return normalizeCoordinates({
    lat: (latitudeRadians * 180) / Math.PI,
    lng,
  });
}

function markerCenter(markers: StationMapMarker[], fallback: Coordinates): Coordinates {
  if (markers.length === 0) {
    return fallback;
  }

  const totals = markers.reduce(
    (current, marker) => ({
      lat: current.lat + marker.coordinates.lat,
      lng: current.lng + marker.coordinates.lng,
    }),
    { lat: 0, lng: 0 },
  );

  return normalizeCoordinates({
    lat: totals.lat / markers.length,
    lng: totals.lng / markers.length,
  });
}

function tileUrl(zoom: number, x: number, y: number): string {
  const tilesPerAxis = 2 ** zoom;
  const normalizedX = ((x % tilesPerAxis) + tilesPerAxis) % tilesPerAxis;
  const normalizedY = clamp(y, 0, tilesPerAxis - 1);

  return `https://tile.openstreetmap.org/${zoom}/${normalizedX}/${normalizedY}.png`;
}

function mapTiles(center: Coordinates, zoom: number, size: Size): Tile[] {
  const centerWorld = latLngToWorld(center, zoom);
  const topLeft = {
    x: centerWorld.x - size.width / 2,
    y: centerWorld.y - size.height / 2,
  };
  const minTileX = Math.floor(topLeft.x / tileSize);
  const maxTileX = Math.floor((topLeft.x + size.width) / tileSize);
  const minTileY = Math.floor(topLeft.y / tileSize);
  const maxTileY = Math.floor((topLeft.y + size.height) / tileSize);
  const tiles: Tile[] = [];

  for (let x = minTileX; x <= maxTileX; x += 1) {
    for (let y = minTileY; y <= maxTileY; y += 1) {
      tiles.push({
        key: `${zoom}-${x}-${y}`,
        left: x * tileSize - topLeft.x,
        top: y * tileSize - topLeft.y,
        url: tileUrl(zoom, x, y),
      });
    }
  }

  return tiles;
}

function markerPosition(coordinates: Coordinates, center: Coordinates, zoom: number, size: Size): WorldPoint {
  const centerWorld = latLngToWorld(center, zoom);
  const markerWorld = latLngToWorld(coordinates, zoom);

  return {
    x: size.width / 2 + markerWorld.x - centerWorld.x,
    y: size.height / 2 + markerWorld.y - centerWorld.y,
  };
}

function formatCoordinate(value: number): string {
  return value.toFixed(6);
}

export function StationMap({
  className,
  defaultCenter = defaultMapCenter,
  markers = emptyMarkers,
  onSelect,
  selected,
  zoom = 14,
}: StationMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState<Size>({ height: 320, width: 640 });
  const [currentZoom, setCurrentZoom] = useState(clamp(Math.round(zoom), minZoom, maxZoom));
  const initialCenter = useMemo(
    () => normalizeCoordinates(selected ?? markerCenter(markers, defaultCenter)),
    [defaultCenter, markers, selected],
  );
  const [center, setCenter] = useState(initialCenter);
  const tiles = useMemo(() => mapTiles(center, currentZoom, size), [center, currentZoom, size]);
  const displayedMarkers = selected
    ? [
        ...markers,
        {
          coordinates: selected,
          id: "__selected",
          label: "الموقع المحدد",
        },
      ]
    : markers;

  useEffect(() => {
    setCenter(initialCenter);
  }, [initialCenter]);

  useEffect(() => {
    const node = containerRef.current;

    if (!node) {
      return;
    }

    const updateSize = () => {
      const rect = node.getBoundingClientRect();
      const width = Math.max(Math.round(rect.width), 320);
      const height = Math.max(Math.round(rect.height), 260);

      setSize({ height, width });
    };
    const observer = new ResizeObserver(updateSize);

    updateSize();
    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  function selectCoordinates(coordinates: Coordinates): void {
    const rounded = {
      lat: Number(formatCoordinate(coordinates.lat)),
      lng: Number(formatCoordinate(coordinates.lng)),
    };

    setCenter(rounded);
    onSelect?.(rounded);
  }

  function handleSelect(event: MouseEvent<HTMLDivElement>): void {
    if (!onSelect) {
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const centerWorld = latLngToWorld(center, currentZoom);
    const coordinates = worldToLatLng(
      {
        x: centerWorld.x + event.clientX - rect.left - rect.width / 2,
        y: centerWorld.y + event.clientY - rect.top - rect.height / 2,
      },
      currentZoom,
    );
    selectCoordinates(coordinates);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (!onSelect || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    selectCoordinates(center);
  }

  function zoomBy(delta: number): void {
    setCurrentZoom((value) => clamp(value + delta, minZoom, maxZoom));
  }

  return (
    <div className={cn("space-y-3", className)} dir="rtl">
      <div
        aria-label={onSelect ? "خريطة اختيار موقع المحطة" : "خريطة مواقع المحطات"}
        className={cn(
          "relative h-80 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface-subtle)] shadow-card",
          onSelect ? "cursor-crosshair" : "cursor-default",
        )}
        onClick={handleSelect}
        onKeyDown={handleKeyDown}
        ref={containerRef}
        role={onSelect ? "application" : "region"}
        tabIndex={onSelect ? 0 : undefined}
      >
        {tiles.map((tile) => (
          <div
            aria-hidden="true"
            className="absolute h-64 w-64 bg-cover bg-center"
            key={tile.key}
            style={{
              backgroundImage: `url(${tile.url})`,
              left: tile.left,
              top: tile.top,
            }}
          />
        ))}

      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[rgb(255_255_255_/_0.1)] via-transparent to-[var(--foreground)]/10" />

        {displayedMarkers.map((marker) => {
          const position = markerPosition(marker.coordinates, center, currentZoom, size);
          const isSelected = marker.id === "__selected";
          const markerContent = (
            <span
              className={cn(
                "flex max-w-44 -translate-x-1/2 -translate-y-full flex-col items-center gap-1 text-center text-xs font-bold",
                isSelected ? "text-teal-800 dark:text-teal-300" : "text-[var(--foreground)]",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-5 w-5 rounded-full border-2 border-white shadow-lg ring-2",
                  isSelected ? "bg-teal-600 ring-teal-200" : "bg-[var(--foreground)] ring-[var(--border)]",
                )}
              />
              <span className="rounded-full bg-[var(--surface)] px-2 py-1 shadow-control">{marker.label}</span>
            </span>
          );

          return marker.href ? (
            <a
              className="absolute z-20"
              href={marker.href}
              key={marker.id}
              onClick={(event) => event.stopPropagation()}
              style={{ left: position.x, top: position.y }}
            >
              {markerContent}
            </a>
          ) : (
            <span
              className="absolute z-20"
              key={marker.id}
              style={{ left: position.x, top: position.y }}
            >
              {markerContent}
            </span>
          );
        })}

        <div className="absolute left-3 top-3 z-30 flex overflow-hidden rounded-lg border border-[var(--border)] bg-[var(--surface)] shadow-card">
          <button
            aria-label="تكبير الخريطة"
            className="grid h-10 w-10 place-items-center text-lg font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] disabled:text-[var(--muted)]"
            disabled={currentZoom >= maxZoom}
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(1);
            }}
            type="button"
          >
            +
          </button>
          <button
            aria-label="تصغير الخريطة"
            className="grid h-10 w-10 place-items-center border-s-0 border-[var(--border)] text-lg font-bold text-[var(--foreground)] transition-colors hover:bg-[var(--surface-subtle)] disabled:text-[var(--muted)]"
            disabled={currentZoom <= minZoom}
            onClick={(event) => {
              event.stopPropagation();
              zoomBy(-1);
            }}
            type="button"
          >
            -
          </button>
        </div>
      </div>

      {selected ? (
        <p className="text-xs font-medium text-[var(--muted)]" dir="ltr">
          {formatCoordinate(selected.lat)}, {formatCoordinate(selected.lng)}
        </p>
      ) : null}
    </div>
  );
}
