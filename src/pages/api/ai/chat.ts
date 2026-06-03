import type { APIRoute } from "astro";
import { streamAssistantChat } from "../../../lib/ai/chat";
import { readUiMessages } from "../../../lib/ai/messages";

export const POST: APIRoute = async ({ request }) => {
  const result = await readUiMessages(request);
  if ("error" in result) {
    return Response.json({ ok: false, message: result.error }, { status: 400 });
  }

  try {
    return await streamAssistantChat(result.messages);
  } catch (error) {
    const message = error instanceof Error ? error.message : "AI 服务请求失败";
    return Response.json({ ok: false, message }, { status: 502 });
  }
};

