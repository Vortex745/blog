import test from "node:test";
import assert from "node:assert/strict";

import { log } from "./logger";

function capturedLines(t: import("node:test").TestContext): () => string[] {
  const logSpy = t.mock.method(console, "log", () => {});
  t.mock.method(console, "error", () => {});
  return () => logSpy.mock.calls.map((call) => String(call.arguments[0]));
}

test("emits one JSON line with the core record keys", (t) => {
  const capture = capturedLines(t);
  log("info", "hello", { path: "/a" });
  const lines = capture();

  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]) as Record<string, unknown>;
  assert.equal(record.level, "info");
  assert.equal(record.msg, "hello");
  assert.equal(record.path, "/a");
  assert.equal(Number.isNaN(Date.parse(record._timestamp as string)), false);
});

test("caller fields win when they collide with a core key", (t) => {
  const capture = capturedLines(t);
  log("info", "core", { msg: "caller" });
  const lines = capture();

  const record = JSON.parse(lines[0]) as Record<string, unknown>;
  assert.equal(record.msg, "caller");
  assert.equal(record.level, "info");
});

test("keeps a record on one line across newlines and unicode", (t) => {
  const capture = capturedLines(t);
  log("info", "第一行\n第二行", { emoji: "🥔" });
  const lines = capture();

  assert.equal(lines.length, 1);
  const record = JSON.parse(lines[0]) as Record<string, unknown>;
  assert.equal(record.msg, "第一行\n第二行");
  assert.equal(record.emoji, "🥔");
});

test("warn and error pass through as the level", (t) => {
  const capture = capturedLines(t);
  log("warn", "w");
  log("error", "e");
  const lines = capture();

  assert.equal(lines.length, 2);
  assert.equal((JSON.parse(lines[0]) as Record<string, unknown>).level, "warn");
  assert.equal((JSON.parse(lines[1]) as Record<string, unknown>).level, "error");
});

test("fields with undefined values are dropped from the line", (t) => {
  const capture = capturedLines(t);
  log("info", "m", { a: undefined, b: 1 });
  const lines = capture();

  const record = JSON.parse(lines[0]) as Record<string, unknown>;
  assert.equal("a" in record, false);
  assert.equal(record.b, 1);
});
