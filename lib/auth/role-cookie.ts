import type { UserRole } from "@/types";
import { getAuthSecret } from "@/lib/auth/secrets";

export interface SignedRolePayload {
  uid: string;
  role: UserRole;
  expiresAt: number;
}

const validRoles = new Set<UserRole>(["technician", "supervisor", "manager"]);

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function signValue(value: string, secret: string): Promise<string> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

    return bytesToHex(signature);
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to sign role cookie.");
  }
}

export async function createSignedRoleCookie(payload: SignedRolePayload): Promise<string> {
  try {
    const uid = encodeURIComponent(payload.uid);
    const body = `${uid}.${payload.role}.${payload.expiresAt}`;
    const signature = await signValue(body, getAuthSecret());

    return `${body}.${signature}`;
  } catch (error: unknown) {
    throw new Error(error instanceof Error ? error.message : "Failed to create role cookie.");
  }
}

export async function verifySignedRoleCookie(value: string | undefined): Promise<SignedRolePayload | null> {
  try {
    if (!value) {
      return null;
    }

    const parts = value.split(".");

    if (parts.length !== 4) {
      return null;
    }

    const [encodedUid, role, expiresAtRaw, signature] = parts;
    const expiresAt = Number(expiresAtRaw);

    if (!validRoles.has(role as UserRole) || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
      return null;
    }

    const body = `${encodedUid}.${role}.${expiresAtRaw}`;
    const expectedSignature = await signValue(body, getAuthSecret());

    if (signature !== expectedSignature) {
      return null;
    }

    return {
      uid: decodeURIComponent(encodedUid),
      role: role as UserRole,
      expiresAt,
    };
  } catch (_error: unknown) {
    return null;
  }
}
