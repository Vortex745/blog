import test from "node:test";
import assert from "node:assert/strict";

import { checkChatMessageLimits, chatRateLimiter } from "./ai/chat-limits";
import { getClientKeyFromRequest } from "./rate-limit";

const MINUTE = 60 * 1000;

test("accepts a conversation with at most 20 messages", () => {
  const messages = Array.from({ length: 20 }, (_, i) => ({
    id: `m${i}`,
    role: "user",
    parts: [{ type: "text", text: "你好" }],
  }));

  assert.deepEqual(checkChatMessageLimits(messages), { ok: true });
});

test("rejects more than 20 messages with a Chinese error", () => {
  const messages = Array.from({ length: 21 }, (_, i) => ({
    id: `m${i}`,
    role: "user",
    parts: [{ type: "text", text: "你好" }],
  }));

  const result = checkChatMessageLimits(messages);
  assert.equal(result.ok, false);
  assert.ok(result.ok === false && /20/.test(result.message));
  assert.ok(result.ok === false && /条/.test(result.message));
});

test("accepts a single message of exactly 4000 characters", () => {
  const message = {
    id: "m1",
    role: "user",
    parts: [{ type: "text", text: "字".repeat(4000) }],
  };

  assert.deepEqual(checkChatMessageLimits([message]), { ok: true });
});

test("rejects a single message over 4000 characters with a Chinese error", () => {
  const message = {
    id: "m1",
    role: "user",
    parts: [{ type: "text", text: "字".repeat(4001) }],
  };

  const result = checkChatMessageLimits([message]);
  assert.equal(result.ok, false);
  assert.ok(result.ok === false && /4000/.test(result.message));
  assert.ok(result.ok === false && /字符/.test(result.message));
});

test("counts every text part of a message towards its own limit", () => {
  const message = {
    id: "m1",
    role: "user",
    parts: [
      { type: "text", text: "字".repeat(2500) },
      { type: "text", text: "字".repeat(1501) },
    ],
  };

  assert.equal(checkChatMessageLimits([message]).ok, false);
});

test("ignores non-text parts and other message shapes when measuring", () => {
  const oversizedFilePart = {
    id: "m1",
    role: "user",
    parts: [
      { type: "file", mediaType: "image/png", url: "x".repeat(9000) },
      { type: "text", text: "短文本" },
    ],
  };
  const coreStyleMessage = { role: "user", content: "短文本" };

  assert.deepEqual(checkChatMessageLimits([oversizedFilePart, coreStyleMessage]), { ok: true });
});

test("treats malformed messages as empty instead of throwing", () => {
  assert.deepEqual(checkChatMessageLimits([null, 42, {}]), { ok: true });
});

test("shared chat limiter allows 10 requests per IP per minute and blocks the 11th", () => {
  const limiter = chatRateLimiter;
  limiter.reset("203.0.113.10");

  for (let i = 0; i < 10; i++) {
    assert.equal(limiter.check("203.0.113.10", 1000 + i).allowed, true);
  }

  const blocked = limiter.check("203.0.113.10", 1010);
  assert.equal(blocked.allowed, false);
  assert.ok(blocked.retryAfterSeconds >= 1 && blocked.retryAfterSeconds <= 60);
});

test("shared chat limiter frees the IP again after the window slides", () => {
  const limiter = chatRateLimiter;
  limiter.reset("203.0.113.11");

  for (let i = 0; i < 10; i++) {
    limiter.check("203.0.113.11", i);
  }
  assert.equal(limiter.check("203.0.113.11", 1000).allowed, false);
  assert.equal(limiter.check("203.0.113.11", MINUTE + 1).allowed, true);
  limiter.reset("203.0.113.11");
});

test("getClientKeyFromRequest uses the first forwarded IP, falling back to unknown", () => {
  assert.equal(
    getClientKeyFromRequest(new Request("https://example.com/api/ai/chat", {
      headers: { "x-forwarded-for": "203.0.113.5, 70.41.3.18" },
    })),
    "203.0.113.5"
  );
  assert.equal(getClientKeyFromRequest(new Request("https://example.com/api/ai/chat")), "unknown");
});
