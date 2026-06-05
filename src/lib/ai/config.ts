import { readNumberServerEnv, readServerEnv } from "../env";

const DEFAULT_MODEL = "openai/gpt-4o-mini";
const DEFAULT_TEMPERATURE = 0.7;
const DEFAULT_EMBEDDING_MODEL = "openai/text-embedding-3-small";
const DEFAULT_RERANK_MODEL = "cohere/rerank-v3.5";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export type LlmFallbackConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type EmbeddingFallbackConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type RerankFallbackConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type AssistantAiConfig = {
  model: string;
  temperature: number;
  gatewayApiKey?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  rerankModel: string;
  llmFallback?: LlmFallbackConfig;
  embeddingFallback?: EmbeddingFallbackConfig;
  rerankFallback?: RerankFallbackConfig;
};

export function getAssistantAiConfig(): AssistantAiConfig {
  const gatewayApiKey = readServerEnv("AI_GATEWAY_API_KEY");

  // LLM fallback: used when no Gateway key, falls back to LLM_* admin settings
  let llmFallback: LlmFallbackConfig | undefined;
  if (!gatewayApiKey) {
    const baseUrl = readServerEnv("LLM_BASE_URL");
    const apiKey = readServerEnv("LLM_API_KEY");
    const model = readServerEnv("LLM_MODEL");
    if (baseUrl && apiKey && model) {
      llmFallback = { baseUrl, apiKey, model };
    }
  }

  // Embedding fallback: independent embedding provider (e.g. SiliconFlow)
  let embeddingFallback: EmbeddingFallbackConfig | undefined;
  if (!gatewayApiKey) {
    const baseUrl = readServerEnv("EMBEDDING_BASE_URL");
    const apiKey = readServerEnv("EMBEDDING_API_KEY");
    const model = readServerEnv("EMBEDDING_MODEL");
    if (baseUrl && apiKey && model) {
      embeddingFallback = { baseUrl, apiKey, model };
    }
  }

  // Rerank fallback: independent rerank provider (e.g. SiliconFlow, Cohere direct)
  let rerankFallback: RerankFallbackConfig | undefined;
  if (!gatewayApiKey) {
    const baseUrl = readServerEnv("RERANK_BASE_URL");
    const apiKey = readServerEnv("RERANK_API_KEY");
    const model = readServerEnv("RERANK_MODEL");
    if (baseUrl && apiKey && model) {
      rerankFallback = { baseUrl, apiKey, model };
    }
  }

  return {
    model: readServerEnv("AI_CHAT_MODEL") || DEFAULT_MODEL,
    temperature: readNumberServerEnv("AI_CHAT_TEMPERATURE", DEFAULT_TEMPERATURE),
    gatewayApiKey,
    embeddingModel: readServerEnv("AI_EMBEDDING_MODEL") || DEFAULT_EMBEDDING_MODEL,
    embeddingDimensions: readNumberServerEnv("AI_EMBEDDING_DIMENSIONS", DEFAULT_EMBEDDING_DIMENSIONS),
    rerankModel: readServerEnv("AI_RERANK_MODEL") || DEFAULT_RERANK_MODEL,
    llmFallback,
    embeddingFallback,
    rerankFallback,
  };
}
