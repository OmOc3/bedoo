import test from "node:test";
import assert from "node:assert/strict";
import { clientSignupRequestSchema, clientSignupSchema } from "../lib/validation/auth.ts";

const validBase = {
  accessCode: "CLIENT123",
  confirmAccessCode: "CLIENT123",
  addressesText: "القاهرة\nالجيزة",
  displayName: "شركة العميل",
  email: "client@example.com",
  phone: "+20 100 000 0000",
};

test("clientSignupSchema accepts a valid public client signup payload", () => {
  const result = clientSignupSchema.safeParse(validBase);

  assert.equal(result.success, true);
});

test("clientSignupSchema rejects weak access codes and invalid phone values", () => {
  const result = clientSignupSchema.safeParse({
    ...validBase,
    accessCode: "short",
    confirmAccessCode: "short",
    phone: "phone<script>",
  });

  assert.equal(result.success, false);
});

test("clientSignupSchema rejects mismatched access code confirmation", () => {
  const result = clientSignupSchema.safeParse({
    ...validBase,
    accessCode: "CLIENT123",
    confirmAccessCode: "CLIENT321",
  });

  assert.equal(result.success, false);
});

test("clientSignupSchema rejects disposable email domains", () => {
  const result = clientSignupSchema.safeParse({
    ...validBase,
    email: "junk@mailinator.com",
  });

  assert.equal(result.success, false);
});

test("clientSignupSchema limits address count", () => {
  const result = clientSignupSchema.safeParse({
    ...validBase,
    addressesText: Array.from({ length: 9 }, (_, index) => `عنوان ${index + 1}`).join("\n"),
  });

  assert.equal(result.success, false);
});

test("clientSignupRequestSchema requires a valid device id", () => {
  const accepted = clientSignupRequestSchema.safeParse({
    ...validBase,
    deviceId: "device_0123456789abcdef",
  });
  const rejected = clientSignupRequestSchema.safeParse({
    ...validBase,
    deviceId: "bad device id",
  });

  assert.equal(accepted.success, true);
  assert.equal(rejected.success, false);
});
