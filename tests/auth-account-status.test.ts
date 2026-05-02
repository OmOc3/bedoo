import assert from "node:assert/strict";
import test from "node:test";

import { isDisabledAuthError } from "../lib/auth/disabled-error.ts";
import { booleanFlagFromDriver, isBlockedAccountFlag } from "../lib/db/boolean.ts";

test("booleanFlagFromDriver treats legacy false values as false", () => {
  assert.equal(booleanFlagFromDriver(false), false);
  assert.equal(booleanFlagFromDriver(0), false);
  assert.equal(booleanFlagFromDriver(BigInt(0)), false);
  assert.equal(booleanFlagFromDriver("0"), false);
  assert.equal(booleanFlagFromDriver("false"), false);
  assert.equal(booleanFlagFromDriver(" FALSE "), false);
  assert.equal(booleanFlagFromDriver(null), false);
  assert.equal(booleanFlagFromDriver(undefined), false);
});

test("booleanFlagFromDriver treats only explicit true values as true", () => {
  assert.equal(booleanFlagFromDriver(true), true);
  assert.equal(booleanFlagFromDriver(1), true);
  assert.equal(booleanFlagFromDriver(BigInt(1)), true);
  assert.equal(booleanFlagFromDriver("1"), true);
  assert.equal(booleanFlagFromDriver("true"), true);
  assert.equal(booleanFlagFromDriver(" TRUE "), true);
});

test("isBlockedAccountFlag ignores malformed or unrelated values", () => {
  assert.equal(isBlockedAccountFlag({ banned: true }), false);
  assert.equal(isBlockedAccountFlag("no such column: banned"), false);
});

test("isDisabledAuthError only accepts explicit disabled-account codes", () => {
  assert.equal(isDisabledAuthError({ code: "BANNED_USER", message: "You have been banned." }), true);
  assert.equal(isDisabledAuthError({ code: "USER_DISABLED" }), true);
  assert.equal(isDisabledAuthError({ code: "ACCOUNT_DISABLED" }), true);
  assert.equal(isDisabledAuthError({ message: "no such column: banned" }), false);
  assert.equal(isDisabledAuthError({ code: "SQLITE_ERROR", message: "no such column: banned" }), false);
});
