import test from "node:test";
import assert from "node:assert/strict";
import type { MiddlewareHandler } from "astro";

import { onRequest } from "./middleware";

function captureLogSpy(t: import("node:test").TestContext) {
  return t.mock.method(console, "log", () => {});
}

function runMiddleware(
  url: string,
  response: Response,
) {
  const request = new Request(url);
  const context = { request } as unknown as Parameters<MiddlewareHandler>[0];
  const next: Parameters<MiddlewareHandler>[1] = async () => response;
  return onRequest(context, next);
}

test("static asset requests produce no log line", async (t) => {
  const logSpy = captureLogSpy(t);
  await runMiddleware("http://x/favicon.svg", new Response(null, { status: 200 }));

  assert.equal(logSpy.mock.calls.length, 0);
});

test("api requests emit one log line without the query string", async (t) => {
  const logSpy = captureLogSpy(t);
  await runMiddleware(
    "http://x/api/ai/chat?token=secret-value",
    new Response("ok", { status: 200 }),
  );

  assert.equal(logSpy.mock.calls.length, 1);
  const record = JSON.parse(String(logSpy.mock.calls[0].arguments[0])) as Record<string, unknown>;
  assert.equal(record.msg, "request");
  assert.equal(record.level, "info");
  assert.equal(record.method, "GET");
  assert.equal(record.path, "/api/ai/chat");
  assert.equal(record.status, 200);
  assert.equal(typeof record.dur_ms, "number");
  assert.ok((record.dur_ms as number) >= 0);
});
