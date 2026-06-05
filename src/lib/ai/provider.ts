import { createGateway, gateway, type EmbeddingModel, type LanguageModel, type RerankingModel } from "ai";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { AssistantAiConfig } from "./config";
import { buildOpenAiCompatibleEndpoint } from "../llm-endpoint";

function getGatewayProvider(config: AssistantAiConfig) {
  return config.gatewayApiKey
    ? createGateway({ apiKey: config.gatewayApiKey })
    : gateway;
}

/** Strip trailing path components after /v1 to get the provider base URL. */
function toBaseUrl(rawUrl: string): string {
  return rawUrl.trim().replace(/\/+$/, "");
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
  // Fallback: use EMBEDDING_* config as an OpenAI-compatible embedding provider
  if (!config.gatewayApiKey && config.embeddingFallback) {
    const { baseUrl, apiKey, model } = config.embeddingFallback;
    const provider = createOpenAICompatible({
      name: "embedding-fallback",
      baseURL: toBaseUrl(baseUrl),
      apiKey,
    });
    return provider.textEmbeddingModel(model);
  }

  return getGatewayProvider(config).embeddingModel(config.embeddingModel);
}

export function getAssistantRerankingModel(config: AssistantAiConfig): RerankingModel {
  // Fallback: use RERANK_* config as an OpenAI-compatible reranking provider
  if (!config.gatewayApiKey && config.rerankFallback) {
    const { baseUrl, apiKey, model } = config.rerankFallback;
    const provider = createOpenAICompatible({
      name: "rerank-fallback",
      baseURL: toBaseUrl(baseUrl),
      apiKey,
    });
    // rerankingModel is optional on the OpenAI-compatible provider type;
    // if the configured provider supports it (e.g. SiliconFlow, Cohere), it will be defined.
    if (provider.rerankingModel) {
      return provider.rerankingModel(model);
    }
  }

  return getGatewayProvider(config).rerankingModel(config.rerankModel);
}
