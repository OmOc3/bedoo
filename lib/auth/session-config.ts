import "server-only";

import { getServerEnv } from "@/lib/env/server";

export function getSessionMaxAgeSeconds(): number {
  return getServerEnv().SESSION_MAX_AGE_SECONDS;
}

export function getSessionMaxAgeMs(): number {
  return getSessionMaxAgeSeconds() * 1000;
}
