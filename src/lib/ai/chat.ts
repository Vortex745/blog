import {
  convertToModelMessages,
  streamText,
  type UIMessage,
} from "ai";
import { getAssistantAiConfig } from "./config";
import { getAssistantLanguageModel } from "./provider";
import { retrieveRagContext } from "../rag/retrieve";

const SYSTEM_PROMPT = [
  "你是这个个人博客里的站内 AI 助手，只回答与本博客内容相关的问题。",
  "",
  "回答规则：",
  "- 博客内容相关的问题：严格依据下方站内检索上下文回答，不添加博客中不存在的信息，并自然说明来源页面。",
  "- 问题与博客内容相关但标注未检索到内容：回复\"很抱歉，目前博客没有相关内容\"。",
  "- 与博客无关的问题（如通用知识、科普、写作或代码请求）：回复\"目前内容我还不懂，无法回答\"。",
  "- 问候、寒暄，以及结合上文对刚才回答的追问：正常回应。",
  "",
  "优先用简洁、自然的中文回答。",
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
  if (!context || context.items.length === 0) {
    // 区分"检索过但为空"与"无需检索的寒暄"：问候语同样会走到这里，
    // 场景判断交给模型，这里只提供事实（已检索、无结果）。
    return [SYSTEM_PROMPT, "（本次未检索到相关站内内容）"].join("\n\n");
  }

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
