import { safeValidateUIMessages, type UIMessage } from "ai";

export async function readUiMessages(request: Request) {
  let payload: { messages?: unknown };
  try {
    payload = await request.json();
  } catch {
    return { error: "请求内容不是有效的 JSON" } as const;
  }

  const result = await safeValidateUIMessages<UIMessage>({
    messages: payload.messages,
  });

  if (!result.success) {
    return { error: "缺少有效的对话内容" } as const;
  }

  return { messages: result.data } as const;
}

