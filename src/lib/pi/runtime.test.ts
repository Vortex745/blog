import test from "node:test";
import assert from "node:assert/strict";

import {
  AI_GATEWAY_BASE_URL,
  resolvePiChatEndpoint,
  toPiSimpleMessages,
} from "./runtime";
import { extractJsonObject } from "./json";
import type { AssistantAiConfig } from "../ai/config";

function makeConfig(overrides: Partial<AssistantAiConfig> = {}): AssistantAiConfig {
  return {
    model: "openai/gpt-4o-mini",
    ...overrides,
  };
}

test("resolvePiChatEndpoint routes the AI Gateway through its OpenAI-compatible endpoint", () => {
  const endpoint = resolvePiChatEndpoint(
    makeConfig({ gatewayApiKey: "gw-key", model: "openai/gpt-4o-mini" }),
  );
  assert.deepEqual(endpoint, {
    baseUrl: AI_GATEWAY_BASE_URL,
    apiKey: "gw-key",
    model: "openai/gpt-4o-mini",
  });
});

test("resolvePiChatEndpoint falls back to the admin LLM_* settings without a gateway key", () => {
  const endpoint = resolvePiChatEndpoint(
    makeConfig({
      llmFallback: { baseUrl: "https://api.deepseek.com/v1", apiKey: "sk-test", model: "deepseek-chat" },
    }),
  );
  assert.deepEqual(endpoint, {
    baseUrl: "https://api.deepseek.com/v1",
    apiKey: "sk-test",
    model: "deepseek-chat",
  });
});

test("resolvePiChatEndpoint returns undefined without any LLM configuration", () => {
  assert.equal(resolvePiChatEndpoint(makeConfig()), undefined);
});

test("toPiSimpleMessages preserves the admin proxy message order and roles", () => {
  const mapped = toPiSimpleMessages([
    { role: "system", content: "s" },
    { role: "user", content: "u" },
    { role: "assistant", content: "a" },
  ]);
  assert.deepEqual(mapped.map((message) => message.role), ["system", "user", "assistant"]);
});

test("extractJsonObject pulls JSON out of fenced or prose-wrapped output", () => {
  assert.deepEqual(extractJsonObject<{ a: number }>('{"a": 1}'), { a: 1 });
  assert.deepEqual(extractJsonObject<{ a: number }>('```json\n{"a": 2}\n```'), { a: 2 });
  assert.deepEqual(extractJsonObject<{ a: number }>('结果如下：{"a": 3} 请查收'), { a: 3 });
  assert.equal(extractJsonObject("没有 JSON"), undefined);
  assert.equal(extractJsonObject('{"a": 1'), undefined);
});
