import type { APIRoute } from "astro";
import { buildOpenAiCompatibleEndpoint } from "../../lib/llm-endpoint";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function readErrorMessage(data: any, fallback: string) {
  return readString(data?.error?.message) || readString(data?.message) || fallback;
}

function normalizeModelIds(value: unknown) {
  if (!Array.isArray(value)) return [];

  const ids = value
    .map((model) => {
      if (typeof model === "string") return model.trim();
      if (!model || typeof model !== "object") return "";
      return readString((model as { id?: unknown }).id);
    })
    .filter((id): id is string => id.length > 0);

  return Array.from(new Set(ids));
}

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  const baseUrl = readString(payload.baseUrl);
  const apiKey = readString(payload.apiKey);

  if (!baseUrl || !apiKey) {
    return jsonResponse({ ok: false, message: "请先填写 Base URL 和 API Key" }, 400);
  }

  const endpointResult = buildOpenAiCompatibleEndpoint(baseUrl, "models");
  if ("error" in endpointResult) {
    return jsonResponse({ ok: false, message: endpointResult.error }, 400);
  }

  try {
    const response = await fetch(endpointResult.endpoint, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = text ? JSON.parse(text) : {};
    } catch {
      data = {};
    }

    if (!response.ok) {
      return jsonResponse(
        { ok: false, message: readErrorMessage(data, text || `获取模型失败 (HTTP ${response.status})`) },
        response.status,
      );
    }

    const modelIds = normalizeModelIds(data.data);
    return jsonResponse({ ok: true, models: modelIds.map((id) => ({ id })) });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "获取模型失败" },
      502,
    );
  }
};
