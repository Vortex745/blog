export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmSettings = {
  baseUrl?: string;
  apiKey?: string;
  model?: string;
};

export const LLM_SETTINGS_KEY = "admin-llm-settings";

export function getLlmSettings(): LlmSettings | null {
  try {
    const raw = localStorage.getItem(LLM_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as LlmSettings;
  } catch {}
  return null;
}

export function hasLlmSettings(settings: LlmSettings | null): settings is Required<LlmSettings> {
  return Boolean(settings?.baseUrl && settings?.apiKey && settings?.model);
}

export async function requestLlmChat(options: {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const settings = getLlmSettings();
  if (!hasLlmSettings(settings)) {
    throw new Error("LLM API 未配置，请先在 API 管理中填写并保存设置");
  }

  const response = await fetch("/api/llm", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: settings.baseUrl,
      apiKey: settings.apiKey,
      model: settings.model,
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      maxTokens: options.maxTokens,
    }),
  });

  const result = await response.json().catch(() => ({}));
  if (!response.ok || !result.ok) {
    throw new Error(result.message || `LLM API 请求失败 (HTTP ${response.status})`);
  }

  const content = typeof result.content === "string" ? result.content.trim() : "";
  if (!content) throw new Error("LLM API 返回内容为空");
  return content;
}
