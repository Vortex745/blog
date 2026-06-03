import { rerank } from "ai";
import { getAssistantAiConfig } from "../ai/config";
import { getAssistantRerankingModel } from "../ai/provider";
import type { RagSearchItem } from "./types";

export async function rerankRagItems(query: string, items: RagSearchItem[], topN: number): Promise<RagSearchItem[]> {
  const config = getAssistantAiConfig();
  if (!config.gatewayApiKey || items.length < 2) return items.slice(0, topN);

  try {
    const result = await rerank({
      model: getAssistantRerankingModel(config),
      query,
      documents: items.map((item) => ({
        id: item.id,
        title: item.title,
        text: item.text,
      })),
      topN,
    });
    const byId = new Map(items.map((item) => [item.id, item]));
    return result.ranking
      .map((ranked) => byId.get(ranked.document.id))
      .filter((item): item is RagSearchItem => Boolean(item));
  } catch {
    return items.slice(0, topN);
  }
}
