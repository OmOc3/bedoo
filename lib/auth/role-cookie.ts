import type { UserRole } from "@/types";
import { getAuthSecret } from "@/lib/auth/secrets";

export interface SignedRolePayload {
  uid: string;
  role: UserRole;
  expiresAt: number;
}

const validRoles = new Set<UserRole>(["client", "technician", "supervisor", "manager"]);

function bytesToHex(bytes: ArrayBuffer): string {
  return Array.from(new Uint8Array(bytes))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function hexToBytes(value: string): ArrayBuffer | null {
  if (value.length !== 64 || !/^[0-9a-f]+$/i.test(value)) {
    return null;
  }

  const buffer = new ArrayBuffer(value.length / 2);
  const bytes = new Uint8Array(buffer);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16);
  }

  return buffer;
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

async function verifyValue(value: string, signatureHex: string, secret: string): Promise<boolean> {
  try {
    const signature = hexToBytes(signatureHex);

    if (!signature) {
      return false;
    }

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );

    return crypto.subtle.verify("HMAC", key, signature, encoder.encode(value));
  } catch (_error: unknown) {
    return false;
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

    if (!(await verifyValue(body, signature, getAuthSecret()))) {
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
