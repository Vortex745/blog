import type { APIRoute } from "astro";
import {
  blobArticlesStorageConfigured,
  readBlobArticles,
  writeBlobArticles,
} from "../../lib/blob-articles";
import { jsonResponse } from "./upload/_shared";

function hasAdminWriteAccess(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const hasCookie = /(?:^|;\s*)admin-auth=1(?:;|$)/.test(cookie);
  return request.headers.get("x-admin-auth") === "1" || hasCookie;
}

export const GET: APIRoute = async () => {
  try {
    const articles = await readBlobArticles();
    return jsonResponse({
      ok: true,
      articles,
      storage: blobArticlesStorageConfigured() ? "blob" : "unconfigured",
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

  if (!blobArticlesStorageConfigured()) {
    return jsonResponse(
      { ok: false, message: "缺少 BLOB_READ_WRITE_TOKEN，无法同步到 Vercel Blob" },
      503,
    );
  }

  try {
    const body = await request.json();
    const articles = await writeBlobArticles(
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
