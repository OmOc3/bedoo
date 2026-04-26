import test from "node:test";
import assert from "node:assert/strict";
import { validateReportImageFile } from "../lib/reports/image-validation.ts";

test("validateReportImageFile accepts real jpeg magic bytes", async () => {
  const file = new File([Buffer.from([0xff, 0xd8, 0xff, 0x00])], "photo.jpg", { type: "image/jpeg" });
  const result = await validateReportImageFile(file);

  assert.equal(result.contentType, "image/jpeg");
  assert.equal(result.extension, "jpg");
});

test("validateReportImageFile rejects fake MIME content", async () => {
  const file = new File([Buffer.from("not-an-image")], "photo.jpg", { type: "image/jpeg" });

  await assert.rejects(() => validateReportImageFile(file), /محتوى الصورة/);
});
