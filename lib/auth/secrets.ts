import "server-only";

import { getServerEnv } from "@/lib/env/server";

function getAuthSecretFromEnv(): string {
  return getServerEnv().AUTH_SESSION_SECRET;
}

export function getAuthSecret(): string {
  return getAuthSecretFromEnv();
}
