import type { APIRoute } from "astro";
import {
  storageConfigured,
  readContentArticles,
  writeContentArticles,
} from "../../lib/content-store";
import { hasAdminWriteAccess } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async () => {
  try {
    const articles = await readContentArticles();
    return jsonResponse({
      ok: true,
      articles,
      storage: storageConfigured() ? "sqlite" : "unconfigured",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        articles: [],
        message: error instanceof Error ? error.message : "文章读取失败",
      },
      500,
    );
  }
};

export const PUT: APIRoute = async ({ request }) => {
  if (!hasAdminWriteAccess(request)) {
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
    const articles = await writeContentArticles(
      Array.isArray(body) ? body : (body as { articles?: unknown }).articles,
    );

    return jsonResponse({ ok: true, articles });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "文章保存失败",
      },
      500,
    );
  }
};
