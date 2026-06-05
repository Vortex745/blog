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

export async function rewriteRagQuery(query: string): Promise<string> {
  const trimmed = query.trim();
  if (!trimmed) return trimmed;

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
