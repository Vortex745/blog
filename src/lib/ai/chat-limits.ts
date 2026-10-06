import { SlidingWindowRateLimiter, getClientKeyFromRequest } from "../rate-limit";

// Public /api/ai/chat limits (decisions.md D3): the endpoint stays open to
// visitors but is bounded per IP and per request so a single client cannot
// run the server-side LLM key unbounded.

export const CHAT_RATE_LIMIT_WINDOW_MS = 60 * 1000;
export const CHAT_RATE_LIMIT_MAX = 10;

export const MAX_CHAT_MESSAGES = 20;
export const MAX_CHAT_MESSAGE_CHARS = 4000;

// One limiter for the public chat endpoint, shared by every request handled
// by the server process. Keyed by client IP (see getClientKeyFromRequest).
export const chatRateLimiter = new SlidingWindowRateLimiter({
  windowMs: CHAT_RATE_LIMIT_WINDOW_MS,
  max: CHAT_RATE_LIMIT_MAX,
});

export type ChatMessageLimitResult = { ok: true } | { ok: false; message: string };

// UIMessages carry their content in `parts[].text`; plain { role, content }
// messages carry it in `content`. Both count towards the per-message limit,
// non-text parts (file/image data) do not.
function messageTextLength(message: unknown): number {
  if (!message || typeof message !== "object") return 0;

  const parts = (message as { parts?: unknown }).parts;
  if (Array.isArray(parts)) {
    return parts.reduce((total, part) => {
      const text = part && typeof part === "object" ? (part as { text?: unknown }).text : undefined;
      return total + (typeof text === "string" ? text.length : 0);
    }, 0);
  }

  const content = (message as { content?: unknown }).content;
  return typeof content === "string" ? content.length : 0;
}

export function checkChatMessageLimits(messages: readonly unknown[]): ChatMessageLimitResult {
  if (messages.length > MAX_CHAT_MESSAGES) {
    return {
      ok: false,
      message: `对话消息不能超过 ${MAX_CHAT_MESSAGES} 条，请开新会话后重试`,
    };
  }

  for (const message of messages) {
    if (messageTextLength(message) > MAX_CHAT_MESSAGE_CHARS) {
      return {
        ok: false,
        message: `单条消息不能超过 ${MAX_CHAT_MESSAGE_CHARS} 个字符，请缩短后重试`,
      };
    }
  }

  return { ok: true };
}
