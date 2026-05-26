import { COVER_IMAGE_PLACEHOLDER } from "../lib/placeholder-images";

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

type AdminHome = {
  generatedDate?: string;
  guidance?: string;
  heroTitle?: string;
  heroLead?: string;
  quoteText?: string;
  quoteAuthor?: string;
};

const HOME_KEY = "admin-home-data";
const COVER_PLACEHOLDER = COVER_IMAGE_PLACEHOLDER;
const SYNC_EVENT = "admin-content:changed";
const SYNCED_ATTR = "data-admin-synced";

let listenersBound = false;

function readHomeData(): AdminHome | null {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function formatDate(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return validDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
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

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[[^\]]+]\([^)]*\)/g, (match) => match.replace(/^\[|\]\([^)]*\)$/g, ""))
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function articleSummary(article: AdminArticle): string {
  const source = article.description || stripMarkdown(article.content || "");
  return source.length > 110 ? `${source.slice(0, 110)}...` : source;
}

function sortByDateDesc<T extends { date?: string; updatedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.date || a.updatedAt || 0).getTime();
    const bTime = new Date(b.date || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

function hasPage(pathname: string, expected: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === expected;
}

function requestedTagFromUrl(): string {
  try {
    return new URLSearchParams(window.location.search).get("tag")?.trim() || "";
  } catch {
    return "";
  }
}

function ensureList(
  id: string,
  className: string,
  containerSelector: string,
  insertAfterSelector: string
): HTMLElement | null {
  const existing = document.getElementById(id);
  if (existing) return existing;

  const container = document.querySelector<HTMLElement>(containerSelector);
  const anchor = container?.querySelector<HTMLElement>(insertAfterSelector);
  if (!container || !anchor) return null;

  const list = document.createElement("div");
  list.id = id;
  list.className = className;
  list.setAttribute("data-animate", "stagger");

  anchor.insertAdjacentElement("afterend", list);
  container.querySelector<HTMLElement>(".empty-placeholder")?.setAttribute("hidden", "");
  return list;
}

function updateFilterBar(
  filterBar: HTMLElement | null,
  tags: string[],
  itemSelector: string,
  empty: HTMLElement | null,
  renumber?: (visibleItems: HTMLElement[]) => void
): void {
  if (!filterBar) return;

  const nextTags = unique(tags).sort((a, b) => a.localeCompare(b, "zh-CN"));
  const requestedTag = requestedTagFromUrl() || filterBar.dataset.currentTag || "all";
  const currentTag =
    requestedTag === "all" || nextTags.includes(requestedTag) || nextTags.length === 0
      ? requestedTag
      : "all";
  filterBar.dataset.currentTag = currentTag;
  filterBar.innerHTML = [
    `<button class="filter-chip ${currentTag === "all" ? "active" : ""}" data-tag="all">全部</button>`,
    ...nextTags.map(
      (tag) =>
        `<button class="filter-chip ${currentTag === tag ? "active" : ""}" data-tag="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
    ),
  ].join("");

  const apply = () => {
    const activeTag = filterBar.dataset.currentTag || "all";
    const items = Array.from(document.querySelectorAll<HTMLElement>(itemSelector));
    const visibleItems: HTMLElement[] = [];

    items.forEach((item) => {
      const itemTags = splitTagsFromDataset(item);
      const visible = activeTag === "all" || itemTags.includes(activeTag);
      item.classList.toggle("hidden", !visible);
      item.hidden = !visible;
      if (visible) visibleItems.push(item);
    });

    empty?.classList.toggle("hidden", visibleItems.length > 0);
    filterBar.querySelectorAll<HTMLElement>(".filter-chip").forEach((button) => {
      button.classList.toggle("active", button.dataset.tag === activeTag);
    });
    renumber?.(visibleItems);
  };

  if (!filterBar.dataset.adminSyncBound) {
    filterBar.dataset.adminSyncBound = "true";
    filterBar.addEventListener("click", (event) => {
      const button = (event.target as HTMLElement).closest<HTMLElement>(".filter-chip");
      if (!button) return;
      filterBar.dataset.currentTag = button.dataset.tag || "all";
      apply();
    });
  }

  apply();
}

function splitTagsFromDataset(item: HTMLElement): string[] {
  try {
    const raw = item.dataset.tags || "[]";
    const parsed = JSON.parse(raw);
    return splitTags(parsed);
  } catch {
    return [];
  }
}

function articleTags(article: AdminArticle): string[] {
  return splitTags(article.tags);
}

function articleCover(article: AdminArticle): string {
  return String(article.coverImage || COVER_PLACEHOLDER);
}

function localItemKey(
  item: { id?: string; title?: string },
  index: number
): string {
  const raw = String(item.id || item.title || index).trim() || String(index);
  return encodeURIComponent(raw);
}

function localArticleHref(article: AdminArticle, index: number): string {
  return `/articles/local-${localItemKey(article, index)}`;
}

function renderArticleRow(article: AdminArticle, index: number): string {
  const tags = articleTags(article);
  const href = localArticleHref(article, index);
  return `
    <a href="${escapeHtml(href)}" class="article-row admin-local-row" ${SYNCED_ATTR}="article" data-tags="${escapeHtml(JSON.stringify(tags))}" data-index="${index}">
      <div class="article-row-num">${String(index + 1).padStart(2, "0")}</div>
      <div class="front-cover front-cover--row">
        <img src="${escapeHtml(articleCover(article))}" alt="" loading="lazy" />
      </div>
      <div class="article-row-main">
        <div class="article-row-top">
          <h3 class="article-row-title">${escapeHtml(article.title || "未命名文章")}</h3>
          <span class="article-row-date">${formatDate(article.date || article.updatedAt)}</span>
        </div>
        <p class="article-row-desc">${escapeHtml(articleSummary(article))}</p>
        <div class="article-row-bottom">
          <div class="article-row-tags">
            ${tags.map((tag) => `<span class="article-row-tag">${escapeHtml(tag)}</span>`).join("")}
          </div>
          <span class="article-row-arrow">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
          </span>
        </div>
      </div>
    </a>
  `;
}

function renderArchiveItem(
  item: { title?: string; date?: string; updatedAt?: string },
  href: string
): string {
  return `
    <a href="${escapeHtml(href)}" class="archive-item admin-local-row" ${SYNCED_ATTR}="archive-article">
      <span class="archive-date">${formatDate(item.date || item.updatedAt)}</span>
      <span class="archive-title">${escapeHtml(item.title || "未命名内容")}</span>
      <span class="archive-arrow">→</span>
    </a>
  `;
}

function renderArchiveGroup(year: string, items: string, count: number): string {
  return `
    <div class="archive-year-group admin-local-row" ${SYNCED_ATTR}="archive-article-group" data-archive-year="${escapeHtml(year)}" data-static-count="0">
      <div class="year-marker">
        <span class="year-number">${escapeHtml(year)}</span>
        <span class="year-count" data-archive-year-count>${count} 篇</span>
      </div>
      <div class="year-items">${items}</div>
    </div>
  `;
}

function renderHomeArticleCard(article: AdminArticle, index: number): string {
  const tags = articleTags(article);
  const href = localArticleHref(article, index);
  return `
    <a href="${escapeHtml(href)}" class="article-card admin-local-row ${index === 0 ? "article-card-featured" : ""}" ${SYNCED_ATTR}="home-article">
      <div class="front-cover front-cover--card">
        <img src="${escapeHtml(articleCover(article))}" alt="" loading="lazy" />
      </div>
      <div class="article-card-meta">
        <span class="article-date">${formatDate(article.date || article.updatedAt)}</span>
        <div class="article-tags-row">
          ${tags.slice(0, 3).map((tag) => `<span class="article-tag">${escapeHtml(tag)}</span>`).join("")}
        </div>
      </div>
      <h3 class="article-card-title">${escapeHtml(article.title || "未命名文章")}</h3>
      <p class="article-card-desc">${escapeHtml(articleSummary(article))}</p>
    </a>
  `;
}

function removeSynced(type: string): void {
  document.querySelectorAll(`[${SYNCED_ATTR}="${type}"]`).forEach((node) => node.remove());
}

function syncArticlesPage(articles: AdminArticle[]): void {
  if (!hasPage(window.location.pathname, "/articles")) return;

  const list = ensureList(
    "articles-list",
    "articles-dense-list",
    ".articles-content .editorial-container",
    "#tag-filters"
  );
  if (!list) return;

  removeSynced("article");

  const sorted = sortByDateDesc(articles).filter((article) => article.title);
  if (sorted.length > 0) {
    const markup = sorted.map(renderArticleRow).join("");
    list.insertAdjacentHTML("afterbegin", markup);
  }

  const allItems = Array.from(list.querySelectorAll<HTMLElement>(".article-row"));
  const tags = allItems.flatMap(splitTagsFromDataset);
  updateFilterBar(
    document.getElementById("tag-filters"),
    tags,
    "#articles-list .article-row",
    document.getElementById("empty-state"),
    (visibleItems) => {
      visibleItems.forEach((item, index) => {
        const num = item.querySelector<HTMLElement>(".article-row-num");
        if (num) num.textContent = String(index + 1).padStart(2, "0");
      });
    }
  );

  const stats = document.querySelectorAll<HTMLElement>(".articles-stats .articles-stat");
  if (stats[0]) stats[0].textContent = `${allItems.length} 篇文章`;
  if (stats[1]) stats[1].textContent = `${unique(tags).length} 个标签`;
}

function parseCount(value: string | undefined): number {
  const count = Number.parseInt(value || "0", 10);
  return Number.isNaN(count) ? 0 : count;
}

function readStaticArchiveCount(list: HTMLElement): number {
  return Array.from(list.querySelectorAll<HTMLElement>(".archive-year-group")).reduce(
    (total, group) => total + parseCount(group.dataset.staticCount),
    0
  );
}

function resetArchiveYearCounts(list: HTMLElement): void {
  list.querySelectorAll<HTMLElement>(".archive-year-group").forEach((group) => {
    const count = group.querySelector<HTMLElement>("[data-archive-year-count]");
    if (count) count.textContent = `${parseCount(group.dataset.staticCount)} 篇`;
  });
}

function getArchiveYears(list: HTMLElement): string[] {
  return Array.from(list.querySelectorAll<HTMLElement>(".archive-year-group"))
    .filter((group) => group.querySelector(".archive-item"))
    .map((group) => group.dataset.archiveYear || "")
    .filter(Boolean);
}

function insertArchiveGroup(list: HTMLElement, group: HTMLElement, year: string): void {
  const yearNumber = parseCount(year);
  const before = Array.from(list.querySelectorAll<HTMLElement>(".archive-year-group")).find(
    (candidate) => parseCount(candidate.dataset.archiveYear) < yearNumber
  );

  if (before) {
    before.insertAdjacentElement("beforebegin", group);
  } else {
    list.appendChild(group);
  }
}

function syncArchiveSection<T extends { id?: string; title?: string; date?: string; updatedAt?: string }>(
  list: HTMLElement | null,
  empty: HTMLElement | null,
  items: T[],
  hrefForItem: (item: T, index: number) => string
): { count: number; years: string[] } {
  if (!list) return { count: 0, years: [] };

  removeSynced("archive-article-group");
  removeSynced("archive-article");
  resetArchiveYearCounts(list);

  const sorted = sortByDateDesc(items).filter((item) => item.title);
  const grouped = new Map<string, Array<{ item: T; index: number }>>();
  sorted.forEach((item, index) => {
    const year = itemYear(item);
    grouped.set(year, [...(grouped.get(year) || []), { item, index }]);
  });

  Array.from(grouped.entries())
    .sort((a, b) => parseCount(b[0]) - parseCount(a[0]))
    .forEach(([year, entries]) => {
      const markup = entries
        .map(({ item, index }) => renderArchiveItem(item, hrefForItem(item, index)))
        .join("");
      const existing = Array.from(list.querySelectorAll<HTMLElement>(".archive-year-group")).find(
        (group) => group.dataset.archiveYear === year && group.getAttribute(SYNCED_ATTR) !== "archive-article-group"
      );

      if (existing) {
        existing.querySelector<HTMLElement>(".year-items")?.insertAdjacentHTML("afterbegin", markup);
        const count = existing.querySelector<HTMLElement>("[data-archive-year-count]");
        if (count) count.textContent = `${parseCount(existing.dataset.staticCount) + entries.length} 篇`;
        return;
      }

      const template = document.createElement("template");
      template.innerHTML = renderArchiveGroup(year, markup, entries.length).trim();
      const group = template.content.firstElementChild;
      if (group instanceof HTMLElement) insertArchiveGroup(list, group, year);
    });

  const count = readStaticArchiveCount(list) + sorted.length;
  if (empty) empty.hidden = count > 0;
  list.hidden = count === 0;

  return { count, years: getArchiveYears(list) };
}

function syncArchivePage(articles: AdminArticle[]): void {
  if (!hasPage(window.location.pathname, "/archive")) return;

  const articleResult = syncArchiveSection(
    document.querySelector<HTMLElement>('[data-archive-list="articles"]'),
    document.querySelector<HTMLElement>('[data-archive-empty="articles"]'),
    articles,
    localArticleHref
  );
  const projectYears = Array.from(
    document.querySelectorAll<HTMLElement>('[data-archive-list="projects"] .archive-year-group')
  )
    .map((group) => group.dataset.archiveYear || "")
    .filter(Boolean);
  const projectCount = readStaticArchiveCount(
    document.querySelector<HTMLElement>('[data-archive-list="projects"]') ?? document.createElement("div")
  );
  const yearCount = unique([...articleResult.years, ...projectYears]).length;

  const summary = document.querySelector<HTMLElement>("[data-archive-summary]");
  if (summary) {
    const total = articleResult.count + projectCount;
    summary.textContent = `所有内容的完整记录。截至目前，共收录 ${total} 条内容，包括 ${articleResult.count} 篇文章和 ${projectCount} 个项目。`;
  }

  const articleStat = document.querySelector<HTMLElement>('[data-archive-stat="articles"]');
  const projectStat = document.querySelector<HTMLElement>('[data-archive-stat="projects"]');
  const yearStat = document.querySelector<HTMLElement>('[data-archive-stat="years"]');
  if (articleStat) articleStat.textContent = String(articleResult.count);
  if (projectStat) projectStat.textContent = String(projectCount);
  if (yearStat) yearStat.textContent = String(yearCount);
}

function ensureHomeGrid(selector: string, className: string): HTMLElement | null {
  const existing = document.querySelector<HTMLElement>(selector);
  if (existing) return existing;

  const section = selector.includes("articles")
    ? document.querySelector<HTMLElement>(".content-section:not(.section-alt) .editorial-container")
    : document.querySelector<HTMLElement>(".content-section.section-alt .editorial-container");
  const header = section?.querySelector<HTMLElement>(".section-header-row");
  if (!section || !header) return null;

  section.querySelector<HTMLElement>(".empty-placeholder")?.setAttribute("hidden", "");
  const grid = document.createElement("div");
  grid.className = className;
  grid.setAttribute("data-animate", "stagger");
  header.insertAdjacentElement("afterend", grid);
  return grid;
}

function syncHome(): void {
  if (!hasPage(window.location.pathname, "/")) return;

  const homeData = readHomeData();
  if (homeData) {
    const heroTitle = document.querySelector<HTMLElement>(".hero-title");
    const heroLead = document.querySelector<HTMLElement>(".hero-desc");
    const quoteText = document.querySelector<HTMLElement>(".quote-text");
    const quoteAuthor = document.querySelector<HTMLElement>(".quote-author");

    if (homeData.heroTitle && heroTitle) {
      heroTitle.textContent = homeData.heroTitle;
      heroTitle.style.whiteSpace = "pre-line";
    }
    if (homeData.heroLead && heroLead) heroLead.textContent = homeData.heroLead;
    if (homeData.quoteText && quoteText) quoteText.textContent = homeData.quoteText;
    if (homeData.quoteAuthor && quoteAuthor) quoteAuthor.textContent = homeData.quoteAuthor;
  }
}

function syncCurrentPage(): void {
  syncHome();
}

function queueSync(): void {
  window.requestAnimationFrame(syncCurrentPage);
}

export function initAdminContentSync(): void {
  syncCurrentPage();

  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("storage", (event) => {
    if (event.key === HOME_KEY) queueSync();
  });
  window.addEventListener(SYNC_EVENT, queueSync);
  document.addEventListener("astro:after-swap", queueSync);
}
