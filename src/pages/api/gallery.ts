import type { APIRoute } from "astro";
import {
  storageConfigured,
  readContentGallery,
  writeContentGallery,
} from "../../lib/content-store";
import { hasAdminWriteAccess } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async () => {
  try {
    const gallery = await readContentGallery();
    return jsonResponse({
      ok: true,
      gallery,
      storage: storageConfigured() ? "sqlite" : "unconfigured",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        gallery: [],
        message: error instanceof Error ? error.message : "图库读取失败",
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
    const gallery = await writeContentGallery(
      Array.isArray(body) ? body : (body as { gallery?: unknown }).gallery,
    );

    return jsonResponse({ ok: true, gallery });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "图库保存失败",
      },
      500,
    );
  }
};
