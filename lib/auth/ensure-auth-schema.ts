import "server-only";

import { ensureAuthUserColumns } from "@/lib/db/runtime-schema";

let ensureAuthUserSchemaPromise: Promise<void> | null = null;

export async function ensureAuthUserSchema(): Promise<void> {
  ensureAuthUserSchemaPromise ??= ensureAuthUserColumns().catch((error: unknown) => {
    ensureAuthUserSchemaPromise = null;
    throw error;
  });

  return ensureAuthUserSchemaPromise;
}
