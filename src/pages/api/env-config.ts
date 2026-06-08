import type { APIRoute } from "astro";
import { jsonResponse } from "../../lib/api-utils";
import { hasAdminWriteAccess } from "../../lib/auth";
import { readEnvFile, writeEnvFile, maskSensitiveValues, CONFIGURABLE_KEYS } from "../../lib/env-writer";

export const GET: APIRoute = async ({ request }) => {
  if (!await hasAdminWriteAccess(request)) {
    return jsonResponse({ ok: false, message: "未授权" }, 401);
  }

  const envMap = readEnvFile();
  const values: Record<string, string> = {};
  for (const key of CONFIGURABLE_KEYS) {
    values[key] = envMap.get(key) ?? process.env[key] ?? "";
  }

  return jsonResponse({ ok: true, config: maskSensitiveValues(values) });
};

export const POST: APIRoute = async ({ request }) => {
  if (!await hasAdminWriteAccess(request)) {
    return jsonResponse({ ok: false, message: "未授权" }, 401);
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  if (!payload || typeof payload !== "object") {
    return jsonResponse({ ok: false, message: "请求内容无效" }, 400);
  }

  const updates: Record<string, string> = {};
  for (const key of CONFIGURABLE_KEYS) {
    if (key in payload) {
      const value = payload[key];
      if (typeof value === "string") {
        updates[key] = value;
      }
    }
  }

  if (Object.keys(updates).length === 0) {
    return jsonResponse({ ok: false, message: "没有需要更新的配置项" }, 400);
  }

  try {
    writeEnvFile(updates);
    const envMap = readEnvFile();
    const values: Record<string, string> = {};
    for (const key of CONFIGURABLE_KEYS) {
      values[key] = envMap.get(key) ?? process.env[key] ?? "";
    }
    return jsonResponse({ ok: true, config: maskSensitiveValues(values) });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "写入配置失败" },
      500,
    );
  }
};
