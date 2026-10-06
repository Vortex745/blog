import type { APIRoute } from "astro";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  AuthConfigError,
  createSessionToken,
  hasAdminWriteAccess,
  verifyCredentials,
} from "../../lib/auth";
import { SlidingWindowRateLimiter } from "../../lib/rate-limit";

// Brute-force throttle: at most 5 failed logins per client IP per 15 minutes.
const loginFailureLimiter = new SlidingWindowRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
});

function getClientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

// Secure cookies must only be sent over HTTPS. Behind an HTTP-only reverse
// proxy the forwarded protocol header decides; browsers otherwise refuse the
// cookie and the admin backend can never log in.
function isSecureRequest(request: Request, url: URL): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const clientProto = forwardedProto?.split(",")[0]?.trim().toLowerCase();
  if (clientProto) return clientProto === "https";
  return url.protocol === "https:";
}

function buildSessionCookie(token: string, maxAge: number, secure: boolean): string {
  const attributes = [
    "HttpOnly",
    ...(secure ? ["Secure"] : []),
    "SameSite=Strict",
    "Path=/",
    `Max-Age=${maxAge}`,
  ];
  return `admin-token=${token}; ${attributes.join("; ")}`;
}

export const POST: APIRoute = async ({ request, url }) => {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyCredentials(username, password)) {
      const limit = loginFailureLimiter.check(getClientKey(request));
      if (!limit.allowed) {
        return new Response(
          JSON.stringify({
            ok: false,
            message: "尝试次数过多,请稍后再试",
            retryAfterSeconds: limit.retryAfterSeconds,
          }),
          {
            status: 429,
            headers: { "content-type": "application/json; charset=utf-8" },
          }
        );
      }

      return new Response(JSON.stringify({ error: "用户名或密码错误" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const token = await createSessionToken();
    const secure = isSecureRequest(request, url);

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "Set-Cookie": buildSessionCookie(token, ADMIN_SESSION_MAX_AGE_SECONDS, secure),
      },
    });
  } catch (error) {
    if (error instanceof AuthConfigError) {
      // Missing ADMIN_PASSWORD / ADMIN_SECRET: answer with the guidance text
      // so operators see what to fix instead of an opaque 400.
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};

export const DELETE: APIRoute = async ({ request, url }) => {
  // Stateless JWTs stay valid until they expire; logout only clears the cookie.
  const secure = isSecureRequest(request, url);

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Set-Cookie": buildSessionCookie("", 0, secure),
    },
  });
};

export const GET: APIRoute = async ({ request }) => {
  const authenticated = await hasAdminWriteAccess(request);
  return new Response(JSON.stringify({ authenticated }), {
    status: 200,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
};
