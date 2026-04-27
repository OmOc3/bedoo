import "server-only";

import { parseServerEnv } from "@/lib/env/server-schema";

export function assertEnv(): void {
  parseServerEnv(process.env);
}
