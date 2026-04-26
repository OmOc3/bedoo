import test from "node:test";
import assert from "node:assert/strict";
import { decodeReportCursor, encodeReportCursor } from "../lib/pagination/report-cursor.ts";

test("report cursor round trips through base64url JSON", () => {
  const cursor = { id: "report_123", submittedAtMs: 1777142400000 };
  const encoded = encodeReportCursor(cursor);

  assert.deepEqual(decodeReportCursor(encoded), cursor);
});

test("invalid report cursor returns null instead of throwing", () => {
  assert.equal(decodeReportCursor("not-valid-json"), null);
  assert.equal(decodeReportCursor(undefined), null);
});
