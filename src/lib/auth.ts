import { SignJWT, jwtVerify } from "jose";
import { timingSafeEqual } from "node:crypto";
import { readServerEnv } from "./env";

export const ADMIN_SESSION_MAX_AGE_SECONDS = 24 * 60 * 60;

/**
 * Raised when required auth environment variables are missing. Callers turn
 * this into a loud, actionable failure instead of silently running on weak
 * or guessed credentials.
 */
export class AuthConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthConfigError";
  }
}

type CreateSessionTokenOptions = {
  issuedAt?: Date;
};

function getAdminUsername() {
  return readServerEnv("ADMIN_USERNAME") ?? "admin";
}

function getAdminPassword() {
  const password = readServerEnv("ADMIN_PASSWORD");
  if (!password) {
    throw new AuthConfigError(
      [
        "ADMIN_PASSWORD 未设置:后台登录密码不再提供默认值。",
        "请在项目根目录的 .env 文件中添加一行并重启服务,例如:",
        "ADMIN_PASSWORD=<请替换为你的强密码>",
      ].join("\n")
    );
  }
  return password;
}

function getAuthSecret() {
  const secret = readServerEnv("ADMIN_SECRET");
  if (!secret) {
    throw new AuthConfigError(
      [
        "ADMIN_SECRET 未设置:会话签名密钥不再从 ADMIN_PASSWORD 派生。",
        '先生成一个随机密钥:node -e "console.log(crypto.randomBytes(48).toString(\'base64url\'))"',
        "然后在项目根目录的 .env 文件中添加一行并重启服务,例如:",
        "ADMIN_SECRET=<把上面命令输出的随机串粘贴到这里>",
      ].join("\n")
    );
  }
  return secret;
}

function getAuthSecretKey() {
  return new TextEncoder().encode(getAuthSecret());
}

function safeEqual(left: string, right: string): boolean {
  const leftBytes = Buffer.from(left, "utf8");
  const rightBytes = Buffer.from(right, "utf8");
  // Compare lengths first: timingSafeEqual throws on unequal lengths.
  if (leftBytes.length !== rightBytes.length) return false;
  return timingSafeEqual(leftBytes, rightBytes);
}

export function verifyCredentials(username: string, password: string): boolean {
  if (!username || !password) return false;
  return (
    safeEqual(username, getAdminUsername()) &&
    safeEqual(password, getAdminPassword())
  );
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

async function isValidToken(token: string): Promise<boolean> {
  if (!token) return false;
  try {
    await jwtVerify(token, getAuthSecretKey(), {
      algorithms: ["HS256"],
      subject: getAdminUsername(),
    });
    return true;
  } catch (error) {
    // A missing ADMIN_SECRET is a configuration failure, not an invalid
    // token: surface it instead of failing closed with no explanation.
    if (error instanceof AuthConfigError) throw error;
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
