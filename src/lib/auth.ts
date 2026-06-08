import { SignJWT, jwtVerify } from "jose";
import { readServerEnv } from "./env";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

type CreateSessionTokenOptions = {
  issuedAt?: Date;
};

function getAdminUsername() {
  return readServerEnv("ADMIN_USERNAME") ?? "admin";
}

function getAdminPassword() {
  return readServerEnv("ADMIN_PASSWORD") ?? "changeme";
}

function getAuthSecret() {
  return getAdminPassword() + "_admin_session_secret";
}

function getAuthSecretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!username || !password) return false;
  return username === getAdminUsername() && password === getAdminPassword();
}

export async function createSessionToken(options: CreateSessionTokenOptions = {}): Promise<string> {
  const issuedAt = options.issuedAt ?? new Date();
  const issuedAtSeconds = Math.floor(issuedAt.getTime() / 1000);
  const expiresAtSeconds = issuedAtSeconds + ADMIN_SESSION_MAX_AGE_SECONDS;

  return new SignJWT({ role: "admin" })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(getAdminUsername())
    .setIssuedAt(issuedAtSeconds)
    .setExpirationTime(expiresAtSeconds)
    .sign(getAuthSecretKey());
}

export function revokeSessionToken(token: string): void {
  // Stateless tokens cannot be individually revoked without a blocklist.
  // We rely on password changes to invalidate all sessions if needed.
}

async function isValidToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getAuthSecretKey(), {
      algorithms: ["HS256"],
      subject: getAdminUsername(),
    });
    return true;
  } catch {
    return false;
  }
}

export async function hasAdminWriteAccess(request: Request): Promise<boolean> {
  const token = await getAdminTokenFromRequest(request);
  return token !== null;
}

export async function getAdminTokenFromRequest(request: Request): Promise<string | null> {
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken && await isValidToken(headerToken)) return headerToken;

  const cookie = request.headers.get("cookie") || "";
  const match = cookie.match(/(?:^|;\s*)admin-token=([^;]+)(?:;|$)/);
  const cookieToken = match ? decodeURIComponent(match[1]) : "";
  if (cookieToken && await isValidToken(cookieToken)) return cookieToken;

  return null;
}
