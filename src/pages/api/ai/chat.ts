import type { APIRoute } from "astro";
import { jsonResponse, readString } from "../../../lib/api-utils";
import { SlidingWindowRateLimiter, getClientKeyFromRequest } from "../../../lib/rate-limit";
import { readServerEnv } from "../../../lib/env";
import { readContentArticles, readContentProjects, hasAnyContent } from "../../../lib/content-store";
import { uniqueByContentKey } from "../../../lib/content-merge";
import { retrieveSiteContext, type RetrievalItem } from "../../../lib/agent-retrieval";

const SESSION_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_MESSAGE_LENGTH = 4000;

// 访客聊天限流：每客户端 IP 每分钟最多 10 次，单例供全部请求共享。
const chatLimiter = new SlidingWindowRateLimiter({ windowMs: 60_000, max: 10 });

async function gatherRetrievalContent(): Promise<{ articles: RetrievalItem[]; projects: RetrievalItem[] }> {
  function cleanSlug(id: string) {
    return id.replace(/\.mdx?$/, "");
  }

  let staticArticles: RetrievalItem[] = [];
  let staticProjects: RetrievalItem[] = [];
  // astro:content 只在 Astro 运行时可解析；无 Astro 环境（如 hermetic 测试）降级为仅 SQLite 内容。
  try {
    const { getCollection } = await import("astro:content");
    const [allArticles, allProjects] = await Promise.all([
      getCollection("articles").then((a) => a.filter((x) => !x.data.draft)),
      getCollection("projects"),
    ]);
    staticArticles = allArticles.map((a) => ({
      id: cleanSlug(a.id),
      title: a.data.title,
      description: a.data.description,
      tags: a.data.tags,
      date: a.data.date.toISOString(),
      url: `/articles/${cleanSlug(a.id)}/`,
    }));
    staticProjects = allProjects.map((p) => ({
      id: cleanSlug(p.id),
      title: p.data.title,
      description: p.data.description,
      tags: p.data.tags,
      date: p.data.date.toISOString(),
      url: `/projects/${cleanSlug(p.id)}/`,
    }));
  } catch {
    // 非 Astro 运行时：静态内容集合不可用。
  }

  const hasSqlite = hasAnyContent();
  const [sqliteArticles, sqliteProjects] = hasSqlite
    ? await Promise.all([
        readContentArticles().catch(() => []),
        readContentProjects().catch(() => []),
      ])
    : [[], []];

  const staticArticleKeys = staticArticles.map((a) => ({ id: a.id, title: a.title }));
  const staticProjectKeys = staticProjects.map((p) => ({ id: p.id, title: p.title }));

  const uniqueSqliteArticles = uniqueByContentKey(
    sqliteArticles,
    (a) => ({ id: String(a.id || ""), title: String(a.title || "") }),
    staticArticleKeys,
  );
  const uniqueSqliteProjects = uniqueByContentKey(
    sqliteProjects,
    (p) => ({ id: String(p.id || ""), title: String(p.title || "") }),
    staticProjectKeys,
  );

  return {
    articles: [
      ...staticArticles,
      ...uniqueSqliteArticles.map((a) => ({
        id: `local-${a.id || a.title || ""}`,
        title: a.title || "",
        description: a.description || "无简介",
        tags: a.tags,
        date: a.date.toISOString(),
        url: `/articles/local-${encodeURIComponent(a.id || a.title || "")}`,
      })),
    ],
    projects: [
      ...staticProjects,
      ...uniqueSqliteProjects.map((p) => ({
        id: `local-${p.id || p.title || ""}`,
        title: p.title || "",
        description: p.description || "",
        tags: p.tags,
        date: p.date.toISOString(),
        url: `/projects/local-${encodeURIComponent(p.id || p.title || "")}`,
      })),
    ],
  };
}

export const POST: APIRoute = async ({ request }) => {
  // 限流在 body 解析之前：无效请求同样计数。
  const limit = chatLimiter.check(getClientKeyFromRequest(request));
  if (!limit.allowed) {
    return new Response(JSON.stringify({ ok: false, message: "请求过于频繁，请稍后再试。" }), {
      status: 429,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "retry-after": String(limit.retryAfterSeconds),
      },
    });
  }

  let payload: Record<string, unknown>;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, message: "请求内容不是有效的 JSON" }, 400);
  }

  const sessionId = readString(payload.sessionId);
  if (!SESSION_ID_PATTERN.test(sessionId)) {
    return jsonResponse({ ok: false, message: "会话标识不合法" }, 400);
  }

  const message = readString(payload.message);
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return jsonResponse({ ok: false, message: "消息内容不能为空，且不超过 4000 字" }, 400);
  }

  const retrieval = retrieveSiteContext(await gatherRetrievalContent(), message, 6);
  const composed = `${retrieval}\n\n[用户问题]\n${message}`;

  const bridgeUrl = (readServerEnv("AGENT_BRIDGE_URL") || "").replace(/\/+$/, "");
  if (!bridgeUrl) {
    return jsonResponse({ ok: false, message: "AI 助手暂时不可用，请稍后再试。" }, 502);
  }

  try {
    const upstream = await fetch(`${bridgeUrl}/chat`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-agent-token": readServerEnv("AGENT_BRIDGE_TOKEN") ?? "",
      },
      body: JSON.stringify({ session_key: `visitor:${sessionId}`, message: composed }),
      // 访客断连立即传导到 bridge 取消 run；300s 与 nginx proxy_read_timeout 对齐。
      signal: AbortSignal.any([request.signal, AbortSignal.timeout(300_000)]),
    });
    if (!upstream.ok || !upstream.body) {
      return jsonResponse({ ok: false, message: "AI 助手暂时不可用，请稍后再试。" }, 502);
    }
    // bridge 的 SSE 响应体字节级透传，不重新序列化。
    return new Response(upstream.body, {
      status: 200,
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
      },
    });
  } catch {
    return jsonResponse({ ok: false, message: "AI 助手暂时不可用，请稍后再试。" }, 502);
  }
};
