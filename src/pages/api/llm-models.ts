import type { APIRoute } from "astro";
import { buildOpenAiCompatibleEndpoint } from "../../lib/llm-endpoint";
import { jsonResponse, readString } from "../../lib/api-utils";
import { readServerEnv } from "../../lib/env";

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

export const GET: APIRoute = async () => {
  const apiKey = readServerEnv("LLM_API_KEY");
  return jsonResponse({
    configured: Boolean(apiKey),
    hasBaseUrl: false,
  });
};

export const POST: APIRoute = async ({ request }) => {
  let payload: Record<string, unknown> = {};
  try {
    if (request.headers.get("Content-Type")?.includes("application/json")) {
      payload = await request.json();
    }
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  const apiKey = readString(payload.apiKey) || readServerEnv("LLM_API_KEY");
  if (!apiKey) {
    return jsonResponse({ ok: false, message: "未提供 API Key 且服务端未配置" }, 400);
  }

  const baseUrl = readString(payload.baseUrl) || readServerEnv("LLM_BASE_URL");

  if (!baseUrl) {
    return jsonResponse({ ok: false, message: "请先填写 Base URL" }, 400);
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
        502,
      );
    }

    let modelIds = normalizeModelIds(data.data);
    const type = readString(payload.type);

    if (type === "embedding") {
      modelIds = modelIds.filter(id => id.toLowerCase().includes("embed") || id.toLowerCase().includes("text-similarity"));
    } else if (type === "rerank") {
      modelIds = modelIds.filter(id => id.toLowerCase().includes("rerank"));
    } else if (type === "llm") {
      modelIds = modelIds.filter(id => !id.toLowerCase().includes("embed") && !id.toLowerCase().includes("rerank"));
    }

    return jsonResponse({ ok: true, models: modelIds.map((id) => ({ id })) });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "获取模型失败" },
      502,
    );
  }
};
