import "server-only";

import { db } from "@/lib/db/client";
import { user as usersTable } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

/** Persist who deactivated/reactivated (Better Auth `banned` remains source of truth for login). */
export async function recordUserLifecycleAfterActiveChange(
  uid: string,
  actorUid: string,
  nextIsActive: boolean,
): Promise<void> {
  const at = new Date();

  if (nextIsActive) {
    await db
      .update(usersTable)
      .set({
        reactivatedAt: at,
        reactivatedBy: actorUid,
        deactivatedAt: null,
        deactivatedBy: null,
      })
      .where(eq(usersTable.id, uid));
  } else {
    await db
      .update(usersTable)
      .set({
        deactivatedAt: at,
        deactivatedBy: actorUid,
      })
      .where(eq(usersTable.id, uid));
  }
}
