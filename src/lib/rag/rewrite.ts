import { generateObject, jsonSchema } from "ai";
import { getAssistantAiConfig } from "../ai/config";
import { getAssistantLanguageModel } from "../ai/provider";

const rewriteSchema = jsonSchema<{ query: string }>({
  type: "object",
  additionalProperties: false,
  properties: {
    query: { type: "string" },
  },
  required: ["query"],
});

export function shouldSkipRewrite(query: string): boolean {
  const trimmed = query.trim();
  if (!trimmed) return true;

  const hasCJK = /[\u4e00-\u9fff\u3400-\u4dbf]/.test(trimmed);

  if (hasCJK) {
    // CJK: ≤3 characters is a single concept, skip rewrite
    return trimmed.length <= 3;
  }

  // Latin: ≤6 chars or single word ≤10 chars, skip rewrite
  if (trimmed.length <= 6) return true;
  if (trimmed.length <= 10 && !trimmed.includes(" ")) return true;
  return false;
}

export async function rewriteRagQuery(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

  if (shouldSkipRewrite(trimmed)) return trimmed;

  const config = getAssistantAiConfig();
  if (!config.gatewayApiKey && !config.llmFallback) return trimmed;

  try {
    const result = await generateObject({
      model: getAssistantLanguageModel(config),
      schema: rewriteSchema,
      prompt: [
        "Rewrite the user query for personal-site RAG retrieval.",
        "Keep named entities and intent. Output concise Chinese or original language.",
        `Query: ${trimmed}`,
      ].join("\n"),
    });
    return result.object.query.trim() || trimmed;
  } catch {
    return trimmed;
  }
}
