import "server-only";

import { parseServerEnv, type ServerEnv } from "@/lib/env/server-schema";

let cachedEnv: ServerEnv | null = null;

export function getServerEnv(): ServerEnv {
  if (!cachedEnv) {
    cachedEnv = parseServerEnv(process.env);
  }

  return cachedEnv;
}
