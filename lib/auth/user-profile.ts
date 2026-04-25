import type { DocumentData, FirestoreDataConverter, QueryDocumentSnapshot } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebase-admin";
import { appUserSchema } from "@/lib/validation/firestore";
import type { AppUser } from "@/types";

const userConverter: FirestoreDataConverter<AppUser> = {
  toFirestore(user: AppUser): DocumentData {
    return user;
  },
  fromFirestore(snapshot: QueryDocumentSnapshot<DocumentData>): AppUser {
    const parsed = appUserSchema.safeParse(snapshot.data());

    if (!parsed.success) {
      throw new Error("Invalid user profile document.");
    }

    return parsed.data;
  },
};

export async function getAppUser(uid: string): Promise<AppUser | null> {
  try {
    const snapshot = await adminDb().collection("users").doc(uid).withConverter(userConverter).get();

    if (!snapshot.exists) {
      return null;
    }

    const user = snapshot.data();

    if (!user || user.uid !== uid) {
      return null;
    }

    return user;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to load user profile.");
  }
}

export async function getActiveAppUser(uid: string): Promise<AppUser | null> {
  try {
    const user = await getAppUser(uid);

    if (!user || !user.isActive) {
      return null;
    }

    return user;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to load active user profile.");
  }
}
