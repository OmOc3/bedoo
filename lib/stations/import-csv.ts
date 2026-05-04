import { z } from "zod";
import {
  stationInstallationStatuses,
  stationTypeOptions,
  type SharedStationInstallationStatus,
  type SharedStationType,
} from "@ecopest/shared/constants";
import type { Coordinates } from "@/types";

export const stationImportCsvHeaders = [
  "clientUid",
  "sourceFile",
  "sourceReleaseDate",
  "zone",
  "stationType",
  "externalCode",
  "label",
  "location",
  "description",
  "installationStatus",
  "notes",
  "lat",
  "lng",
] as const;

export type StationImportCsvHeader = (typeof stationImportCsvHeaders)[number];
export type StationImportRowStatus = "blocked" | "ready" | "warning";

export interface ExistingStationImportKey {
  externalCode?: string;
  label: string;
  stationId: string;
  stationType: SharedStationType;
  zone?: string;
}

export interface StationImportPreviewRow {
  clientUid: string;
  coordinates?: Coordinates;
  description?: string;
  duplicateStationId?: string;
  errors: string[];
  externalCode?: string;
  fingerprint: string;
  installationStatus: SharedStationInstallationStatus;
  label: string;
  location: string;
  notes?: string;
  rowNumber: number;
  sourceFile: string;
  sourceReleaseDate?: string;
  stationType: SharedStationType;
  status: StationImportRowStatus;
  warnings: string[];
  zone?: string;
}

export interface StationImportPreview {
  blockedCount: number;
  conflicts: string[];
  readyCount: number;
  rowCount: number;
  rows: StationImportPreviewRow[];
  warningCount: number;
}

const maxImportRows = 500;

const importCellSchema = z.object({
  clientUid: z.string().trim().min(1).max(160),
  description: z.string().trim().max(800).optional(),
  externalCode: z.string().trim().max(80).optional(),
  installationStatus: z.enum(stationInstallationStatuses),
  label: z.string().trim().min(1).max(120),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
  location: z.string().trim().min(1).max(200),
  notes: z.string().trim().max(800).optional(),
  sourceFile: z.string().trim().min(1).max(240),
  sourceReleaseDate: z.string().trim().max(40).optional(),
  stationType: z.enum(stationTypeOptions),
  zone: z.string().trim().max(80).optional(),
});

function normalizeOptional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function parseCsvRows(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentCell = "";
  let currentRow: string[] = [];
  let inQuotes = false;

  for (let index = 0; index < csvText.length; index += 1) {
    const char = csvText[index];
    const nextChar = csvText[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      currentRow.push(currentCell);
      currentCell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && nextChar === "\n") {
        index += 1;
      }
      currentRow.push(currentCell);
      if (currentRow.some((cell) => cell.trim().length > 0)) {
        rows.push(currentRow);
      }
      currentRow = [];
      currentCell = "";
      continue;
    }

    currentCell += char;
  }

  currentRow.push(currentCell);
  if (currentRow.some((cell) => cell.trim().length > 0)) {
    rows.push(currentRow);
  }

  return rows;
}

function fingerprintFor(input: {
  externalCode?: string;
  label: string;
  stationType: SharedStationType;
  zone?: string;
}): string {
  const stableStationKey = input.externalCode?.toLowerCase() || input.label.toLowerCase();
  return [input.stationType, input.zone?.toLowerCase() ?? "", stableStationKey].join("|");
}

function coordinatesFromCells(latCell?: string, lngCell?: string): {
  coordinates?: Coordinates;
  errors: string[];
} {
  const latText = normalizeOptional(latCell ?? "");
  const lngText = normalizeOptional(lngCell ?? "");

  if (!latText && !lngText) {
    return { errors: [] };
  }

  if (!latText || !lngText) {
    return { errors: ["حدّد lat و lng معًا أو اتركهما فارغين."] };
  }

  const lat = Number(latText);
  const lng = Number(lngText);

  if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lng) || lng < -180 || lng > 180) {
    return { errors: ["الإحداثيات غير صالحة."] };
  }

  return { coordinates: { lat, lng }, errors: [] };
}

function parseHeaderRow(row: string[]): {
  errors: string[];
  indexes: Map<StationImportCsvHeader, number>;
} {
  const normalizedHeaders = row.map((header) => header.trim());
  const indexes = new Map<StationImportCsvHeader, number>();
  const errors: string[] = [];

  stationImportCsvHeaders.forEach((header) => {
    const index = normalizedHeaders.indexOf(header);
    if (index === -1) {
      errors.push(`العمود المطلوب ${header} غير موجود.`);
    } else {
      indexes.set(header, index);
    }
  });

  return { errors, indexes };
}

function cell(row: string[], indexes: ReadonlyMap<StationImportCsvHeader, number>, header: StationImportCsvHeader): string {
  const index = indexes.get(header);
  return index === undefined ? "" : row[index] ?? "";
}

function knownKodeConflicts(rows: readonly StationImportPreviewRow[]): string[] {
  const conflicts: string[] = [];
  const potteryRows = rows.filter(
    (row) => row.stationType === "pottery_station" || row.sourceFile.toLowerCase().includes("pottery"),
  );
  const basementRows = rows.filter((row) => row.sourceFile.toLowerCase().includes("basement"));

  if (potteryRows.length > 0) {
    conflicts.push("KODE pottery sources conflict: PDF mentions 129 stations while Excel mentions 127.");
  }

  if (basementRows.filter((row) => row.externalCode?.toUpperCase().startsWith("BS-")).length > 10) {
    conflicts.push("KODE basement source needs field review: Excel mentions Glue Board basement (10), while the map has more BS markers.");
  }

  return conflicts;
}

export function previewStationImportCsv(
  csvText: string,
  existingStations: readonly ExistingStationImportKey[] = [],
): StationImportPreview {
  const csvRows = parseCsvRows(csvText.trim());

  if (csvRows.length === 0) {
    return { blockedCount: 1, conflicts: ["ملف CSV فارغ."], readyCount: 0, rowCount: 0, rows: [], warningCount: 0 };
  }

  const { errors: headerErrors, indexes } = parseHeaderRow(csvRows[0]);
  if (headerErrors.length > 0) {
    return { blockedCount: 1, conflicts: headerErrors, readyCount: 0, rowCount: 0, rows: [], warningCount: 0 };
  }

  const existingByFingerprint = new Map(
    existingStations.map((station) => [fingerprintFor(station), station.stationId]),
  );
  const seenFingerprints = new Map<string, number>();
  const dataRows = csvRows.slice(1, maxImportRows + 1);
  const rows = dataRows.map((row, index): StationImportPreviewRow => {
    const raw = {
      clientUid: cell(row, indexes, "clientUid"),
      description: normalizeOptional(cell(row, indexes, "description")),
      externalCode: normalizeOptional(cell(row, indexes, "externalCode")),
      installationStatus: cell(row, indexes, "installationStatus"),
      label: cell(row, indexes, "label"),
      lat: normalizeOptional(cell(row, indexes, "lat")),
      lng: normalizeOptional(cell(row, indexes, "lng")),
      location: cell(row, indexes, "location"),
      notes: normalizeOptional(cell(row, indexes, "notes")),
      sourceFile: cell(row, indexes, "sourceFile"),
      sourceReleaseDate: normalizeOptional(cell(row, indexes, "sourceReleaseDate")),
      stationType: cell(row, indexes, "stationType"),
      zone: normalizeOptional(cell(row, indexes, "zone")),
    };
    const parsed = importCellSchema.safeParse(raw);
    const rowNumber = index + 2;
    const errors = parsed.success ? [] : parsed.error.issues.map((issue) => issue.message);
    const safeData = parsed.success
      ? parsed.data
      : {
          clientUid: raw.clientUid.trim(),
          description: raw.description,
          externalCode: raw.externalCode,
          installationStatus: "pending_field_verification" as const,
          label: raw.label.trim(),
          location: raw.location.trim(),
          notes: raw.notes,
          sourceFile: raw.sourceFile.trim(),
          sourceReleaseDate: raw.sourceReleaseDate,
          stationType: "bait_station" as const,
          zone: raw.zone,
        };
    const coordinates = coordinatesFromCells(raw.lat, raw.lng);
    const fingerprint = fingerprintFor(safeData);
    const duplicateStationId = existingByFingerprint.get(fingerprint);
    const previousRowNumber = seenFingerprints.get(fingerprint);
    const warnings: string[] = [];

    if (coordinates.errors.length > 0) {
      errors.push(...coordinates.errors);
    }

    if (duplicateStationId) {
      errors.push(`محطة مكررة مع محطة موجودة: ${duplicateStationId}.`);
    }

    if (previousRowNumber !== undefined) {
      errors.push(`محطة مكررة داخل الملف مع الصف ${previousRowNumber}.`);
    }

    if (safeData.installationStatus === "pending_field_verification") {
      warnings.push("ستدخل المحطة غير نشطة حتى اعتماد المسح الميداني.");
    }

    if (safeData.installationStatus === "not_installed") {
      warnings.push("ستدخل المحطة غير نشطة لأنها غير مثبتة.");
    }

    seenFingerprints.set(fingerprint, rowNumber);

    return {
      clientUid: safeData.clientUid,
      coordinates: coordinates.coordinates,
      description: safeData.description,
      duplicateStationId,
      errors,
      externalCode: safeData.externalCode,
      fingerprint,
      installationStatus: safeData.installationStatus,
      label: safeData.label,
      location: safeData.location,
      notes: safeData.notes,
      rowNumber,
      sourceFile: safeData.sourceFile,
      sourceReleaseDate: safeData.sourceReleaseDate,
      stationType: safeData.stationType,
      status: errors.length > 0 ? "blocked" : warnings.length > 0 ? "warning" : "ready",
      warnings,
      zone: safeData.zone,
    };
  });
  const blockedCount = rows.filter((row) => row.status === "blocked").length;
  const warningCount = rows.filter((row) => row.status === "warning").length;
  const readyCount = rows.length - blockedCount;
  const conflicts = knownKodeConflicts(rows);

  if (csvRows.length - 1 > maxImportRows) {
    conflicts.push(`تم تجاهل الصفوف بعد أول ${maxImportRows} صف.`);
  }

  return {
    blockedCount,
    conflicts,
    readyCount,
    rowCount: rows.length,
    rows,
    warningCount,
  };
}

export function stationImportTemplateCsv(clientUid: string): string {
  const safeClientUid = clientUid.trim() || "CLIENT_UID";
  return [
    stationImportCsvHeaders.join(","),
    `${safeClientUid},Common Area Kode Club Eco Pest 2026.pdf,2026-03,KODE - Common Area,bait_station,BS-057,KODE BS-057,Common Area,Imported from layout map,pending_field_verification,Requires field verification,,`,
  ].join("\n");
}
