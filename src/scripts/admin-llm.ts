export type LlmMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type LlmSettings = {
  baseUrl?: string;
  model?: string;
};

export const LLM_SETTINGS_KEY = "admin-llm-settings";

let cachedServerSettings: LlmSettings | null | undefined = undefined;

export function getLlmSettings(): LlmSettings | null {
  // Prefer localStorage (fast, synchronous)
  try {
    const raw = localStorage.getItem(LLM_SETTINGS_KEY);
    if (raw) return JSON.parse(raw) as LlmSettings;
  } catch {}
  // Fallback to cached server settings
  return cachedServerSettings ?? null;
}

export async function fetchLlmSettings(): Promise<LlmSettings | null> {
  try {
    const res = await fetch("/api/env-config");
    const data = await res.json();
    if (data.ok && data.config) {
      const settings: LlmSettings = {
        baseUrl: data.config.LLM_BASE_URL || undefined,
        model: data.config.LLM_MODEL || undefined,
      };
      cachedServerSettings = settings;
      // Also sync to localStorage for next time
      if (settings.baseUrl && settings.model) {
        localStorage.setItem(LLM_SETTINGS_KEY, JSON.stringify(settings));
      }
      return settings;
    }
  } catch {}
  return null;
}

export function hasLlmSettings(settings: LlmSettings | null): settings is Required<LlmSettings> {
  return Boolean(settings?.baseUrl && settings?.model);
}

export async function requestLlmChat(options: {
  messages: LlmMessage[];
  temperature?: number;
  maxTokens?: number;
  slowMs?: number;
  onSlow?: () => void;
  baseUrl?: string;
  model?: string;
  apiKey?: string;
}): Promise<string> {
  const settings = getLlmSettings();
  const baseUrl = options.baseUrl ?? settings?.baseUrl;
  const model = options.model ?? settings?.model;

  if (!baseUrl || !model) {
    throw new Error("LLM API 未配置，请先在 API 管理中填写设置");
  }

  const slowMs = options.slowMs ?? 8000;
  const slowTimer = options.onSlow && slowMs > 0
    ? window.setTimeout(options.onSlow, slowMs)
    : undefined;

  try {
    const response = await fetch("/api/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        baseUrl,
        model,
        apiKey: options.apiKey,
        messages: options.messages,
        temperature: options.temperature ?? 0.7,
        maxTokens: options.maxTokens,
      }),
    });

    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.ok) {
      throw new Error(result.message || `LLM API 请求失败 (HTTP ${response.status})`);
    }

    const content = typeof result.content === "string" ? result.content.trim() : null;
    if (content === null) throw new Error("LLM API 返回内容为空");
    return content;

  } finally {
    if (slowTimer) window.clearTimeout(slowTimer);
  }
}
