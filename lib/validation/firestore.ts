import { z } from "zod";
import type { FirestoreTimestamp } from "@/types";

function isTimestampLike(value: unknown): value is FirestoreTimestamp {
  return (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    "nanoseconds" in value &&
    "toDate" in value &&
    typeof (value as FirestoreTimestamp).seconds === "number" &&
    typeof (value as FirestoreTimestamp).nanoseconds === "number" &&
    typeof (value as FirestoreTimestamp).toDate === "function"
  );
}

export const firestoreTimestampSchema = z.custom<FirestoreTimestamp>(isTimestampLike, {
  message: "Invalid Firestore timestamp.",
});

export const appUserSchema = z.object({
  uid: z.string().min(1),
  email: z.string().email(),
  displayName: z.string().min(1),
  role: z.enum(["technician", "supervisor", "manager"]),
  createdAt: firestoreTimestampSchema,
  isActive: z.boolean(),
});
