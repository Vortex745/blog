type ChatPhase = "closed" | "idle" | "streaming";
type ChatMessage = { role: "user" | "assistant"; content: string };
type ChatEvent =
  | { type: "text.delta"; delta: string }
  | { type: "run.completed"; content: string }
  | { type: "run.failed"; message: string };

const SESSION_KEY = "agent-chat-session-id";
const HISTORY_KEY = "agent-chat-history";
const HISTORY_LIMIT = 50;
const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const FALLBACK_ERROR = "AI 助手暂时不可用，请稍后再试。";
const INTERRUPTED_ERROR = "连接中断，请稍后重试";

let phase: ChatPhase = "closed";
let busy = false;
let controller: AbortController | null = null;
let messages: ChatMessage[] = [];
let els: {
  root: HTMLElement;
  panel: HTMLElement;
  fab: HTMLButtonElement;
  list: HTMLElement;
  error: HTMLElement;
  form: HTMLFormElement;
  input: HTMLInputElement;
  send: HTMLButtonElement;
  sendSwap: HTMLElement | null;
} | null = null;

function ensureSessionId(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing && SESSION_ID_PATTERN.test(existing)) return existing;
  const id = crypto.randomUUID();
  localStorage.setItem(SESSION_KEY, id);
  return id;
}

// localStorage 是外部数据，只在读取入口校验一次
function loadHistory(): ChatMessage[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const valid = parsed.filter(
      (item): item is ChatMessage =>
        typeof item === "object" &&
        item !== null &&
        ((item as ChatMessage).role === "user" || (item as ChatMessage).role === "assistant") &&
        typeof (item as ChatMessage).content === "string"
    );
    // 空的助手消息是中断留下的占位，恢复时丢弃
    return valid
      .filter((item) => !(item.role === "assistant" && !item.content))
      .slice(-HISTORY_LIMIT);
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-HISTORY_LIMIT)));
  } catch {
    // 存储不可用（隐私模式等）时聊天仍可继续
  }
}

function scrollToEnd() {
  if (!els) return;
  els.list.scrollTop = els.list.scrollHeight;
}

function appendBubble(msg: ChatMessage): HTMLElement {
  const bubble = document.createElement("div");
  bubble.className = `agent-chat-msg ${msg.role === "user" ? "agent-chat-msg-user" : "agent-chat-msg-bot"}`;
  bubble.textContent = msg.content;
  els!.list.appendChild(bubble);
  scrollToEnd();
  return bubble;
}

function renderAll() {
  if (!els) return;
  els.list.textContent = "";
  messages.forEach(appendBubble);
}

function showError(text: string) {
  if (!els) return;
  els.error.textContent = text;
  els.error.hidden = false;
}

function clearError() {
  if (!els) return;
  els.error.hidden = true;
  els.error.textContent = "";
}

// 去掉尚未产出内容的助手占位（失败/中断/手动停止时调用）
function dropPlaceholder(bubble: HTMLElement | null) {
  if (!bubble || bubble.textContent) return;
  const last = messages[messages.length - 1];
  if (last && last.role === "assistant" && !last.content) messages.pop();
  bubble.remove();
}

// 状态机：closed（只有按钮）→ idle（面板开，输入可用）→ streaming（输入禁用，发送键变停止）
function setPhase(next: ChatPhase) {
  phase = next;
  if (!els) return;
  const open = next !== "closed";
  els.panel.classList.toggle("is-open", open);
  els.panel.setAttribute("aria-hidden", String(!open));
  els.fab.hidden = open;
  els.input.disabled = next === "streaming";
  els.sendSwap?.setAttribute("data-state", next === "streaming" ? "b" : "a");
}

function openPanel() {
  setPhase(busy ? "streaming" : "idle");
  els?.input.focus();
}

function closePanel() {
  // 流式进行中关闭面板不打断请求，重开时按 busy 恢复 streaming
  setPhase("closed");
  els?.fab.focus();
}

async function sendMessage(text: string) {
  if (!els) return;
  const sessionId = ensureSessionId();
  messages.push({ role: "user", content: text }, { role: "assistant", content: "" });
  appendBubble(messages[messages.length - 2]);
  const assistantMsg = messages[messages.length - 1];
  const assistantBubble = appendBubble(assistantMsg);
  clearError();

  busy = true;
  setPhase("streaming");
  controller = new AbortController();
  let completed = false;
  let failed = false;

  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ sessionId, message: text }),
      signal: controller.signal,
    });

    const contentType = response.headers.get("content-type") || "";
    if (!response.ok || !response.body || !contentType.includes("text/event-stream")) {
      // 未开流的失败：取 JSON 里的 message 展示
      let message = FALLBACK_ERROR;
      try {
        const data: unknown = await response.json();
        const text = (data as { message?: unknown })?.message;
        if (typeof text === "string" && text) message = text;
      } catch {
        // 响应体不是 JSON，用默认文案
      }
      showError(message);
      dropPlaceholder(assistantBubble);
      return;
    }

    // SSE：逐块解码，事件以空行分隔，data: 后为 JSON
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let sep = buffer.indexOf("\n\n");
      while (sep !== -1) {
        const event = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        sep = buffer.indexOf("\n\n");
        for (const line of event.split("\n")) {
          if (!line.startsWith("data:")) continue;
          let payload: ChatEvent;
          try {
            payload = JSON.parse(line.slice(5).trim()) as ChatEvent;
          } catch {
            continue;
          }
          if (payload.type === "text.delta" && typeof payload.delta === "string") {
            assistantMsg.content += payload.delta;
            assistantBubble.textContent = assistantMsg.content;
            scrollToEnd();
          } else if (payload.type === "run.completed" && typeof payload.content === "string") {
            // 以最终 content 校准累计的 delta，防丢块
            assistantMsg.content = payload.content;
            assistantBubble.textContent = payload.content;
            scrollToEnd();
            completed = true;
          } else if (payload.type === "run.failed" && typeof payload.message === "string") {
            failed = true;
            showError(payload.message || FALLBACK_ERROR);
            dropPlaceholder(assistantBubble);
          }
        }
      }
    }

    if (!completed && !failed) {
      // 流中断：保留已收到的部分文本
      showError(INTERRUPTED_ERROR);
      dropPlaceholder(assistantBubble);
    }
  } catch (error) {
    if ((error as Error)?.name === "AbortError") {
      // 用户点停止：不算错误，保留已有文本
      dropPlaceholder(assistantBubble);
    } else {
      showError(INTERRUPTED_ERROR);
      dropPlaceholder(assistantBubble);
    }
  } finally {
    busy = false;
    controller = null;
    saveHistory();
    if (phase !== "closed") setPhase("idle");
  }
}

function startNewChat() {
  if (busy) controller?.abort();
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(HISTORY_KEY);
  messages = [];
  renderAll();
  clearError();
  ensureSessionId();
  setPhase("idle");
  els?.input.focus();
}

function initAgentChat() {
  // ClientRouter 视图转换下 root 被 persist，boot 可能多次触发，绑一次即可
  const root = document.getElementById("agent-chat-root");
  if (!root || root.dataset.agentChatBound) return;

  const panel = document.getElementById("agent-chat-panel");
  const fab = document.getElementById("agent-chat-fab");
  const list = document.getElementById("agent-chat-messages");
  const error = document.getElementById("agent-chat-error");
  const form = document.getElementById("agent-chat-form");
  const input = document.getElementById("agent-chat-input");
  const send = document.getElementById("agent-chat-send");
  if (
    !(panel instanceof HTMLElement) ||
    !(fab instanceof HTMLButtonElement) ||
    !(list instanceof HTMLElement) ||
    !(error instanceof HTMLElement) ||
    !(form instanceof HTMLFormElement) ||
    !(input instanceof HTMLInputElement) ||
    !(send instanceof HTMLButtonElement)
  ) {
    return;
  }

  root.dataset.agentChatBound = "1";
  panel.hidden = false;
  els = { root, panel, fab, list, error, form, input, send, sendSwap: send.querySelector<HTMLElement>(".t-icon-swap") };

  messages = loadHistory();
  renderAll();
  ensureSessionId();
  setPhase("closed");

  fab.addEventListener("click", openPanel);
  document.getElementById("agent-chat-close")?.addEventListener("click", closePanel);
  document.getElementById("agent-chat-new")?.addEventListener("click", startNewChat);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (busy) {
      controller?.abort();
      return;
    }
    const text = input.value.trim();
    if (!text) return;
    input.value = "";
    void sendMessage(text);
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape" || phase === "closed") return;
    closePanel();
  });
}

document.addEventListener("astro:page-load", initAgentChat);
