import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.ADMIN_PASSWORD = "test-admin-password";
process.env.ADMIN_USERNAME = "admin";
process.env.ADMIN_SECRET = "test-admin-secret";
process.env.SQLITE_DB_PATH = ":memory:";
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), "blog-upload-test-"));

import { createSessionToken } from "./auth";
import { GET as articlesGet, PUT as articlesPut } from "../pages/api/articles";
import { GET as projectsGet, PUT as projectsPut } from "../pages/api/projects";
import { GET as aboutGet, PUT as aboutPut } from "../pages/api/about";
import { GET as homeGet, PUT as homePut } from "../pages/api/home";
import { GET as galleryGet, PUT as galleryPut } from "../pages/api/gallery";
import { GET as loginGet, POST as loginPost, DELETE as loginDelete } from "../pages/api/login";
import { POST as uploadContentPost } from "../pages/api/upload/content";

const TOKEN = await createSessionToken();
const AUTH = { "content-type": "application/json", "x-admin-token": TOKEN };

type RouteContext = Parameters<typeof articlesPut>[0];
function context(request: Request): RouteContext {
  // The login route also reads `url` to decide cookie Secure semantics.
  return { request, url: new URL(request.url) } as unknown as RouteContext;
}

// Unique client IPs keep the login failure limiter buckets isolated.
let ipCounter = 0;
function nextIp() {
  ipCounter += 1;
  return `203.0.113.${ipCounter}`;
}

const PNG_1PX = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
  "base64",
);

test("content APIs reject unauthenticated writes", async () => {
  const routes = [
    ["articles", articlesPut],
    ["projects", projectsPut],
    ["about", aboutPut],
    ["home", homePut],
    ["gallery", galleryPut],
  ] as const;

  for (const [name, handler] of routes) {
    const response = await handler(context(new Request("https://example.com/api/" + name, {
      method: "PUT",
      body: "[]",
      headers: { "content-type": "application/json" },
    })));
    assert.equal(response.status, 401, `${name} PUT must require admin auth`);
    const data = (await response.json()) as { ok: boolean };
    assert.equal(data.ok, false);
  }
});

test("login verifies credentials, issues a session, and reports state", async () => {
  const denied = await loginPost(context(new Request("https://example.com/api/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "wrong" }),
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
  })));
  assert.equal(denied.status, 401);

  const ok = await loginPost(context(new Request("https://example.com/api/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "test-admin-password" }),
    headers: { "content-type": "application/json", "x-forwarded-for": nextIp() },
  })));
  assert.equal(ok.status, 200);
  const session = (await ok.json()) as { success: boolean; token: string };
  assert.equal(session.success, true);
  assert.ok(session.token.length > 0);
  assert.match(ok.headers.get("set-cookie") ?? "", /admin-token=/);

  const authed = await loginGet(context(new Request("https://example.com/api/login", {
    headers: { cookie: `admin-token=${TOKEN}` },
  })));
  assert.equal(((await authed.json()) as { authenticated: boolean }).authenticated, true);

  const anonymous = await loginGet(context(new Request("https://example.com/api/login")));
  assert.equal(((await anonymous.json()) as { authenticated: boolean }).authenticated, false);

  const logout = await loginDelete(context(new Request("https://example.com/api/login", { method: "DELETE" })));
  assert.match(logout.headers.get("set-cookie") ?? "", /Max-Age=0/);
});

test("articles round-trip with full-replace semantics", async () => {
  const read1 = await articlesGet(context(new Request("https://example.com/api/articles")));
  const initial = (await read1.json()) as { ok: boolean; storage: string; articles: unknown[] };
  assert.equal(initial.ok, true);
  assert.equal(initial.storage, "sqlite");

  const write1 = await articlesPut(context(new Request("https://example.com/api/articles", {
    method: "PUT",
    body: JSON.stringify([{ id: "grape", title: "葡萄种植指南", content: "葡萄喜欢阳光。", tags: "种植", description: "种植入门" }]),
    headers: AUTH,
  })));
  assert.equal(write1.status, 200);
  const saved = (await write1.json()) as { ok: boolean; articles: Array<{ id: string; summary: string; tags: string[] }> };
  assert.equal(saved.ok, true);
  assert.equal(saved.articles.length, 1);
  assert.equal(saved.articles[0].id, "grape");
  assert.equal(saved.articles[0].summary, "种植入门", "summary prefers description over content");
  assert.deepEqual(saved.articles[0].tags, ["种植"]);

  // PUT replaces the whole collection: writing two items drops the first write.
  const write2 = await articlesPut(context(new Request("https://example.com/api/articles", {
    method: "PUT",
    body: JSON.stringify({ articles: [
      { id: "grape", title: "葡萄种植指南", content: "葡萄喜欢阳光。" },
      { id: "coffee", title: "咖啡冲煮入门", content: "手冲咖啡需要现磨豆。" },
    ] }),
    headers: AUTH,
  })));
  const replaced = (await write2.json()) as { articles: unknown[] };
  assert.equal(replaced.articles.length, 2);

  const read2 = await articlesGet(context(new Request("https://example.com/api/articles")));
  assert.equal(((await read2.json()) as { articles: unknown[] }).articles.length, 2);
});

test("projects round-trip through the content store", async () => {
  const write = await projectsPut(context(new Request("https://example.com/api/projects", {
    method: "PUT",
    body: JSON.stringify({ projects: [{ id: "pi-cli", title: "PI 终端助手", description: "命令行里的 AI 助手", category: "工具", tech: "Node,CLI" }] }),
    headers: AUTH,
  })));
  const saved = (await write.json()) as { ok: boolean; projects: Array<{ id: string; category: string; tech: string }> };
  assert.equal(saved.ok, true);
  assert.equal(saved.projects[0].id, "pi-cli");
  assert.equal(saved.projects[0].category, "工具");
  assert.equal(saved.projects[0].tech, "Node,CLI");

  const read = await projectsGet(context(new Request("https://example.com/api/projects")));
  assert.equal(((await read.json()) as { projects: Array<{ title: string }> }).projects[0].title, "PI 终端助手");
});

test("about and home content round-trip", async () => {
  const aboutWrite = await aboutPut(context(new Request("https://example.com/api/about", {
    method: "PUT",
    body: JSON.stringify({ about: { name: "测试站长", bio: "写代码，也写文字。" } }),
    headers: AUTH,
  })));
  const aboutSaved = (await aboutWrite.json()) as { ok: boolean; about: { name: string } };
  assert.equal(aboutSaved.ok, true);
  assert.equal(aboutSaved.about.name, "测试站长");

  const aboutRead = await aboutGet(context(new Request("https://example.com/api/about")));
  assert.equal(((await aboutRead.json()) as { about: { bio: string } }).about.bio, "写代码，也写文字。");

  const homeWrite = await homePut(context(new Request("https://example.com/api/home", {
    method: "PUT",
    body: JSON.stringify({ home: { heroTitle: "每一次提交都是向前一步。", quoteText: "Stay hungry.", quoteAuthor: "Steve Jobs" } }),
    headers: AUTH,
  })));
  const homeSaved = (await homeWrite.json()) as { ok: boolean; home: { heroTitle: string } };
  assert.equal(homeSaved.ok, true);
  assert.equal(homeSaved.home.heroTitle, "每一次提交都是向前一步。");

  const homeRead = await homeGet(context(new Request("https://example.com/api/home")));
  assert.equal(((await homeRead.json()) as { home: { quoteAuthor: string } }).home.quoteAuthor, "Steve Jobs");
});

test("gallery round-trip and image upload validation", async (t) => {
  const write = await galleryPut(context(new Request("https://example.com/api/gallery", {
    method: "PUT",
    body: JSON.stringify([{ id: "shot-1", title: "像素点", imageData: "/uploads/dot.png" }]),
    headers: AUTH,
  })));
  const saved = (await write.json()) as { ok: boolean; gallery: Array<{ title: string }> };
  assert.equal(saved.ok, true);
  assert.equal(saved.gallery[0].title, "像素点");

  const unauthorized = await uploadContentPost(context(new Request("https://example.com/api/upload/content", {
    method: "POST",
    body: new FormData(),
  })));
  assert.equal(unauthorized.status, 401);

  const missingField = await uploadContentPost(context(new Request("https://example.com/api/upload/content", {
    method: "POST",
    body: new FormData(),
    headers: { "x-admin-token": TOKEN },
  })));
  assert.equal(missingField.status, 400);

  const wrongType = await uploadContentPost(context(new Request("https://example.com/api/upload/content", {
    method: "POST",
    body: (() => {
      const form = new FormData();
      form.append("image", new Blob(["not an image"], { type: "text/plain" }), "note.txt");
      return form;
    })(),
    headers: { "x-admin-token": TOKEN },
  })));
  assert.equal(wrongType.status, 400);

  const accepted = await uploadContentPost(context(new Request("https://example.com/api/upload/content", {
    method: "POST",
    body: (() => {
      const form = new FormData();
      form.append("image", new Blob([PNG_1PX], { type: "image/png" }), "dot.png");
      return form;
    })(),
    headers: { "x-admin-token": TOKEN },
  })));
  assert.equal(accepted.status, 200);
  const uploaded = (await accepted.json()) as { ok: boolean; image: { url: string } };
  assert.equal(uploaded.ok, true);
  assert.match(uploaded.image.url, /^\/uploads\/.+\.png$/);
});
