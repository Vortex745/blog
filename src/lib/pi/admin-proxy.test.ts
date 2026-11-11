import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type Server } from "node:http";

// Admin auth needs deterministic credentials; the LLM endpoint is a local mock.
process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_SECRET = "test-admin-secret";
process.env.SQLITE_DB_PATH = ":memory:";
delete process.env.LLM_BASE_URL;
delete process.env.LLM_API_KEY;
delete process.env.LLM_MODEL;

import { createSessionToken } from "../auth";
import { POST as llmPost } from "../../pages/api/llm";

function sseChunk(delta: unknown, finishReason: string | null = null) {
  return `data: ${JSON.stringify({
    id: "c1",
    object: "chat.completion.chunk",
    created: 1,
    model: "test-model",
    choices: [{ index: 0, delta, finish_reason: finishReason }],
  })}\n\n`;
}

const REPLY = "你好！这里是管理代理验证回复。";

test("POST /api/llm forwards through the pi runtime and returns the completion", async (t) => {
  const requests: Array<{ path: string; authorization: string | undefined; body: string }> = [];
  const server: Server = createServer((req, res) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      requests.push({ path: req.url ?? "", authorization: req.headers.authorization, body });
      res.writeHead(200, { "content-type": "text/event-stream" });
      res.write(sseChunk({ role: "assistant", content: REPLY }));
      res.write(sseChunk({}, "stop"));
      res.write("data: [DONE]\n\n");
      res.end();
    });
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const port = (server.address() as { port: number }).port;

  t.after(() => server.close());

  const token = await createSessionToken();
  const request = new Request("https://example.com/api/llm", {
    method: "POST",
    headers: { "content-type": "application/json", "x-admin-token": token },
    body: JSON.stringify({
      baseUrl: `http://127.0.0.1:${port}/v1`,
      apiKey: "body-key",
      model: "test-model",
      messages: [{ role: "user", content: "打个招呼" }],
    }),
  });

  const response = await llmPost({ request } as Parameters<typeof llmPost>[0]);
  assert.equal(response.status, 200);

  const data = (await response.json()) as { ok: boolean; content?: string };
  assert.equal(data.ok, true);
  assert.equal(data.content, REPLY);

  const chat = requests.find((entry) => entry.path.endsWith("/chat/completions"));
  assert.ok(chat, "expected a chat/completions request");
  assert.equal(chat.authorization, "Bearer body-key");
  const payload = JSON.parse(chat.body) as { model: string; messages: Array<{ role: string; content: string }> };
  assert.equal(payload.model, "test-model");
  assert.deepEqual(
    payload.messages.map((message) => message.role),
    ["user"],
  );
});
