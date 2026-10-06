/**
 * Tests for the RAG pipeline fallback config builders.
 * Imports the real implementation from src/lib/ai/config.ts so that
 * production drift fails these tests instead of validating a stale copy.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { buildEmbeddingFallback, buildRerankFallback } from "../ai/config";

// ── buildEmbeddingFallback ──────────────────────────────────────────────────

test("buildEmbeddingFallback: returns config when all three embedding vars are set", () => {
  assert.deepEqual(
    buildEmbeddingFallback({
      EMBEDDING_BASE_URL: "https://api.siliconflow.cn/v1",
      EMBEDDING_API_KEY: "sk-test",
      EMBEDDING_MODEL: "BAAI/bge-m3",
    }),
    { baseUrl: "https://api.siliconflow.cn/v1", apiKey: "sk-test", model: "BAAI/bge-m3" },
  );
});

test("buildEmbeddingFallback: returns undefined when one required var is missing", () => {
  assert.equal(
    buildEmbeddingFallback({ EMBEDDING_API_KEY: "sk-test", EMBEDDING_MODEL: "BAAI/bge-m3" }),
    undefined,
  );
  assert.equal(
    buildEmbeddingFallback({ EMBEDDING_BASE_URL: "https://api.siliconflow.cn/v1", EMBEDDING_MODEL: "BAAI/bge-m3" }),
    undefined,
  );
  assert.equal(
    buildEmbeddingFallback({ EMBEDDING_BASE_URL: "https://api.siliconflow.cn/v1", EMBEDDING_API_KEY: "sk-test" }),
    undefined,
  );
});

test("buildEmbeddingFallback: returns undefined when all embedding vars are missing", () => {
  assert.equal(buildEmbeddingFallback({}), undefined);
});

// ── buildRerankFallback ─────────────────────────────────────────────────────

test("buildRerankFallback: returns config when all three rerank vars are set", () => {
  assert.deepEqual(
    buildRerankFallback({
      RERANK_BASE_URL: "https://api.siliconflow.cn/v1",
      RERANK_API_KEY: "sk-test",
      RERANK_MODEL: "BAAI/bge-reranker-v2-m3",
    }),
    { baseUrl: "https://api.siliconflow.cn/v1", apiKey: "sk-test", model: "BAAI/bge-reranker-v2-m3" },
  );
});

test("buildRerankFallback: returns undefined when one required var is missing", () => {
  assert.equal(
    buildRerankFallback({ RERANK_API_KEY: "sk-test", RERANK_MODEL: "BAAI/bge-reranker-v2-m3" }),
    undefined,
  );
  assert.equal(
    buildRerankFallback({ RERANK_BASE_URL: "https://api.siliconflow.cn/v1", RERANK_MODEL: "BAAI/bge-reranker-v2-m3" }),
    undefined,
  );
  assert.equal(
    buildRerankFallback({ RERANK_BASE_URL: "https://api.siliconflow.cn/v1", RERANK_API_KEY: "sk-test" }),
    undefined,
  );
});

test("buildRerankFallback: returns undefined when all rerank vars are missing", () => {
  assert.equal(buildRerankFallback({}), undefined);
});
