// Shared AI-polish constants and request core for the admin pages
// (articles / projects / about). The request path always goes through
// admin-llm.ts requestLlmChat, so /api/llm is called the same way from every
// page (slow fallback included) — about.astro's hand-written fetch + 8s
// slowTimer were migrated onto this path as part of T8.

import {
  fetchLlmSettings,
  getLlmSettings,
  hasLlmSettings,
  requestLlmChat,
  type LlmSettings,
} from "./admin-llm";

export const ANTI_AI_RULES =
  "你是一位文字编辑。处理文本时：1.删除填充短语和强调性拐杖词 2.打破公式化结构，避免否定式排比 3.变化句子节奏，三项改两项或四项 4.用具体细节替代模糊归因 5.避免宣传性语言 6.用「是/有」替代「作为/标志着」 7.避免破折号和粗体过度使用 8.信任读者，不手把手引导 9.保留第一人称和复杂感受 10.像真人说话，不是新闻稿。";

export const PRESET_PROMPTS: Record<string, string> = {
  polite:
    ANTI_AI_RULES +
    " 请润色以下 Markdown 文本，使其更加流畅、优雅，修正语法和用词，但保留原始含义和 Markdown 格式不变。只输出润色后的内容，不要解释。",
  concise:
    ANTI_AI_RULES +
    " 请精简以下 Markdown 文本，删除冗余词句，使其更加紧凑有力，但保留核心含义和 Markdown 格式不变。只输出精简后的内容，不要解释。",
  expand:
    ANTI_AI_RULES +
    " 请扩写以下 Markdown 文本，在保留原意的基础上增加更多细节和论述，使内容更加丰富充实，Markdown 格式不变。只输出扩写后的内容，不要解释。",
  translate:
    "请将以下 Markdown 文本翻译为英文，保持 Markdown 格式不变。只输出翻译后的内容，不要解释。",
};

export const PROJECT_POLISH_PROMPTS: Record<string, string> = {
  polite:
    ANTI_AI_RULES +
    " 请润色以下项目介绍，使其更清晰、专业、有吸引力，但保留原始信息和语气。只输出润色后的项目介绍，不要解释。",
  concise:
    ANTI_AI_RULES +
    " 请精简以下项目介绍，去掉冗余表达，保留关键亮点。只输出精简后的项目介绍，不要解释。",
  expand:
    ANTI_AI_RULES +
    " 请扩写以下项目介绍，在保留事实的基础上补充价值、场景和亮点，使其更适合作品集展示。只输出扩写后的项目介绍，不要解释。",
};

/**
 * Resolve usable LLM settings: localStorage first, then /api/env-config.
 * Returns null when neither source yields a baseUrl + model pair.
 */
export async function ensureLlmSettings(): Promise<LlmSettings | null> {
  let settings = getLlmSettings();
  if (!hasLlmSettings(settings)) {
    settings = await fetchLlmSettings();
  }
  return hasLlmSettings(settings) ? settings : null;
}

/**
 * Run one polish round-trip: system prompt + user content at temperature 0.7,
 * with the shared 8s slow-response callback hook.
 */
export async function runAiPolish(options: {
  content: string;
  systemPrompt: string;
  onSlow?: () => void;
}): Promise<string> {
  return requestLlmChat({
    messages: [
      { role: "system", content: options.systemPrompt },
      { role: "user", content: options.content },
    ],
    temperature: 0.7,
    onSlow: options.onSlow,
  });
}
