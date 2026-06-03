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

export type AssistantAiConfig = {
  model: string;
  temperature: number;
  gatewayApiKey?: string;
  embeddingModel: string;
  embeddingDimensions: number;
  rerankModel: string;
  llmFallback?: LlmFallbackConfig;
};

export function getAssistantAiConfig(): AssistantAiConfig {
  const gatewayApiKey = readServerEnv("AI_GATEWAY_API_KEY");

  // When no Gateway key is configured, try to fall back to the LLM_* settings
  // that the user configured in the admin API management page.
  let llmFallback: LlmFallbackConfig | undefined;
  if (!gatewayApiKey) {
    const baseUrl = readServerEnv("LLM_BASE_URL");
    const apiKey = readServerEnv("LLM_API_KEY");
    const model = readServerEnv("LLM_MODEL");
    if (baseUrl && apiKey && model) {
      llmFallback = { baseUrl, apiKey, model };
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
  };
}

