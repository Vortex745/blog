import { readServerEnv } from "../env";

const DEFAULT_MODEL = "openai/gpt-4o-mini";

export type LlmFallbackConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

export type AssistantAiConfig = {
  model: string;
  gatewayApiKey?: string;
  llmFallback?: LlmFallbackConfig;
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

  return {
    model: readServerEnv("AI_CHAT_MODEL") || DEFAULT_MODEL,
    gatewayApiKey,
    llmFallback,
  };
}
