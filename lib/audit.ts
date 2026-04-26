import "server-only";

import { writeAuditLogRecord } from "@/lib/db/repositories";
import type { UserRole } from "@/types";

export interface AuditLogInput {
  actorUid: string;
  actorRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
}

export async function writeAuditLog(entry: AuditLogInput): Promise<void> {
  try {
    await writeAuditLogRecord(entry);
  } catch (error: unknown) {
    console.error("Failed to write audit log.", error);
  }
}
