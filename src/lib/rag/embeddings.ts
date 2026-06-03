import { embed, embedMany } from "ai";
import { getAssistantAiConfig } from "../ai/config";
import { getAssistantEmbeddingModel } from "../ai/provider";

export type EmbedTexts = (texts: string[]) => Promise<number[][]>;
export type EmbedQuery = (query: string) => Promise<number[]>;

export async function embedTextsWithAi(texts: string[], embeddingModel?: string): Promise<number[][]> {
  if (texts.length === 0) return [];
  const config = {
    ...getAssistantAiConfig(),
    ...(embeddingModel ? { embeddingModel } : {}),
  };
  const result = await embedMany({
    model: getAssistantEmbeddingModel(config),
    values: texts,
  });
  return result.embeddings;
}

export async function embedQueryWithAi(query: string, embeddingModel?: string): Promise<number[]> {
  const config = {
    ...getAssistantAiConfig(),
    ...(embeddingModel ? { embeddingModel } : {}),
  };
  const result = await embed({
    model: getAssistantEmbeddingModel(config),
    value: query,
  });
  return result.embedding;
}
