import "server-only";

import { cookies } from "next/headers";
import { getI18nMessages, getLocaleFromValue, localeCookieName, type I18nMessages, type Locale } from "@/lib/i18n";

export async function getActionLocale(): Promise<Locale> {
  const cookieStore = await cookies();

  return getLocaleFromValue(cookieStore.get(localeCookieName)?.value);
}

export async function getActionMessages(): Promise<I18nMessages> {
  return getI18nMessages(await getActionLocale());
}
