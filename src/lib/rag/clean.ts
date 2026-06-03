import { generateObject, jsonSchema } from "ai";
import { stripMarkdown } from "../markdown";
import { getAssistantAiConfig } from "../ai/config";
import { getAssistantLanguageModel } from "../ai/provider";
import type { RagDocument } from "./types";

type CleanResult = {
  cleanContent: string;
  summary: string;
  keywords: string[];
};

const cleanResultSchema = jsonSchema<CleanResult>({
  type: "object",
  additionalProperties: false,
  properties: {
    cleanContent: { type: "string" },
    summary: { type: "string" },
    keywords: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["cleanContent", "summary", "keywords"],
});

export function cleanDocumentText(document: Pick<RagDocument, "content">): string {
  return stripMarkdown(document.content)
    .replace(/\s+/g, " ")
    .trim();
}

export async function cleanDocumentWithAi(document: RagDocument): Promise<RagDocument> {
  const config = getAssistantAiConfig();
  if (!config.gatewayApiKey) {
    return { ...document, cleanContent: cleanDocumentText(document) || document.cleanContent };
  }

  try {
    const result = await generateObject({
      model: getAssistantLanguageModel(config),
      schema: cleanResultSchema,
      prompt: [
        "清理站内 RAG 文档，保留事实、标题层级和可检索关键词。",
        "删除导航、重复提示和无意义符号。不要改写专有名词。",
        `标题：${document.title}`,
        `正文：\n${document.content}`,
      ].join("\n\n"),
    });

    return {
      ...document,
      cleanContent: result.object.cleanContent || cleanDocumentText(document),
      metadata: {
        ...document.metadata,
        summary: result.object.summary,
        keywords: result.object.keywords,
      },
    };
  } catch {
    return { ...document, cleanContent: cleanDocumentText(document) || document.cleanContent };
  }
}
