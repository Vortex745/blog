import { escapeHtml, renderMarkdown, renderMarkdownDocument, stripMarkdown } from "../lib/markdown";

type AdminArticle = {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  coverImage?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

type AdminProject = {
  id?: string;
  title?: string;
  category?: string;
  tech?: string;
  url?: string;
  description?: string;
  coverImage?: string;
  imageData?: string;
  date?: string;
  updatedAt?: string;
};

type TocItem = {
  depth: number;
  id: string;
  text: string;
};

const ARTICLE_KEY = "admin-articles-data";
const PROJECT_KEY = "admin-projects-data";
const ARTICLE_API = "/api/articles";
function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function readRemoteArticles(): Promise<AdminArticle[]> {
  try {
    const response = await fetch(ARTICLE_API, {
      headers: { accept: "application/json" },
      cache: "no-store",
    });
    if (!response.ok) return [];

    const data = await response.json();
    return Array.isArray(data?.articles) ? data.articles : [];
  } catch {
    return [];
  }
}

function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function formatDate(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return validDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function localSlugToken(slug: string | undefined): { decoded: string; encoded: string } | null {
  if (!slug?.startsWith("local-")) return null;
  const encoded = slug.slice("local-".length);
  try {
    return { decoded: decodeURIComponent(encoded), encoded };
  } catch {
    return { decoded: encoded, encoded };
  }
}

function itemMatchesSlug(
  item: { id?: string; title?: string },
  index: number,
  token: { decoded: string; encoded: string }
): boolean {
  return [item.id, item.title, String(index)].some((candidate) => {
    const key = String(candidate || "").trim();
    return key === token.decoded || encodeURIComponent(key) === token.encoded;
  });
}

function articleSummary(article: AdminArticle): string {
  const source = article.description || stripMarkdown(article.content || "");
  return source.length > 140 ? `${source.slice(0, 140)}...` : source;
}

function articleTags(article: AdminArticle): string[] {
  return splitTags(article.tags);
}

function projectTags(project: AdminProject): string[] {
  return unique([project.category || "", ...splitTags(project.tech)]);
}

function safeAssetUrl(value: unknown, fallback = ""): string {
  const raw = String(value || "").trim();
  if (!raw) return fallback;
  if (raw.startsWith("/") || raw.startsWith("#")) return raw;
  if (/^data:image\//i.test(raw)) return raw;

  try {
    const url = new URL(raw, window.location.origin);
    if (url.protocol === "http:" || url.protocol === "https:") return raw;
  } catch {}

  return fallback;
}

function setText(root: ParentNode, selector: string, value: string): void {
  const node = root.querySelector<HTMLElement>(selector);
  if (node) node.textContent = value;
}

function setHtml(root: ParentNode, selector: string, value: string): void {
  const node = root.querySelector<HTMLElement>(selector);
  if (node) node.innerHTML = value;
}

function renderTags(tags: string[]): string {
  return tags.map((tag) => `<span class="apple-badge">${escapeHtml(tag)}</span>`).join("");
}

function renderToc(toc: TocItem[]): string {
  if (toc.length === 0) {
    return `<a href="#article-content" class="article-toc-link">正文</a>`;
  }

  return toc
    .map(
      (item) =>
        `<a href="#${escapeHtml(item.id)}" class="article-toc-link ${item.depth >= 3 ? "is-depth-3" : ""}">${escapeHtml(item.text)}</a>`
    )
    .join("");
}

function showMissing(root: HTMLElement, type: "文章" | "项目"): void {
  root.classList.add("is-missing");
  setText(root, "[data-local-title]", `未找到这篇${type}`);
  setText(root, "[data-local-desc]", `这条${type}可能已在后台删除，或当前浏览器没有对应的本地数据。`);
  setHtml(root, "[data-local-tags]", "");
  setHtml(root, "[data-local-body]", `<p>返回列表后重新选择一条${type}。</p>`);
  setHtml(root, "[data-local-toc]", `<p class="article-toc-empty">暂无目录。</p>`);
}

export function initLocalArticleDetail(): void {
  void hydrateLocalArticleDetail();
}

async function hydrateLocalArticleDetail(): Promise<void> {
  const root = document.querySelector<HTMLElement>("[data-local-article-detail]");
  if (!root || root.dataset.localDetailReady === "true") return;
  root.dataset.localDetailReady = "true";

  const token = localSlugToken(root.dataset.localSlug);
  if (!token) return;

  const articles = readList<AdminArticle>(ARTICLE_KEY);
  let article = articles.find((item, index) => itemMatchesSlug(item, index, token));
  if (!article) {
    const remoteArticles = await readRemoteArticles();
    article = remoteArticles.find((item, index) => itemMatchesSlug(item, index, token));
  }

  if (!article) {
    showMissing(root, "文章");
    return;
  }

  const tags = articleTags(article);
  const title = article.title || "未命名文章";
  const summary = articleSummary(article);
  const cover = safeAssetUrl(article.coverImage, "");
  const content = article.content || summary;
  const readingMinutes = Math.max(1, Math.ceil(stripMarkdown(content).split(/\s+/).length / 240));

  document.title = `${title} - 子衿的个人博客网站`;
  setText(root, "[data-local-title]", title);
  setText(root, "[data-local-date]", formatDate(article.date || article.updatedAt));
  setText(root, "[data-local-reading]", `${readingMinutes} 分钟阅读`);
  setHtml(root, "[data-local-tags]", renderTags(tags));
  const renderedContent = renderMarkdownDocument(content, {
    emptyHtml: "<p>暂无正文内容。</p>",
    includeToc: true,
    headingIdPrefix: "local-heading",
  });
  setHtml(root, "[data-local-body]", renderedContent.html);
  setHtml(
    root,
    "[data-local-toc]",
    renderToc(renderedContent.toc.filter((item) => item.depth > 1 && item.depth < 4))
  );

  const image = root.querySelector<HTMLImageElement>("[data-local-cover]");
  const coverWrap = root.querySelector<HTMLElement>("[data-local-cover-wrap]");
  if (image && coverWrap) {
    if (cover) {
      image.src = cover;
      image.alt = article.coverImage ? `${title} 封面` : "";
      coverWrap.classList.remove("hidden");
    } else {
      coverWrap.classList.add("hidden");
    }
  }
}

export function initLocalProjectDetail(): void {
  const root = document.querySelector<HTMLElement>("[data-local-project-detail]");
  if (!root || root.dataset.localDetailReady === "true") return;
  root.dataset.localDetailReady = "true";

  const token = localSlugToken(root.dataset.localSlug);
  if (!token) return;

  const projects = readList<AdminProject>(PROJECT_KEY);
  const project = projects.find((item, index) => itemMatchesSlug(item, index, token));
  if (!project) {
    showMissing(root, "项目");
    return;
  }

  const tags = projectTags(project);
  const title = project.title || "未命名项目";
  const description = project.description || "";
  const cover = safeAssetUrl(project.imageData || project.coverImage, "");
  const projectUrl = safeAssetUrl(project.url);

  document.title = `${title} - 子衿的个人博客网站`;
  setText(root, "[data-local-title]", title);
  setText(root, "[data-local-date]", formatDate(project.date || project.updatedAt));
  setText(root, "[data-local-tag-count]", `${tags.length} 个标签`);
  setHtml(root, "[data-local-tags]", renderTags(tags));
  setHtml(root, "[data-local-sidebar-tags]", renderTags(tags));
  setHtml(
    root,
    "[data-local-body]",
    renderMarkdown(description, { emptyHtml: "<p>暂无项目说明。</p>" })
  );

  const image = root.querySelector<HTMLImageElement>("[data-local-cover]");
  const coverWrap = root.querySelector<HTMLElement>("[data-local-cover-wrap]");
  if (image && coverWrap) {
    if (cover) {
      image.src = cover;
      image.alt = project.imageData || project.coverImage ? `${title} 封面` : "";
      coverWrap.classList.remove("hidden");
    } else {
      coverWrap.classList.add("hidden");
    }
  }

  const action = root.querySelector<HTMLAnchorElement>("[data-local-project-url]");
  if (action && projectUrl) {
    action.href = projectUrl;
    action.hidden = false;
  }
}
