import "server-only";

import { getServerEnv } from "@/lib/env/server";

function getAuthSecretFromEnv(): string {
  const env = getServerEnv();
  const secret = env.AUTH_ROLE_COOKIE_SECRET ?? env.ROLE_COOKIE_SECRET ?? env.BETTER_AUTH_SECRET ?? env.AUTH_SESSION_SECRET;

  if (!secret || secret.length < 32) {
    throw new Error("BETTER_AUTH_SECRET or AUTH_ROLE_COOKIE_SECRET must be at least 32 characters.");
  }

  return secret;
}

export function getAuthSecret(): string {
  return getAuthSecretFromEnv();
}
