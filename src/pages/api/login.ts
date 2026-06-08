import type { APIRoute } from "astro";
import {
  ADMIN_SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAdminTokenFromRequest,
  hasAdminWriteAccess,
  revokeSessionToken,
  verifyCredentials,
} from "../../lib/auth";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const username = typeof body.username === "string" ? body.username.trim() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!verifyCredentials(username, password)) {
      return new Response(JSON.stringify({ error: "用户名或密码错误" }), {
        status: 401,
        headers: { "content-type": "application/json; charset=utf-8" },
      });
    }

    const token = await createSessionToken();

    return new Response(JSON.stringify({ success: true, token }), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "Set-Cookie": `admin-token=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${ADMIN_SESSION_MAX_AGE_SECONDS}`,
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "请求格式错误" }), {
      status: 400,
      headers: { "content-type": "application/json; charset=utf-8" },
    });
  }
};

export const DELETE: APIRoute = async ({ request }) => {
  const token = await getAdminTokenFromRequest(request);
  if (token) {
    revokeSessionToken(token);
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "Set-Cookie": "admin-token=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0",
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
