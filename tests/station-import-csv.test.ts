import test from "node:test";
import assert from "node:assert/strict";
import { previewStationImportCsv, stationImportCsvHeaders } from "../lib/stations/import-csv.ts";

const header = stationImportCsvHeaders.join(",");

test("previewStationImportCsv validates a pending KODE station row", () => {
  const csv = [
    header,
    "client-1,Common Area Kode Club Eco Pest 2026.pdf,2026-03,KODE - Common Area,bait_station,BS-057,KODE BS-057,Common Area,Imported from layout,pending_field_verification,Needs field review,,",
  ].join("\n");

  const preview = previewStationImportCsv(csv);

  assert.equal(preview.rowCount, 1);
  assert.equal(preview.readyCount, 1);
  assert.equal(preview.blockedCount, 0);
  assert.equal(preview.warningCount, 1);
  assert.equal(preview.rows[0].installationStatus, "pending_field_verification");
  assert.equal(preview.rows[0].stationType, "bait_station");
});

test("previewStationImportCsv blocks duplicate rows by type, zone, and external code", () => {
  const csv = [
    header,
    "client-1,Common Area.pdf,2026-03,KODE - Common Area,bait_station,BS-057,KODE BS-057,Common Area,,pending_field_verification,,,",
    "client-1,Common Area.pdf,2026-03,KODE - Common Area,bait_station,BS-057,KODE BS-057 copy,Common Area,,pending_field_verification,,,",
  ].join("\n");

  const preview = previewStationImportCsv(csv);

  assert.equal(preview.blockedCount, 1);
  assert.match(preview.rows[1].errors.join(" "), /مكررة/);
});

test("previewStationImportCsv detects duplicates against existing client stations", () => {
  const csv = [
    header,
    "client-1,Down Parking.pdf,2025-11,KODE - Down Parking,bait_station,BS-027,KODE BS-027,Down Parking,,pending_field_verification,,,",
  ].join("\n");

  const preview = previewStationImportCsv(csv, [
    {
      externalCode: "BS-027",
      label: "KODE BS-027",
      stationId: "000010",
      stationType: "bait_station",
      zone: "KODE - Down Parking",
    },
  ]);

  assert.equal(preview.blockedCount, 1);
  assert.equal(preview.rows[0].duplicateStationId, "000010");
});

test("previewStationImportCsv reports KODE document conflicts without blocking valid rows", () => {
  const csv = [
    header,
    "client-1,layout of pottery station kode club Eco Pest -2026.pdf,2026-02,KODE - Common Area,pottery_station,PS-001,KODE PS-001,Common Area,,pending_field_verification,,,",
  ].join("\n");

  const preview = previewStationImportCsv(csv);

  assert.equal(preview.blockedCount, 0);
  assert.equal(preview.conflicts.length, 1);
  assert.match(preview.conflicts[0], /129/);
});

test("previewStationImportCsv blocks partial coordinates", () => {
  const csv = [
    header,
    "client-1,Common Area.pdf,2026-03,KODE - Common Area,bait_station,BS-057,KODE BS-057,Common Area,,pending_field_verification,,30.1,",
  ].join("\n");

  const preview = previewStationImportCsv(csv);

  assert.equal(preview.blockedCount, 1);
  assert.match(preview.rows[0].errors.join(" "), /lat و lng/);
});
