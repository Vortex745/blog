import type { APIRoute } from "astro";
import {
  storageConfigured,
  normalizeAbout,
  readContentAbout,
  writeContentAbout,
} from "../../lib/content-store";
import { hasAdminWriteAccess } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async () => {
  try {
    const about = await readContentAbout();
    return jsonResponse({
      ok: true,
      about: about ?? normalizeAbout({}),
      storage: storageConfigured() ? "sqlite" : "unconfigured",
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
    const about = await writeContentAbout((body as { about?: unknown }).about ?? body);

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
