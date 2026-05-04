import test from "node:test";
import assert from "node:assert/strict";
import {
  parseStationQrExportScope,
  qrCodeValueLooksLikeStationReportUrl,
  resolveStationQrCodeValue,
  stationClientNamesByStationId,
  stationMatchesQrExportScope,
  toStationQrExportItems,
  uniqueStationIds,
} from "../lib/stations/qr-export.ts";
import type { AppTimestamp, Station } from "../types/index.ts";

function timestamp(date: Date): AppTimestamp {
  const millis = date.getTime();

  return {
    nanoseconds: (millis % 1000) * 1_000_000,
    seconds: Math.floor(millis / 1000),
    toDate: () => new Date(millis),
  };
}

function station(overrides: Partial<Station> = {}): Station {
  return {
    createdAt: timestamp(new Date("2026-05-01T12:00:00.000Z")),
    createdBy: "manager-1",
    isActive: true,
    installationStatus: "installed",
    label: "محطة 1",
    location: "الموقع",
    qrCodeValue: "https://ecopest-production.vercel.app/station/000001/report?qr=token",
    requiresImmediateSupervision: false,
    stationId: "000001",
    stationType: "bait_station",
    totalReports: 0,
    ...overrides,
  };
}

test("parseStationQrExportScope defaults unknown scopes to selected", () => {
  assert.equal(parseStationQrExportScope("all"), "all");
  assert.equal(parseStationQrExportScope("last-day"), "last-day");
  assert.equal(parseStationQrExportScope("bad"), "selected");
  assert.equal(parseStationQrExportScope(null), "selected");
});

test("uniqueStationIds trims and deduplicates selected stations", () => {
  assert.deepEqual(uniqueStationIds([" 000001 ", "", "000002", "000001"]), ["000001", "000002"]);
});

test("stationMatchesQrExportScope filters last day and last 7 days by createdAt", () => {
  const now = new Date("2026-05-08T12:00:00.000Z");
  const recent = station({ createdAt: timestamp(new Date("2026-05-08T08:00:00.000Z")) });
  const twoDaysOld = station({ createdAt: timestamp(new Date("2026-05-06T11:59:00.000Z")) });
  const eightDaysOld = station({ createdAt: timestamp(new Date("2026-04-30T11:59:00.000Z")) });

  assert.equal(stationMatchesQrExportScope(recent, "last-day", now), true);
  assert.equal(stationMatchesQrExportScope(twoDaysOld, "last-day", now), false);
  assert.equal(stationMatchesQrExportScope(twoDaysOld, "last-7-days", now), true);
  assert.equal(stationMatchesQrExportScope(eightDaysOld, "last-7-days", now), false);
});

test("stationClientNamesByStationId groups unique client names with Arabic separator", () => {
  const result = stationClientNamesByStationId([
    { clientName: "عميل أ", stationId: "000001" },
    { clientName: "عميل ب", stationId: "000001" },
    { clientName: "عميل أ", stationId: "000001" },
    { clientName: " ", stationId: "000002" },
  ]);

  assert.equal(result.get("000001"), "عميل أ، عميل ب");
  assert.equal(result.has("000002"), false);
});

test("resolveStationQrCodeValue keeps valid station report URLs and rebuilds legacy values", async () => {
  let buildCount = 0;
  const buildUrl = async (stationId: string): Promise<string> => {
    buildCount += 1;
    return `https://ecopest-production.vercel.app/station/${stationId}/report?qr=new`;
  };

  assert.equal(qrCodeValueLooksLikeStationReportUrl("client-station:000001:legacy", "000001"), false);
  assert.equal(
    await resolveStationQrCodeValue(
      station({ qrCodeValue: "https://ecopest-production.vercel.app/station/000001/report?qr=old" }),
      buildUrl,
    ),
    "https://ecopest-production.vercel.app/station/000001/report?qr=old",
  );
  assert.equal(
    await resolveStationQrCodeValue(station({ qrCodeValue: "client-station:000001:legacy" }), buildUrl),
    "https://ecopest-production.vercel.app/station/000001/report?qr=new",
  );
  assert.equal(buildCount, 1);
});

test("toStationQrExportItems applies fallback client name", async () => {
  const items = await toStationQrExportItems(
    [station()],
    new Map(),
    async (stationId) => `https://ecopest-production.vercel.app/station/${stationId}/report?qr=new`,
  );

  assert.equal(items[0].clientName, "غير مرتبط");
  assert.equal(items[0].stationId, "000001");
});
