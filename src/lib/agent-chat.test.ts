import test from "node:test";
import assert from "node:assert/strict";
import { createServer, type IncomingMessage, type Server } from "node:http";

// Hermetic setup BEFORE importing route/lib modules (AGENTS.md: no real AI calls).
process.env.SQLITE_DB_PATH = ":memory:";
process.env.AGENT_BRIDGE_TOKEN = "test-bridge-token";
delete process.env.LLM_BASE_URL;
delete process.env.LLM_API_KEY;
delete process.env.LLM_MODEL;
delete process.env.AI_GATEWAY_API_KEY;

import { POST as chatPost } from "../pages/api/ai/chat";
import { retrieveSiteContext } from "./agent-retrieval";

type RouteContext = Parameters<typeof chatPost>[0];

function context(request: Request): RouteContext {
  return { request } as unknown as RouteContext;
}

const UUID = "3f2b8c4a-1d2e-4f5a-9b8c-7d6e5f4a3b2c";
const uuids = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `00000000-0000-4000-8000-${String(counter).padStart(12, "0")}`;
  };
})();

const ips = (() => {
  let counter = 0;
  return () => {
    counter += 1;
    return `203.0.113.${counter}`;
  };
})();

type MockBridge = {
  server: Server;
  url: string;
  requests: { url: string; headers: Record<string, string | undefined>; body: string }[];
  setChunks: (chunks: string[]) => void;
};

function startMockBridge(handler?: (req: IncomingMessage, body: string, reply: (chunks: string[]) => void) => void): Promise<MockBridge> {
  return new Promise((resolve) => {
    const requests: MockBridge["requests"] = [];
    let chunks: string[] = [
      'data: {"type":"text.delta","delta":"你"}\n\n',
      'data: {"type":"run.completed","content":"你好"}\n\n',
    ];
    const server = createServer((req, res) => {
      const bodyParts: Buffer[] = [];
      req.on("data", (part: Buffer) => bodyParts.push(part));
      req.on("end", () => {
        const body = Buffer.concat(bodyParts).toString("utf-8");
        requests.push({
          url: req.url ?? "/",
          headers: { "x-agent-token": req.headers["x-agent-token"] as string | undefined },
          body,
        });
        if (handler) {
          handler(req, body, (next) => {
            chunks = next;
          });
        }
        res.writeHead(200, { "content-type": "text/event-stream" });
        for (const chunk of chunks) res.write(chunk);
        res.end();
      });
    });
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      const port = typeof address === "object" && address ? address.port : 0;
      resolve({
        server,
        url: `http://127.0.0.1:${port}`,
        requests,
        setChunks: (next) => {
          chunks = next;
        },
      });
    });
  });
}

function chatRequest(body: string, ip: string): Request {
  return new Request("https://example.com/api/ai/chat", {
    method: "POST",
    body,
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
  });
}

test("retrieveSiteContext renders the empty marker without content", () => {
  const block = retrieveSiteContext({ articles: [], projects: [] }, "葡萄", 3);
  assert.match(block, /未检索到站内内容/);
});

test("retrieveSiteContext renders matched titles and urls", () => {
  const block = retrieveSiteContext(
    {
      articles: [
        {
          id: "grape",
          title: "葡萄种植指南",
          description: "从零开始的葡萄种植笔记",
          tags: ["种植"],
          date: "2026-01-01",
          url: "/articles/local-grape",
        },
      ],
      projects: [],
    },
    "葡萄怎么种",
    3,
  );
  assert.match(block, /葡萄种植指南/);
  assert.match(block, /\/articles\/local-grape/);
});

test("POST /api/ai/chat rejects invalid session ids and messages with 400", async () => {
  const cases: string[] = [
    JSON.stringify({ sessionId: "", message: "你好" }),
    JSON.stringify({ sessionId: "not-a-uuid", message: "你好" }),
    JSON.stringify({ sessionId: "a".repeat(65), message: "你好" }),
    JSON.stringify({ sessionId: UUID, message: "" }),
    JSON.stringify({ sessionId: UUID, message: "   " }),
    JSON.stringify({ sessionId: UUID, message: "字".repeat(4001) }),
    "not-json",
  ];
  for (const body of cases) {
    const response = await chatPost(context(chatRequest(body, ips())));
    assert.equal(response.status, 400, `body: ${body}`);
    const data = await response.json();
    assert.equal(data.ok, false);
    assert.match(data.message, /[\u4e00-\u9fa5]/);
  }
});

test("POST /api/ai/chat blocks the 11th request per IP per minute with 429", async () => {
  const ip = ips();
  const bridge = await startMockBridge();
  process.env.AGENT_BRIDGE_URL = bridge.url;
  try {
    // The limiter runs before body parsing, so cheap invalid bodies still count.
    for (let i = 0; i < 10; i++) {
      const response = await chatPost(context(chatRequest("not-json", ip)));
      assert.equal(response.status, 400);
    }
    const blocked = await chatPost(
      context(chatRequest(JSON.stringify({ sessionId: uuids(), message: "你好" }), ip)),
    );
    assert.equal(blocked.status, 429);
    assert.ok(blocked.headers.get("retry-after"));
    const data = await blocked.json();
    assert.equal(data.ok, false);
  } finally {
    bridge.server.close();
  }
});

test("POST /api/ai/chat forwards session key, composed message and bridge token", async () => {
  const bridge = await startMockBridge();
  process.env.AGENT_BRIDGE_URL = bridge.url;
  try {
    const response = await chatPost(
      context(chatRequest(JSON.stringify({ sessionId: UUID, message: "你好" }), ips())),
    );
    assert.equal(response.status, 200);
    assert.equal(bridge.requests.length, 1);
    const forwarded = bridge.requests[0];
    assert.equal(forwarded.url, "/chat");
    assert.equal(forwarded.headers["x-agent-token"], "test-bridge-token");
    const payload = JSON.parse(forwarded.body) as { session_key: string; message: string };
    assert.equal(payload.session_key, `visitor:${UUID}`);
    assert.match(payload.message, /\[站内检索结果\]/);
    assert.match(payload.message, /未检索到站内内容/);
    assert.match(payload.message, /\[用户问题\]\s*你好/);
  } finally {
    bridge.server.close();
  }
});

test("POST /api/ai/chat passes the bridge SSE stream through byte for byte", async () => {
  const chunks = [
    'data: {"type":"text.delta","delta":"你"}\n\n',
    'data: {"type":"text.delta","delta":"好"}\n\n',
    'data: {"type":"run.completed","content":"你好"}\n\n',
  ];
  const bridge = await startMockBridge();
  bridge.setChunks(chunks);
  process.env.AGENT_BRIDGE_URL = bridge.url;
  try {
    const response = await chatPost(
      context(chatRequest(JSON.stringify({ sessionId: uuids(), message: "你好" }), ips())),
    );
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type") ?? "", /text\/event-stream/);
    assert.equal(response.headers.get("cache-control"), "no-cache");
    const body = await response.text();
    assert.equal(body, chunks.join(""));
  } finally {
    bridge.server.close();
  }
});

test("POST /api/ai/chat returns a Chinese 502 when the bridge is unreachable", async () => {
  // Port 9 (discard) is closed: connect fails fast.
  process.env.AGENT_BRIDGE_URL = "http://127.0.0.1:9";
  const response = await chatPost(
    context(chatRequest(JSON.stringify({ sessionId: uuids(), message: "你好" }), ips())),
  );
  assert.equal(response.status, 502);
  const data = await response.json();
  assert.equal(data.ok, false);
  assert.match(data.message, /[\u4e00-\u9fa5]/);
});
