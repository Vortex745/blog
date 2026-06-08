import type { APIRoute } from "astro";
import {
  storageConfigured,
  readContentProjects,
  writeContentProjects,
} from "../../lib/content-store";
import { hasAdminWriteAccess } from "../../lib/auth";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async () => {
  try {
    const projects = await readContentProjects();
    return jsonResponse({
      ok: true,
      projects,
      storage: storageConfigured() ? "sqlite" : "unconfigured",
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        projects: [],
        message: error instanceof Error ? error.message : "项目读取失败",
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
    const projects = await writeContentProjects(
      Array.isArray(body) ? body : (body as { projects?: unknown }).projects,
    );

    return jsonResponse({ ok: true, projects });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "项目保存失败",
      },
      500,
    );
  }
};
