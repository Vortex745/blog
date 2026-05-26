import type { APIRoute } from "astro";
import {
  neonContentStorageConfigured,
  normalizeAbout,
  readNeonAbout,
  writeNeonAbout,
} from "../../lib/neon-content";
import { jsonResponse } from "./upload/_shared";

function hasAdminWriteAccess(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const hasCookie = /(?:^|;\s*)admin-auth=1(?:;|$)/.test(cookie);
  return request.headers.get("x-admin-auth") === "1" || hasCookie;
}

export const GET: APIRoute = async () => {
  try {
    const about = await readNeonAbout();
    return jsonResponse({
      ok: true,
      about: about ?? normalizeAbout({}),
      storage: neonContentStorageConfigured() ? "neon" : "unconfigured",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        about: normalizeAbout({}),
        message: error instanceof Error ? error.message : "关于内容读取失败",
      },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!hasAdminWriteAccess(request)) {
    return jsonResponse({ ok: false, message: "请先登录后台" }, 401);
  }

  if (!neonContentStorageConfigured()) {
    return jsonResponse(
      { ok: false, message: "缺少 DATABASE_URL，无法同步到 Neon 数据库" },
      503,
    );
  }

  try {
    const body = await request.json();
    const about = await writeNeonAbout((body as { about?: unknown }).about ?? body);

    return jsonResponse({ ok: true, about });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "关于内容保存失败",
      },
      500,
    );
  }
};
