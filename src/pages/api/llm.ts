import type { APIRoute } from "astro";
import { buildOpenAiCompatibleEndpoint } from "../../lib/llm-endpoint";

type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function readString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

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
  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  const baseUrlRaw = readString(payload.baseUrl).replace(/\/+$/, "");
  const apiKey = readString(payload.apiKey);
  const model = readString(payload.model);
  const messages = payload.messages;
  const temperature = typeof payload.temperature === "number" ? payload.temperature : 0.7;
  const maxTokens = typeof payload.maxTokens === "number" ? payload.maxTokens : undefined;

  if (!baseUrlRaw || !apiKey || !model) {
    return jsonResponse({ ok: false, message: "LLM API 设置不完整" }, 400);
  }

  if (!isMessageList(messages)) {
    return jsonResponse({ ok: false, message: "缺少有效的对话内容" }, 400);
  }

  const endpointResult = buildOpenAiCompatibleEndpoint(baseUrlRaw, "chat/completions");
  if ("error" in endpointResult) {
    return jsonResponse({ ok: false, message: endpointResult.error }, 400);
  }
  const endpoint = endpointResult.endpoint;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        ...(maxTokens ? { max_tokens: maxTokens } : {}),
      }),
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
        { ok: false, message: data.error?.message || text || `LLM API 请求失败 (HTTP ${response.status})` },
        response.status,
      );
    }

    const content = data.choices?.[0]?.message?.content;
    if (!content || typeof content !== "string") {
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
