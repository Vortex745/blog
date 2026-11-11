/**
 * Full-site browser check (prove-it gate).
 *
 * Boots the built Astro server against an in-memory SQLite and a mock agent
 * bridge (SSE), seeds every content module through the real admin APIs, then
 * walks the site in headless Chrome: public pages, article detail,
 * RSS/sitemap, 404, admin login, the admin article list, and the visitor AI
 * chat panel. Any page error or console error fails the run. Screenshots
 * land in screenshots/.
 *
 * Usage: node scripts/browser-site-check.mjs   (requires `npm run build` first)
 */
import { spawn } from "node:child_process";
import { createServer } from "node:http";
import { mkdirSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright";

const PORT = 4601;
const BRIDGE_TOKEN = "site-check-bridge-token";
const uploadDir = mkdtempSync(join(tmpdir(), "site-check-uploads-"));

function sseEvent(payload) {
  return `data: ${JSON.stringify(payload)}\n\n`;
}

const bridge = createServer((req, res) => {
  if (req.url !== "/chat") {
    res.writeHead(404).end();
    return;
  }
  if (req.headers["x-agent-token"] !== BRIDGE_TOKEN) {
    res.writeHead(401).end();
    return;
  }
  req.resume();
  req.on("end", () => {
    res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache" });
    for (const part of ["这是", "巡检", "流式回复。"]) {
      res.write(sseEvent({ type: "text.delta", delta: part }));
    }
    res.write(sseEvent({ type: "run.completed", content: "这是巡检流式回复。" }));
    res.end();
  });
});
await new Promise((resolve) => bridge.listen(0, "127.0.0.1", resolve));
const bridgePort = bridge.address().port;

const server = spawn(process.execPath, ["dist/server/entry.mjs"], {
  env: {
    ...process.env,
    NODE_ENV: "production",
    HOST: "127.0.0.1",
    PORT: String(PORT),
    SQLITE_DB_PATH: ":memory:",
    UPLOAD_DIR: resolve("dist/client/uploads"),
    ADMIN_USERNAME: "admin",
    ADMIN_PASSWORD: "site-check-password",
    ADMIN_SECRET: "site-check-secret",
    AGENT_BRIDGE_URL: `http://127.0.0.1:${bridgePort}`,
    AGENT_BRIDGE_TOKEN: BRIDGE_TOKEN,
  },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stderr.on("data", (data) => process.stderr.write(`[server] ${data}`));

async function waitForServer(url, timeoutMs = 30000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 300));
  }
  throw new Error(`server not ready at ${url}`);
}

const base = `http://127.0.0.1:${PORT}`;

async function api(path, options = {}) {
  return fetch(`${base}${path}`, options);
}

async function seedContent() {
  const login = await api("/api/login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ username: "admin", password: "site-check-password" }),
  });
  if (!login.ok) throw new Error(`login failed: ${login.status}`);
  const { token } = await login.json();
  const auth = { "content-type": "application/json", "x-admin-token": token };

  const put = async (path, body) => {
    const response = await api(path, { method: "PUT", headers: auth, body: JSON.stringify(body) });
    if (!response.ok) throw new Error(`seed ${path} failed: ${response.status} ${await response.text()}`);
    return response.json();
  };

  await put("/api/articles", [
    { id: "grape", title: "葡萄种植指南", description: "从零开始的葡萄种植笔记", content: "葡萄喜欢阳光充足的环境，种植时要注意修剪和浇水。" },
    { id: "coffee", title: "咖啡冲煮入门", description: "手冲咖啡第一课", content: "手冲咖啡需要现磨咖啡豆，水温控制在九十度左右。" },
  ]);
  await put("/api/projects", [
    { id: "pi-cli", title: "PI 终端助手", description: "命令行里的 AI 助手", category: "工具", tech: "Node" },
  ]);
  await put("/api/about", { about: { name: "巡检站长", bio: "这是一段用于全站巡检的关于页介绍。" } });
  await put("/api/home", { home: { heroTitle: "全站巡检种子标题 XYZ42", quoteText: "巡检引言 ABC99", quoteAuthor: "Prove It" } });

  const form = new FormData();
  const png = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  );
  form.append("image", new Blob([png], { type: "image/png" }), "dot.png");
  // Astro's checkOrigin CSRF guard rejects multipart posts without a same-origin Origin.
  const upload = await api("/api/upload/content", {
    method: "POST",
    headers: { "x-admin-token": token, origin: base },
    body: form,
  });
  if (!upload.ok) throw new Error(`upload failed: ${upload.status}`);
  const { image } = await upload.json();
  await put("/api/gallery", [{ id: "shot-1", title: "巡检截图", imageData: image.url }]);
  return token;
}

const failures = [];
function check(name, ok, detail = "") {
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures.push(name);
}

mkdirSync("screenshots", { recursive: true });

await waitForServer(`${base}/favicon.svg`);
const token = await seedContent();

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const consoleErrors = [];
const pageErrors = [];
// Console noise we deliberately tolerate, each tied to a known cause:
// - the intentional 404 visit: browsers log the document's own 404 status.
const CONSOLE_TOLERATED_PREFIXES = [
  `${base}/definitely-not-a-page`,
];
function consoleErrorTolerated(text) {
  return CONSOLE_TOLERATED_PREFIXES.some((prefix) => text.startsWith(prefix));
}
page.on("console", (message) => {
  if (message.type() === "error") consoleErrors.push(`${page.url()} :: ${message.text()}`);
});
page.on("pageerror", (error) => pageErrors.push(`${page.url()} :: ${String(error)}`));

async function visit(path, label, expectStatus = 200) {
  const response = await page.goto(`${base}${path}`, { waitUntil: "networkidle" });
  const statusOk = response ? response.status() === expectStatus : false;
  check(`${label}（${path}）HTTP ${expectStatus}`, statusOk, response ? `实际 ${response.status()}` : "无响应");
  await page.screenshot({ path: `screenshots/site-${label}.png` });
  return response;
}

async function expectText(label, text) {
  try {
    await page.getByText(text, { exact: false }).first().waitFor({ state: "visible", timeout: 8000 });
    check(`${label}：页面出现「${text}」`, true);
  } catch {
    check(`${label}：页面出现「${text}」`, false, "超时未出现");
  }
}

async function checkGlasswork() {
  await page.locator(".result-item.glass").first().waitFor({ state: "visible", timeout: 8000 });
  await page.waitForFunction(() => {
    const result = document.querySelector(".result-item.glass");
    return result && getComputedStyle(result).backdropFilter.includes("url(");
  });
  check("Glasswork：动态搜索结果显示 Chromium 边缘折射", true);

  await page.evaluate(() => document.documentElement.classList.add("dark"));
  await page.waitForTimeout(700);
  const dark = await page.locator(".editorial-nav-inner.glass").evaluate((el) => {
    const style = getComputedStyle(el);
    return { tint: style.getPropertyValue("--m-tint").trim(), ink: style.getPropertyValue("--ink").trim() };
  });
  check(
    "Glasswork：深色主题切换玻璃与文字",
    /(?:#1e1e22|rgb\(30,\s*30,\s*34\))/i.test(dark.tint) && dark.ink.includes("255, 255, 255"),
    JSON.stringify(dark),
  );
  await page.screenshot({ path: "screenshots/site-搜索页深色玻璃.png" });
  await page.evaluate(() => document.documentElement.classList.remove("dark"));

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "reduce" }] });
  await page.waitForFunction(() => {
    const result = document.querySelector(".result-item.glass");
    return result && getComputedStyle(result).backdropFilter === "none" && !result.style.getPropertyValue("--glass-lens");
  });
  check("Glasswork：减少透明度时使用实色并移除折射", true);
  await cdp.send("Emulation.setEmulatedMedia", { features: [{ name: "prefers-reduced-transparency", value: "no-preference" }] });
  await cdp.detach();
}

try {
  await visit("/", "首页");
  await expectText("首页", "全站巡检种子标题 XYZ42");
  await expectText("首页", "葡萄种植指南");

  await visit("/articles", "文章列表");
  await expectText("文章列表", "葡萄种植指南");

  await visit("/articles/local-grape", "文章详情");
  await expectText("文章详情", "阳光充足");

  await visit("/projects", "项目列表");
  await expectText("项目列表", "PI 终端助手");

  await visit("/projects/local-pi-cli", "项目详情");

  await visit("/about", "关于页");
  await expectText("关于页", "全站巡检的关于页介绍");

  await visit("/archive", "归档页");
  await expectText("归档页", "葡萄种植指南");

  await visit("/gallery", "图库页");
  await expectText("图库页", "巡检截图");
  await page.locator(".gallery-card").first().click();
  await page.locator("#lightbox-root").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const close = document.querySelector("#lightbox-close");
    return close && getComputedStyle(close).backdropFilter.includes("url(");
  });
  check("Glasswork：lightbox 控件显示深色玻璃与边缘折射", true);
  await page.screenshot({ path: "screenshots/site-图库液态玻璃.png" });
  await page.locator("#lightbox-close").click();

  await visit("/search?q=%E8%91%A1%E8%90%84", "搜索页");
  await expectText("搜索页", "葡萄种植指南");
  await checkGlasswork();

  const searchApi = await (await api("/api/search?q=%E8%91%A1%E8%90%84")).json();
  check(
    "/api/search 返回种子文章",
    searchApi.ok && Array.isArray(searchApi.items) && searchApi.items.some((item) => item.title.includes("葡萄种植指南")),
    `items: ${searchApi.items?.length ?? 0}`,
  );

  await visit("/definitely-not-a-page", "404页", 404);

  const rss = await (await api("/rss.xml")).text();
  check("/rss.xml 包含种子文章", rss.includes("葡萄种植指南"));
  const sitemapIndex = await (await api("/sitemap-index.xml")).text();
  check("/sitemap-index.xml 指向 sitemap-0", sitemapIndex.includes("sitemap-0.xml"));
  const sitemap = await (await api("/sitemap-0.xml")).text();
  check(
    "/sitemap-0.xml 含后台文章且不暴露后台路由",
    sitemap.includes("/articles/local-grape") && sitemap.includes("/projects/local-pi-cli") && !sitemap.includes("/admin/"),
  );

  // Admin: login through the real form, then open the article admin.
  await visit("/admin/login", "后台登录页");
  await page.fill("#username", "admin");
  await page.fill("#password", "site-check-password");
  await page.click("#login-form button");
  await page.waitForURL((url) => !url.pathname.endsWith("/admin/login"), { timeout: 10000 });
  check("后台登录跳转", !page.url().endsWith("/admin/login"), page.url());
  await visit("/admin/articles", "后台文章管理");
  await expectText("后台文章管理", "葡萄种植指南");
  await page.click("#btn-add");
  await page.locator("#article-modal.is-open .modal-panel.glass").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const panel = document.querySelector("#article-modal .modal-panel.glass");
    return panel && getComputedStyle(panel).backdropFilter.includes("url(");
  });
  check("Glasswork：后台文章弹窗显示边缘折射", true);
  await page.screenshot({ path: "screenshots/site-后台文章弹窗液态玻璃.png" });
  await page.click("#article-form button[type=submit]");
  await page.locator("#admin-toast.glass.is-visible").waitFor({ state: "visible", timeout: 3000 });
  check("Glasswork：后台 toast 使用玻璃材质", true);
  await page.click("#btn-cancel");
  await page.locator(".admin-list-card-actions .btn-delete").first().click();
  await page.locator("#admin-confirm-dialog.is-open .admin-dialog-panel.glass").waitFor({ state: "visible" });
  await page.waitForFunction(() => {
    const panel = document.querySelector("#admin-confirm-dialog .admin-dialog-panel.glass");
    return panel && getComputedStyle(panel).backdropFilter.includes("url(");
  });
  check("Glasswork：全局确认框显示边缘折射", true);
  await page.screenshot({ path: "screenshots/site-后台确认框液态玻璃.png" });
  await page.click("#admin-dialog-cancel");
  await visit("/admin/api", "后台AI设置页");

  // Visitor chat against the mock agent bridge.
  await visit("/", "聊天前首页");
  await page.click("#agent-chat-fab");
  await page.locator("#agent-chat-panel.is-open").waitFor({ state: "visible", timeout: 5000 });
  await page.fill("#agent-chat-input", "这个博客讲什么？");
  await page.click("#agent-chat-send");
  await page.getByText("这是巡检流式回复。", { exact: false }).first().waitFor({ state: "visible", timeout: 15000 });
  await page.screenshot({ path: "screenshots/site-聊天流式回复.png" });
  check("AI 助手流式回复渲染", true);

  check("无页面未捕获异常", pageErrors.length === 0, pageErrors.join(" | "));
  const blocking = consoleErrors.filter((error) => !consoleErrorTolerated(error));
  check(
    "无控制台错误",
    blocking.length === 0,
    blocking.slice(0, 5).join(" | "),
  );
  if (consoleErrors.length > blocking.length) {
    console.log(`  （豁免 ${consoleErrors.length - blocking.length} 条已知环境噪音：404 页文档状态）`);
  }
} catch (error) {
  failures.push(`流程中断: ${error.message}`);
  await page.screenshot({ path: "screenshots/site-99-failure.png" }).catch(() => {});
} finally {
  await browser.close();
  server.kill();
  bridge.close();
}

if (failures.length > 0) {
  console.error(`\n全站巡检失败（${failures.length} 项）:\n- ${failures.join("\n- ")}`);
  process.exit(1);
}
console.log(`\n全站巡检全部通过（已登录会话 x-admin-token 前 8 位: ${token.slice(0, 8)}）。`);
