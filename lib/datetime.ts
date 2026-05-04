export const APP_TIME_ZONE = "Africa/Cairo" as const;

type DateInput = Date | string | number | null | undefined;

function asValidDate(input: DateInput): Date | null {
  if (!input) return null;
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? null : date;
}

export type DateTimeStyle = {
  dateStyle?: Intl.DateTimeFormatOptions["dateStyle"];
  timeStyle?: Intl.DateTimeFormatOptions["timeStyle"];
};

function isEnglishIntlLocale(locale?: string): boolean {
  if (!locale) {
    return false;
  }

  return locale === "en" || locale.startsWith("en-");
}

function defaultUnavailableLabel(locale?: string): string {
  return isEnglishIntlLocale(locale) ? "Unavailable" : "غير متاح";
}

export function formatDateTimeRome(
  input: DateInput,
  options: DateTimeStyle & { locale?: string; unavailableLabel?: string } = {},
): string {
  const date = asValidDate(input);
  if (!date) {
    return options.unavailableLabel ?? defaultUnavailableLabel(options.locale);
  }

  const locale = options.locale ?? "ar-EG";
  const { dateStyle = "medium", timeStyle = "short" } = options;

  return new Intl.DateTimeFormat(locale, {
    dateStyle,
    timeStyle,
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatDateRome(
  input: DateInput,
  options: { locale?: string; dateStyle?: Intl.DateTimeFormatOptions["dateStyle"]; unavailableLabel?: string } = {},
): string {
  const date = asValidDate(input);
  if (!date) {
    return options.unavailableLabel ?? defaultUnavailableLabel(options.locale);
  }

  return new Intl.DateTimeFormat(options.locale ?? "ar-EG", {
    dateStyle: options.dateStyle ?? "medium",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

export function formatTimeRome(
  input: DateInput,
  options: { locale?: string; timeStyle?: Intl.DateTimeFormatOptions["timeStyle"]; unavailableLabel?: string } = {},
): string {
  const date = asValidDate(input);
  if (!date) {
    return options.unavailableLabel ?? defaultUnavailableLabel(options.locale);
  }

  return new Intl.DateTimeFormat(options.locale ?? "ar-EG", {
    timeStyle: options.timeStyle ?? "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

// Useful for `<input type="date" />` values and day-bucketing.
export function formatIsoDateRome(input: DateInput): string | null {
  const date = asValidDate(input);
  if (!date) return null;

  // en-CA reliably yields YYYY-MM-DD when used with dateStyle: "short".
  return new Intl.DateTimeFormat("en-CA", {
    dateStyle: "short",
    timeZone: APP_TIME_ZONE,
  }).format(date);
}

