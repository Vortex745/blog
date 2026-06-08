import type { APIRoute } from "astro";
import {
  storageConfigured,
  normalizeHome,
  readContentHome,
  writeContentHome,
} from "../../lib/content-store";
import { hasAdminWriteAccess } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async () => {
  try {
    const home = await readContentHome();
    return jsonResponse({
      ok: true,
      home: home ?? normalizeHome({}),
      storage: storageConfigured() ? "sqlite" : "unconfigured",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        home: normalizeHome({}),
        message: error instanceof Error ? error.message : "首页内容读取失败",
      },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!await hasAdminWriteAccess(request)) {
    return jsonResponse({ ok: false, message: "请先登录后台" }, 401);
  }

  if (!storageConfigured()) {
    return jsonResponse(
      { ok: false, message: "缺少 SQLITE_DB_PATH，无法同步到 SQLite 数据库" },
      503,
    );
  }

  try {
    const body = await request.json();
    const home = await writeContentHome((body as { home?: unknown }).home ?? body);

    return jsonResponse({ ok: true, home });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "首页内容保存失败",
      },
      500,
    );
  }
};
