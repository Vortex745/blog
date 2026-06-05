import { renderMarkdown, renderMarkdownDocument } from "../lib/markdown";
import {
  type AdminArticle,
  type AdminProject,
  escapeHtml,
  formatDate,
  itemMatchesSlug,
  localSlugToken,
  safeAssetUrl,
  stripMarkdown,
} from "../lib/client-content";
import { normalizeDomainArticle, normalizeDomainProject } from "../lib/domain-types";

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
  let articleRaw = articles.find((item, index) => itemMatchesSlug(item, index, token));
  if (!articleRaw) {
    const remoteArticles = await readRemoteArticles();
    articleRaw = remoteArticles.find((item, index) => itemMatchesSlug(item, index, token));
  }

  const article = articleRaw ? normalizeDomainArticle(articleRaw, 0) : null;
  if (!article) {
    showMissing(root, "文章");
    return;
  }

  const tags = article.tags;
  const title = article.title;
  const summary = article.summary;
  const cover = safeAssetUrl(article.coverImage, "");
  const content = article.content || summary;
  const readingMinutes = Math.max(1, Math.ceil(stripMarkdown(content).split(/\s+/).length / 240));

  document.title = `${title} - 子衿的个人博客网站`;
  setText(root, "[data-local-title]", title);
  setText(root, "[data-local-date]", formatDate(article.date || article.updatedAt, "long"));
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
  const projectRaw = projects.find((item, index) => itemMatchesSlug(item, index, token));
  const project = projectRaw ? normalizeDomainProject(projectRaw, 0) : null;
  if (!project) {
    showMissing(root, "项目");
    return;
  }

  const tags = project.tags;
  const title = project.title;
  const description = project.description;
  const cover = safeAssetUrl(project.imageData || project.coverImage, "");
  const projectUrl = safeAssetUrl(project.url);

  document.title = `${title} - 子衿的个人博客网站`;
  setText(root, "[data-local-title]", title);
  setText(root, "[data-local-date]", formatDate(project.date || project.updatedAt, "long"));
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
