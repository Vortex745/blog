import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getAssistantAiConfig } from "./config";
import { getAssistantLanguageModel } from "./provider";
import { retrieveRagContext } from "../rag/retrieve";

const SYSTEM_PROMPT = [
  "你是这个个人博客里的站内 AI 助手。",
  "优先用简洁、自然的中文回答。",
  "不确定时直接说明不确定，不要编造站内不存在的信息。",
  "如果使用了站内检索上下文，回答时优先依据上下文，并自然说明来源页面。",
].join("\n");

function partText(part: unknown): string {
  if (!part || typeof part !== "object") return "";
  const source = part as { type?: unknown; text?: unknown };
  return source.type === "text" && typeof source.text === "string" ? source.text : "";
}

function messageText(message: UIMessage): string {
  const parts = (message as { parts?: unknown }).parts;
  if (!Array.isArray(parts)) return "";
  return parts.map(partText).filter(Boolean).join("\n").trim();
}

function lastUserText(messages: UIMessage[]): string {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index] as UIMessage & { role?: unknown };
    if (message.role === "user") return messageText(message);
  }
  return "";
}

async function buildSystemPrompt(messages: UIMessage[]) {
  const query = lastUserText(messages);
  if (!query) return SYSTEM_PROMPT;

  const context = await retrieveRagContext(query, { limit: 6 }).catch(() => null);
  if (!context || context.items.length === 0) return SYSTEM_PROMPT;

  return [
    SYSTEM_PROMPT,
    "站内检索上下文：",
    context.contextText,
  ].join("\n\n");
}

export async function streamAssistantChat(messages: UIMessage[]) {
  const config = getAssistantAiConfig();

  const result = streamText({
    model: getAssistantLanguageModel(config),
    system: await buildSystemPrompt(messages),
    messages: await convertToModelMessages(messages),
    temperature: config.temperature,
  });

  return result.toUIMessageStreamResponse();
}
