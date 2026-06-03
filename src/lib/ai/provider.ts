import { createGateway, gateway, type EmbeddingModel, type LanguageModel, type RerankingModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AssistantAiConfig } from "./config";
import { buildOpenAiCompatibleEndpoint } from "../llm-endpoint";

function getGatewayProvider(config: AssistantAiConfig) {
  return config.gatewayApiKey
    ? createGateway({ apiKey: config.gatewayApiKey })
    : gateway;
}

export function getAssistantLanguageModel(config: AssistantAiConfig): LanguageModel {
  // Fallback: use LLM_* config as an OpenAI-compatible provider when no Gateway key
  if (!config.gatewayApiKey && config.llmFallback) {
    const { baseUrl, apiKey, model } = config.llmFallback;
    const endpointResult = buildOpenAiCompatibleEndpoint(baseUrl, "chat/completions");
    if (!("error" in endpointResult)) {
      // Strip the /chat/completions suffix — createOpenAICompatible needs the base URL
      const base = endpointResult.endpoint.href.replace(/\/chat\/completions$/, "");
      const provider = createOpenAICompatible({ name: "llm-fallback", baseURL: base, apiKey });
      return provider(model);
    }
  }

  const provider = getGatewayProvider(config);
  return provider(config.model);
}

export function getAssistantEmbeddingModel(config: AssistantAiConfig): EmbeddingModel {
  return getGatewayProvider(config).embeddingModel(config.embeddingModel);
}

export function getAssistantRerankingModel(config: AssistantAiConfig): RerankingModel {
  return getGatewayProvider(config).rerankingModel(config.rerankModel);
}
