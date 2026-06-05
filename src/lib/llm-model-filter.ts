/**
 * 按模型类型过滤 model ID 列表。
 *
 * 设计原则：
 * - embedding: 同时匹配多个主流命名模式，避免遗漏 BAAI/bge-m3 等无 "embed" 后缀的模型
 * - rerank: 原逻辑正确，保留
 * - llm: 排除 embedding 和 rerank 模型
 * - 未知 type: 返回全量，让调用方自行决定
 */

const EMBEDDING_PATTERNS = [
  "embed",          // text-embedding-*, *-embedding-*, embedding-*
  "text-similarity",
  "bge-",           // BAAI/bge-m3, Pro/BAAI/bge-m3, bge-large-zh
  "/gte-",          // Alibaba-NLP/gte-Qwen2-7B (避免匹配 "budget" 等不相关词)
  "/e5-",           // intfloat/e5-mistral-7b (路径分隔符前缀，精确匹配)
];

const RERANK_PATTERN = "rerank";

export function filterModelsByType(ids: string[], type: string): string[] {
  const lower = (id: string) => id.toLowerCase();

  if (type === "embedding") {
    return ids.filter((id) => {
      const l = lower(id);
      // 先排除 rerank 模型（bge-reranker 含 "bge-" 但属于 rerank）
      if (l.includes(RERANK_PATTERN)) return false;
      return EMBEDDING_PATTERNS.some((p) => l.includes(p));
    });
  }

  if (type === "rerank") {
    return ids.filter((id) => lower(id).includes(RERANK_PATTERN));
  }

  if (type === "llm") {
    return ids.filter((id) => {
      const l = lower(id);
      if (l.includes(RERANK_PATTERN)) return false;
      if (EMBEDDING_PATTERNS.some((p) => l.includes(p))) return false;
      return true;
    });
  }

  // 未知 type：返回全量
  return ids;
}

/**
 * 根据模型类型返回对应的环境变量 key 名称。
 * 用于后端 apiKey fallback，避免硬编码 LLM_API_KEY。
 */
export function getApiKeyEnvName(type: string): string {
  if (type === "embedding") return "EMBEDDING_API_KEY";
  if (type === "rerank") return "RERANK_API_KEY";
  return "LLM_API_KEY";
}
