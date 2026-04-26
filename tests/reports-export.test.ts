import test from "node:test";
import assert from "node:assert/strict";
import { csvCell, csvRow, defaultExportDateFrom, statusLabelsForCsv } from "../lib/reports/export.ts";

test("csvCell escapes commas, quotes, and newlines", () => {
  assert.equal(csvCell("plain"), "plain");
  assert.equal(csvCell('a,"b"\nc'), '"a,""b""\nc"');
  assert.equal(csvRow(["رقم", "a,b", 12]), 'رقم,"a,b",12');
  assert.equal(csvCell("=cmd"), "'=cmd");
});

test("defaultExportDateFrom returns start of the default range day", () => {
  const from = defaultExportDateFrom(new Date(2026, 3, 26, 15, 30, 0));

  assert.equal(from.getHours(), 0);
  assert.equal(from.getMinutes(), 0);
  assert.equal(from.getSeconds(), 0);
});

test("statusLabelsForCsv uses shared Arabic labels", () => {
  assert.equal(statusLabelsForCsv(["station_ok", "bait_changed"]), "المحطة سليمة | تم تغيير الطعم");
});
