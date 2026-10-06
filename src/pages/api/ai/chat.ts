import type { APIRoute } from "astro";
import { streamAssistantChat } from "../../../lib/ai/chat";
import { readUiMessages } from "../../../lib/ai/messages";
import { chatRateLimiter, checkChatMessageLimits } from "../../../lib/ai/chat-limits";
import { getClientKeyFromRequest } from "../../../lib/rate-limit";

export const POST: APIRoute = async ({ request }) => {
  // Public endpoint, but the server-side LLM key is metered: sliding window
  // of 10 requests per client IP per minute (decisions.md D3).
  const limit = chatRateLimiter.check(getClientKeyFromRequest(request));
  if (!limit.allowed) {
    return Response.json(
      { ok: false, message: "提问太频繁了，请稍后再试" },
      { status: 429, headers: { "retry-after": String(limit.retryAfterSeconds) } }
    );
  }

  const result = await readUiMessages(request);
  if ("error" in result) {
    return Response.json({ ok: false, message: result.error }, { status: 400 });
  }

  // Size bounds before anything enters RAG or the LLM call.
  const limits = checkChatMessageLimits(result.messages);
  if (!limits.ok) {
    return Response.json({ ok: false, message: limits.message }, { status: 400 });
  }

  try {
    return await streamAssistantChat(result.messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 服务请求失败";
    return Response.json({ ok: false, message }, { status: 502 });
  }
};
