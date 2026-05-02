export type BooleanDriverValue = boolean | number | bigint | string | null | undefined;

export function booleanFlagFromDriver(value: BooleanDriverValue): boolean {
  if (value === true) {
    return true;
  }

  if (value === false || value === null || value === undefined) {
    return false;
  }

  if (typeof value === "number") {
    return value === 1;
  }

  if (typeof value === "bigint") {
    return value === BigInt(1);
  }

  const normalized = value.trim().toLowerCase();

  return normalized === "1" || normalized === "true";
}

export function isBlockedAccountFlag(value: unknown): boolean {
  if (
    typeof value === "boolean" ||
    typeof value === "number" ||
    typeof value === "bigint" ||
    typeof value === "string" ||
    value === null ||
    value === undefined
  ) {
    return booleanFlagFromDriver(value);
  }

  return false;
}
