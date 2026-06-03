import { randomBytes, createHmac } from "node:crypto";
import { readServerEnv } from "./env";

function getAdminUsername() {
  return readServerEnv("ADMIN_USERNAME") ?? "admin";
}

function getAdminPassword() {
  return readServerEnv("ADMIN_PASSWORD") ?? "changeme";
}

function getAuthSecret() {
  return getAdminPassword() + "_admin_session_secret";
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!username || !password) return false;
  return username === getAdminUsername() && password === getAdminPassword();
}

export function createSessionToken(): string {
  const timestamp = Date.now().toString();
  const signature = createHmac("sha256", getAuthSecret()).update(timestamp).digest("hex");
  return `${timestamp}.${signature}`;
}

export function revokeSessionToken(token: string): void {
  // Stateless tokens cannot be individually revoked without a blocklist.
  // We rely on password changes to invalidate all sessions if needed.
}

function isValidToken(token: string): boolean {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2) return false;
  
  const [timestamp, signature] = parts;
  const expected = createHmac("sha256", getAuthSecret()).update(timestamp).digest("hex");
  
  // Validate signature
  if (signature !== expected) return false;
  
  // Enforce an expiration (e.g., 30 days)
  const age = Date.now() - parseInt(timestamp, 10);
  if (age > 30 * 24 * 60 * 60 * 1000 || age < 0) return false;
  
  return true;
}

export function hasAdminWriteAccess(request: Request): boolean {
  const token = getAdminTokenFromRequest(request);
  return token !== null;
}

export function getAdminTokenFromRequest(request: Request): string | null {
  const headerToken = request.headers.get("x-admin-token");
  if (headerToken && isValidToken(headerToken)) return headerToken;

  const cookie = request.headers.get("cookie") || "";
  // Match the new format: timestamp.signature
  const match = cookie.match(/(?:^|;\s*)admin-token=([0-9]+\.[a-f0-9]{64})(?:;|$)/);
  if (match && isValidToken(match[1])) return match[1];

  return null;
}
