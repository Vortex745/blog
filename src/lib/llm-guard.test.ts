import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken } from "./auth";
import { POST as llmPost } from "../pages/api/llm";
import { POST as llmModelsPost } from "../pages/api/llm-models";
import { GET as validateImageUrlGet } from "../pages/api/validate-image-url";
import { POST as chatPost } from "../pages/api/ai/chat";

// The auth module requires explicit credentials; provide deterministic test
// values. LLM env vars are cleared so authorized-path assertions stay
// hermetic (no outbound fetch) even when the dev shell exports them, and the
// chat RAG lookup uses an in-memory database.
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_SECRET = "test-admin-secret";
process.env.SQLITE_DB_PATH = ":memory:";
delete process.env.LLM_BASE_URL;
delete process.env.LLM_MODEL;
delete process.env.LLM_API_KEY;

type RouteContext = Parameters<typeof llmPost>[0];

function context(request: Request): RouteContext {
  return { request } as unknown as RouteContext;
}

async function loginToken(): Promise<string> {
  return createSessionToken();
}

test("POST /api/llm rejects unauthenticated requests before reading the body", async () => {
  const request = new Request("https://example.com/api/llm", {
    method: "POST",
    // Invalid JSON on purpose: a 401 proves the guard runs before parsing.
    body: "not-json",
    headers: { "content-type": "application/json" },
  });

  const response = await llmPost(context(request));
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.ok(typeof data.message === "string" && data.message.length > 0);
});

test("POST /api/llm-models rejects unauthenticated requests", async () => {
  const request = new Request("https://example.com/api/llm-models", { method: "POST" });

  const response = await llmModelsPost(context(request));
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
});

test("GET /api/validate-image-url rejects unauthenticated requests", async () => {
  const request = new Request("https://example.com/api/validate-image-url?url=https://example.com/a.png");

  const response = await validateImageUrlGet(context(request));
  assert.equal(response.status, 401);
  const data = await response.json();
  assert.equal(data.ok, false);
});

test("POST /api/llm with a valid admin token reaches the handler", async () => {
  const token = await loginToken();
  const request = new Request("https://example.com/api/llm", {
    method: "POST",
    body: "not-json",
    headers: { "content-type": "application/json", "x-admin-token": token },
  });

  const response = await llmPost(context(request));
  // Past the guard the invalid JSON is what fails, not the session.
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /JSON/);
});

test("POST /api/llm-models with a valid admin token reaches the handler", async () => {
  const token = await loginToken();
  const request = new Request("https://example.com/api/llm-models", {
    method: "POST",
    headers: { "x-admin-token": token },
  });

  const response = await llmModelsPost(context(request));
  // No API key in body or (cleared) env: the settings error, not a 401.
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /API Key/);
});

test("GET /api/validate-image-url with a valid admin token reaches the handler", async () => {
  const token = await loginToken();
  const request = new Request("https://example.com/api/validate-image-url?url=::::not-a-url", {
    headers: { "x-admin-token": token },
  });

  const response = await validateImageUrlGet(context(request));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /URL/);
});

// ===== /api/ai/chat (public, but rate limited and size bounded) =====

let chatIpCounter = 0;

function chatRequest(body: string, ip?: string): Request {
  chatIpCounter += 1;
  return new Request("https://example.com/api/ai/chat", {
    method: "POST",
    body,
    headers: {
      "content-type": "application/json",
      // A unique per-request client IP keeps the shared limiter buckets
      // isolated unless a test pins one deliberately.
      "x-forwarded-for": ip ?? `203.0.113.${chatIpCounter}`,
    },
  });
}

function chatBody(messages: unknown[]): string {
  return JSON.stringify({ messages });
}

function userMessage(text: string, index = 0): unknown {
  return { id: `m${index}`, role: "user", parts: [{ type: "text", text }] };
}

test("POST /api/ai/chat blocks the 11th request per IP per minute with a Chinese 429", async () => {
  // Invalid JSON bodies keep the first 10 attempts cheap: the limiter runs
  // before parsing, so each still counts against the client IP.
  let last: Response | undefined;
  for (let i = 0; i < 10; i++) {
    last = await chatPost(context(chatRequest("not-json", "198.51.100.7")));
    assert.equal(last.status, 400);
  }

  const blocked = await chatPost(
    context(chatRequest(chatBody([userMessage("你好")]), "198.51.100.7"))
  );
  assert.equal(blocked.status, 429);
  const data = await blocked.json();
  assert.equal(data.ok, false);
  assert.match(data.message, /稍后再试/);
  assert.ok(blocked.headers.get("retry-after"));
});

test("POST /api/ai/chat rejects more than 20 messages with a Chinese 400", async () => {
  const messages = Array.from({ length: 21 }, (_, i) => userMessage("你好", i));
  const request = chatRequest(chatBody(messages));

  const response = await chatPost(context(request));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /20/);
  assert.match(data.message, /条/);
});

test("POST /api/ai/chat rejects a single message over 4000 characters with a Chinese 400", async () => {
  const request = chatRequest(chatBody([userMessage("字".repeat(4001))]));

  const response = await chatPost(context(request));
  assert.equal(response.status, 400);
  const data = await response.json();
  assert.match(data.message, /4000/);
  assert.match(data.message, /字符/);
});

test("POST /api/ai/chat still answers a normal-sized question", async () => {
  const request = chatRequest(chatBody([userMessage("这篇博客讲了什么?")]));

  const response = await chatPost(context(request));
  // Guards pass and the streaming response from the AI stack starts.
  assert.equal(response.status, 200);
});
