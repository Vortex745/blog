import test from "node:test";
import assert from "node:assert/strict";

import { filterModelsByType } from "./llm-model-filter.js";

// ── Slice 1: LLM 过滤（基准，原逻辑正确）─────────────────────────────────────
test("filterModelsByType llm: excludes embed and rerank models", () => {
  const ids = [
    "gpt-4o",
    "gpt-4o-mini",
    "text-embedding-3-small",
    "BAAI/bge-reranker-v2-m3",
  ];
  const result = filterModelsByType(ids, "llm");
  assert.deepEqual(result, ["gpt-4o", "gpt-4o-mini"]);
});

// ── Slice 2: Embedding 关键词覆盖 ─────────────────────────────────────────────

test("filterModelsByType embedding: matches 'embed' suffix (text-embedding-3-small)", () => {
  const ids = ["text-embedding-3-small", "gpt-4o"];
  assert.deepEqual(filterModelsByType(ids, "embedding"), ["text-embedding-3-small"]);
});

test("filterModelsByType embedding: matches BAAI/bge-m3 (bge keyword)", () => {
  const ids = ["BAAI/bge-m3", "gpt-4o"];
  const result = filterModelsByType(ids, "embedding");
  assert.deepEqual(result, ["BAAI/bge-m3"]);
});

test("filterModelsByType embedding: matches Pro/BAAI/bge-m3 (bge keyword)", () => {
  const ids = ["Pro/BAAI/bge-m3", "gpt-4o"];
  const result = filterModelsByType(ids, "embedding");
  assert.deepEqual(result, ["Pro/BAAI/bge-m3"]);
});

test("filterModelsByType embedding: matches gte-Qwen2-7B (gte keyword)", () => {
  const ids = ["Alibaba-NLP/gte-Qwen2-7B-instruct", "gpt-4o"];
  const result = filterModelsByType(ids, "embedding");
  assert.deepEqual(result, ["Alibaba-NLP/gte-Qwen2-7B-instruct"]);
});

test("filterModelsByType embedding: matches e5-mistral (e5 keyword)", () => {
  const ids = ["intfloat/e5-mistral-7b-instruct", "gpt-4o"];
  const result = filterModelsByType(ids, "embedding");
  assert.deepEqual(result, ["intfloat/e5-mistral-7b-instruct"]);
});

test("filterModelsByType embedding: matches text-similarity keyword", () => {
  const ids = ["text-similarity-ada-001", "gpt-4o"];
  assert.deepEqual(filterModelsByType(ids, "embedding"), ["text-similarity-ada-001"]);
});

test("filterModelsByType embedding: matches netease bce-embedding", () => {
  const ids = ["netease-youdao/bce-embedding-base_v1", "gpt-4o"];
  assert.deepEqual(filterModelsByType(ids, "embedding"), ["netease-youdao/bce-embedding-base_v1"]);
});

test("filterModelsByType embedding: excludes rerank models", () => {
  const ids = ["BAAI/bge-m3", "BAAI/bge-reranker-v2-m3"];
  // reranker 模型不应混入 embedding 列表
  const result = filterModelsByType(ids, "embedding");
  assert.deepEqual(result, ["BAAI/bge-m3"]);
});

// ── Slice 3: Rerank 过滤（原逻辑正确，验证不退化）──────────────────────────────

test("filterModelsByType rerank: matches bge-reranker", () => {
  const ids = ["BAAI/bge-reranker-v2-m3", "gpt-4o", "BAAI/bge-m3"];
  assert.deepEqual(filterModelsByType(ids, "rerank"), ["BAAI/bge-reranker-v2-m3"]);
});

test("filterModelsByType rerank: matches rerank-v3.5 (Cohere)", () => {
  const ids = ["rerank-v3.5", "command-r-plus"];
  assert.deepEqual(filterModelsByType(ids, "rerank"), ["rerank-v3.5"]);
});

test("filterModelsByType rerank: matches jina-reranker", () => {
  const ids = ["jina-reranker-v2-base-multilingual", "jina-embeddings-v3"];
  assert.deepEqual(filterModelsByType(ids, "rerank"), ["jina-reranker-v2-base-multilingual"]);
});

// ── Slice 4: 无 type 时返回全量 ──────────────────────────────────────────────

test("filterModelsByType unknown type: returns all ids unchanged", () => {
  const ids = ["gpt-4o", "BAAI/bge-m3", "rerank-v3.5"];
  assert.deepEqual(filterModelsByType(ids, ""), ids);
});
