import test from "node:test";
import assert from "node:assert/strict";

import { createSessionToken } from "./auth";
import { POST as llmPost } from "../pages/api/llm";
import { POST as llmModelsPost } from "../pages/api/llm-models";
import { GET as validateImageUrlGet } from "../pages/api/validate-image-url";

// The auth module requires explicit credentials; provide deterministic test
// values. LLM env vars are cleared so authorized-path assertions stay
// hermetic (no outbound fetch) even when the dev shell exports them.
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
