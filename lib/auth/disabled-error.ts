import { isRecord } from "@/lib/utils";

const disabledAccountErrorCodes = new Set(["BANNED_USER", "USER_DISABLED", "ACCOUNT_DISABLED"]);

export function isDisabledAuthError(error: unknown): boolean {
  if (!isRecord(error)) {
    return false;
  }

  return typeof error.code === "string" && disabledAccountErrorCodes.has(error.code);
}
