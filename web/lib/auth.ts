import { SignJWT, jwtVerify } from "jose";
import type { Role } from "./types";

export type Claims = {
  userId: number;
  role: Role;
  communityId: number | null;
};

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET ?? "dev-secret-change-me-0000000000000000";
  return new TextEncoder().encode(secret);
}

function getTtlHours(): number {
  const raw = process.env.JWT_TTL_HOURS ?? "168";
  const parsed = parseInt(raw, 10);
  return Number.isNaN(parsed) || parsed < 1 ? 168 : parsed;
}

export async function issueToken(
  userId: number,
  role: Role,
  communityId: number | null,
): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({ uid: userId, role, cid: communityId })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt(now)
    .setExpirationTime(now + getTtlHours() * 3600)
    .sign(getSecret());
}

type RawClaims = {
  uid?: unknown;
  role?: unknown;
  cid?: unknown;
  sub?: unknown;
};

export async function parseToken(raw: string): Promise<Claims> {
  const { payload } = await jwtVerify(raw, getSecret(), { algorithms: ["HS256"] });
  const claims = payload as unknown as RawClaims;
  if (typeof claims.uid !== "number" || typeof claims.role !== "string") {
    throw new Error("invalid token claims");
  }
  return {
    userId: claims.uid,
    role: claims.role as Role,
    communityId: typeof claims.cid === "number" ? claims.cid : null,
  };
}
