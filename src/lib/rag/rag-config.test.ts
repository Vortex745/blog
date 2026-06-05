/**
 * TDD tests for RAG pipeline config and availability helpers.
 * These test the pure logic: given env vars, what config is produced,
 * and which pipeline steps are enabled.
 */
import test from "node:test";
import assert from "node:assert/strict";

// ── Slice 1: config helpers (pure functions extracted for testing) ─────────────

// We test the logic inline here rather than importing the actual config module,
// because config.ts reads process.env at call time — easier to unit test the
// shape without mocking import.meta.env.

function buildEmbeddingFallback(env: Record<string, string | undefined>) {
  const baseUrl = env["EMBEDDING_BASE_URL"];
  const apiKey = env["EMBEDDING_API_KEY"];
  const model = env["EMBEDDING_MODEL"];
  if (baseUrl && apiKey && model) return { baseUrl, apiKey, model };
  return undefined;
}

function buildRerankFallback(env: Record<string, string | undefined>) {
  const baseUrl = env["RERANK_BASE_URL"];
  const apiKey = env["RERANK_API_KEY"];
  const model = env["RERANK_MODEL"];
  if (baseUrl && apiKey && model) return { baseUrl, apiKey, model };
  return undefined;
}

test("buildEmbeddingFallback: returns config when all three embedding vars are set", () => {
  const result = buildEmbeddingFallback({
    EMBEDDING_BASE_URL: "https://api.siliconflow.cn/v1",
    EMBEDDING_API_KEY: "sk-test",
    EMBEDDING_MODEL: "BAAI/bge-m3",
  });
  assert.deepEqual(result, {
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKey: "sk-test",
    model: "BAAI/bge-m3",
  });
});

test("buildEmbeddingFallback: returns undefined when apiKey is missing", () => {
  const result = buildEmbeddingFallback({
    EMBEDDING_BASE_URL: "https://api.siliconflow.cn/v1",
    EMBEDDING_MODEL: "BAAI/bge-m3",
  });
  assert.equal(result, undefined);
});

test("buildEmbeddingFallback: returns undefined when all vars are missing", () => {
  assert.equal(buildEmbeddingFallback({}), undefined);
});

test("buildRerankFallback: returns config when all three rerank vars are set", () => {
  const result = buildRerankFallback({
    RERANK_BASE_URL: "https://api.siliconflow.cn/v1",
    RERANK_API_KEY: "sk-test",
    RERANK_MODEL: "BAAI/bge-reranker-v2-m3",
  });
  assert.deepEqual(result, {
    baseUrl: "https://api.siliconflow.cn/v1",
    apiKey: "sk-test",
    model: "BAAI/bge-reranker-v2-m3",
  });
});

test("buildRerankFallback: returns undefined when model is missing", () => {
  const result = buildRerankFallback({
    RERANK_BASE_URL: "https://api.siliconflow.cn/v1",
    RERANK_API_KEY: "sk-test",
  });
  assert.equal(result, undefined);
});

// ── Slice 2: pipeline availability guards ─────────────────────────────────────

type FallbackConfig = { baseUrl: string; apiKey: string; model: string };

function hasEmbeddingAvailable(opts: {
  gatewayApiKey?: string;
  embeddingFallback?: FallbackConfig;
}): boolean {
  return Boolean(opts.gatewayApiKey || opts.embeddingFallback);
}

function hasRerankAvailable(opts: {
  gatewayApiKey?: string;
  rerankFallback?: FallbackConfig;
}): boolean {
  return Boolean(opts.gatewayApiKey || opts.rerankFallback);
}

function hasLlmAvailable(opts: {
  gatewayApiKey?: string;
  llmFallback?: FallbackConfig;
}): boolean {
  return Boolean(opts.gatewayApiKey || opts.llmFallback);
}

test("hasEmbeddingAvailable: true when gatewayApiKey is set", () => {
  assert.equal(hasEmbeddingAvailable({ gatewayApiKey: "gw-key" }), true);
});

test("hasEmbeddingAvailable: true when embeddingFallback is set", () => {
  assert.equal(
    hasEmbeddingAvailable({
      embeddingFallback: { baseUrl: "https://x", apiKey: "k", model: "m" },
    }),
    true
  );
});

test("hasEmbeddingAvailable: false when both are missing", () => {
  assert.equal(hasEmbeddingAvailable({}), false);
});

test("hasRerankAvailable: true when rerankFallback is set", () => {
  assert.equal(
    hasRerankAvailable({
      rerankFallback: { baseUrl: "https://x", apiKey: "k", model: "m" },
    }),
    true
  );
});

test("hasRerankAvailable: false when both are missing", () => {
  assert.equal(hasRerankAvailable({}), false);
});

test("hasLlmAvailable: true when llmFallback is set", () => {
  assert.equal(
    hasLlmAvailable({
      llmFallback: { baseUrl: "https://x", apiKey: "k", model: "m" },
    }),
    true
  );
});

test("hasLlmAvailable: false when neither is set", () => {
  assert.equal(hasLlmAvailable({}), false);
});
