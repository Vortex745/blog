import type { APIRoute } from "astro";
import {
  neonContentStorageConfigured,
  readNeonProjects,
  writeNeonProjects,
} from "../../lib/neon-content";
import { jsonResponse } from "./upload/_shared";

function hasAdminWriteAccess(request: Request): boolean {
  const cookie = request.headers.get("cookie") || "";
  const hasCookie = /(?:^|;\s*)admin-auth=1(?:;|$)/.test(cookie);
  return request.headers.get("x-admin-auth") === "1" || hasCookie;
}

export const GET: APIRoute = async () => {
  try {
    const projects = await readNeonProjects();
    return jsonResponse({
      ok: true,
      projects,
      storage: neonContentStorageConfigured() ? "neon" : "unconfigured",
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
    const projects = await writeNeonProjects(
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
