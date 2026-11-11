import type { APIRoute } from "astro";
import { buildOpenAiCompatibleEndpoint } from "../../lib/llm-endpoint";
import { jsonResponse, readString } from "../../lib/api-utils";
import { readServerEnv } from "../../lib/env";
import { denyAdminWrite } from "../../lib/auth";
import { createOpenAiCompatibleRuntime, piResponseText, toPiSimpleMessages } from "../../lib/pi/runtime";

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function isMessageList(value: unknown): value is LlmMessage[] {
  return Array.isArray(value) && value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const message = item as Partial<LlmMessage>;
    return (
      (message.role === "system" || message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      message.content.trim().length > 0
    );
  });
}

export const POST: APIRoute = async ({ request }) => {
  // Admin-only proxy: forwards caller-supplied baseUrl/apiKey to an LLM API,
  // so it must never be reachable without an admin session.
  const denied = await denyAdminWrite(request);
  if (denied) return denied;

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  const baseUrlRaw = (readString(payload.baseUrl) || readServerEnv("LLM_BASE_URL") || "").replace(/\/+$/, "");
  const model = readString(payload.model) || readServerEnv("LLM_MODEL") || "";
  const messages = payload.messages;
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.7;
  const maxTokens = typeof payload.maxTokens === "number" ? payload.maxTokens : undefined;

  const apiKey = readString(payload.apiKey) || readServerEnv("LLM_API_KEY");
  if (!baseUrlRaw || !model) {
    return jsonResponse({ ok: false, message: "LLM API 设置不完整" }, 400);
  }

  if (!apiKey) {
    return jsonResponse({ ok: false, message: "未提供 API Key 且服务端未配置" }, 500);
  }

  if (!isMessageList(messages)) {
    return jsonResponse({ ok: false, message: "缺少有效的对话内容" }, 400);
  }

  const endpointResult = buildOpenAiCompatibleEndpoint(baseUrlRaw, "chat/completions");
  if ("error" in endpointResult) {
    return jsonResponse({ ok: false, message: endpointResult.error }, 400);
  }
  // The endpoint builder returns the full chat/completions URL; the pi runtime wants the base.
  const baseUrl = endpointResult.endpoint.href.replace(/\/chat\/completions$/, "");
  const runtime = createOpenAiCompatibleRuntime({ baseUrl, apiKey, model }, "admin-llm");

  try {
    const message = await runtime.models.complete(
      runtime.model,
      { messages: toPiSimpleMessages(messages) },
      { temperature, maxTokens },
    );

    const content = piResponseText(message);
    if (!content.trim()) {
      return jsonResponse({ ok: false, message: "LLM API 返回内容为空" }, 502);
    }

    return jsonResponse({ ok: true, content });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "LLM API 请求失败" },
      502,
    );
  }
};
