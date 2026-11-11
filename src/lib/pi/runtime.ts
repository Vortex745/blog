import {
  createModels,
  createProvider,
  contentText,
  type AssistantMessage,
  type Message,
  type Model,
  type MutableModels,
  type Usage,
} from "@earendil-works/pi-ai";
import { openAICompletionsApi } from "@earendil-works/pi-ai/api/openai-completions.lazy";
import { getAssistantAiConfig, type AssistantAiConfig } from "../ai/config";

/**
 * pi-ai runtime: the unified LLM invocation layer for the blog.
 *
 * All text-generation calls (admin LLM proxy today; any future agent rebuild)
 * go through @earendil-works/pi-ai against any OpenAI-compatible endpoint.
 */

const CHAT_PROVIDER_ID = "blog-llm";

/** Vercel AI Gateway's OpenAI-compatible endpoint (vercel.com/docs/ai-gateway). */
export const AI_GATEWAY_BASE_URL = "https://ai-gateway.vercel.sh/v1";

/** Catalog rates for self-described endpoints; nothing in the blog surfaces cost today. */
const UNKNOWN_MODEL_COST = { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 };

const EMPTY_USAGE: Usage = {
  input: 0,
  output: 0,
  cacheRead: 0,
  cacheWrite: 0,
  totalTokens: 0,
  cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
};

export type PiChatEndpoint = {
  baseUrl: string;
  apiKey: string;
  model: string;
};

/**
 * Precedence mirrors the old `ai`-package provider: the AI Gateway wins when
 * a key is configured (routed through its OpenAI-compatible endpoint),
 * otherwise the admin-managed LLM_* fallback applies.
 */
export function resolvePiChatEndpoint(config: AssistantAiConfig): PiChatEndpoint | undefined {
  if (config.gatewayApiKey) {
    return { baseUrl: AI_GATEWAY_BASE_URL, apiKey: config.gatewayApiKey, model: config.model };
  }
  if (config.llmFallback) {
    return { ...config.llmFallback };
  }
  return undefined;
}

export type PiChatRuntime = {
  models: MutableModels;
  model: Model<"openai-completions">;
};

/** Build a pi-ai Models collection around one OpenAI-compatible endpoint. */
export function createOpenAiCompatibleRuntime(
  endpoint: PiChatEndpoint,
  providerId: string = CHAT_PROVIDER_ID,
): PiChatRuntime {
  const model: Model<"openai-completions"> = {
    id: endpoint.model,
    name: endpoint.model,
    api: "openai-completions",
    provider: providerId,
    baseUrl: endpoint.baseUrl,
    reasoning: false,
    input: ["text"],
    cost: UNKNOWN_MODEL_COST,
    contextWindow: 128_000,
    maxTokens: 8_192,
  };

  const provider = createProvider({
    id: providerId,
    name: providerId,
    baseUrl: endpoint.baseUrl,
    auth: {
      apiKey: {
        name: "LLM API key",
        resolve: async () => ({ auth: { apiKey: endpoint.apiKey } }),
      },
    },
    models: [model],
    api: openAICompletionsApi(),
  });

  const models = createModels();
  models.setProvider(provider);
  return { models, model };
}

let cachedRuntime: { fingerprint: string; runtime: PiChatRuntime } | undefined;

/**
 * Shared chat runtime rebuilt whenever the underlying env config changes
 * (the admin UI can rewrite env values at runtime).
 */
export function getPiChatRuntime(config?: AssistantAiConfig): PiChatRuntime | undefined {
  const endpoint = resolvePiChatEndpoint(config ?? getAssistantAiConfig());
  if (!endpoint) return undefined;

  const fingerprint = [endpoint.baseUrl, endpoint.apiKey, endpoint.model].join("\u241f");
  if (cachedRuntime?.fingerprint !== fingerprint) {
    cachedRuntime = { fingerprint, runtime: createOpenAiCompatibleRuntime(endpoint) };
  }
  return cachedRuntime.runtime;
}

function assistantHistoryMessage(text: string): AssistantMessage {
  return {
    role: "assistant",
    content: [{ type: "text", text }],
    api: "openai-completions",
    provider: "history",
    model: "history",
    stopReason: "stop",
    usage: EMPTY_USAGE,
    timestamp: Date.now(),
  };
}

export type SimpleChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

/** Map the admin proxy's plain {role, content} list onto pi messages. */
export function toPiSimpleMessages(messages: readonly SimpleChatMessage[]): Message[] {
  return messages.map((message) => {
    if (message.role === "system") {
      return { role: "system", content: message.content, timestamp: Date.now() } satisfies Message;
    }
    if (message.role === "assistant") {
      return assistantHistoryMessage(message.content);
    }
    return { role: "user", content: message.content, timestamp: Date.now() } satisfies Message;
  });
}

/** Joined text of a pi assistant response. */
export function piResponseText(message: AssistantMessage): string {
  return contentText(message.content);
}
