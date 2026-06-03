import type { RagContext, RagSearchItem } from "./types";

export function buildContextText(items: RagSearchItem[]): string {
  return items
    .map((item, index) => {
      const tags = item.tags.length > 0 ? ` tags=${item.tags.join(",")}` : "";
      return `[${index + 1}] ${item.title}${tags}\nsource=${item.metadata.url || item.metadata.sourceId || item.documentId}\n${item.text}`;
    })
    .join("\n\n---\n\n");
}

export function buildRagContext(query: string, rewrittenQuery: string, items: RagSearchItem[]): RagContext {
  return {
    query,
    rewrittenQuery,
    items,
    contextText: buildContextText(items),
  };
}
