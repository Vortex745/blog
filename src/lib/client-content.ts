import { COVER_IMAGE_PLACEHOLDER } from "./placeholder-images";
import { escapeHtml, stripMarkdown } from "./markdown";

export type AdminArticle = {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  coverImage?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

export type AdminProject = {
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

export { escapeHtml, stripMarkdown };

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim().replace(/^#+/, "").trim())
    .filter(Boolean);
}

export function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function formatDate(value: unknown, style: "short" | "long" = "short"): string {
  const date = value ? new Date(String(value)) : new Date();
  const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
  return validDate.toLocaleDateString("zh-CN", {
    year: "numeric",
    month: style === "long" ? "long" : "short",
    day: "numeric",
  });
}

export function articleTags(article: AdminArticle): string[] {
  return splitTags(article.tags);
}

export function articleCover(article: AdminArticle): string {
  return String(article.coverImage || COVER_IMAGE_PLACEHOLDER);
}

export function articleSummary(article: AdminArticle, maxLength = 110): string {
  const source = article.description || stripMarkdown(article.content || "");
  return source.length > maxLength ? `${source.slice(0, maxLength)}...` : source;
}

export function projectTags(project: AdminProject): string[] {
  return unique([project.category || "", ...splitTags(project.tech)]);
}

export function localItemKey(item: { id?: string; title?: string }, index: number): string {
  const raw = String(item.id || item.title || index).trim() || String(index);
  return encodeURIComponent(raw);
}

export function localArticleHref(article: AdminArticle, index: number): string {
  return `/articles/local-${localItemKey(article, index)}`;
}

export function localSlugToken(slug: string | undefined): { decoded: string; encoded: string } | null {
  if (!slug?.startsWith("local-")) return null;
  const encoded = slug.slice("local-".length);
  try {
    return { decoded: decodeURIComponent(encoded), encoded };
  } catch {
    return { decoded: encoded, encoded };
  }
}

export function itemMatchesSlug(
  item: { id?: string; title?: string },
  index: number,
  token: { decoded: string; encoded: string }
): boolean {
  return [item.id, item.title, String(index)].some((candidate) => {
    const key = String(candidate || "").trim();
    return key === token.decoded || encodeURIComponent(key) === token.encoded;
  });
}

export function sortByDateDesc<T extends { date?: string; updatedAt?: string }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aTime = new Date(a.date || a.updatedAt || 0).getTime();
    const bTime = new Date(b.date || b.updatedAt || 0).getTime();
    return bTime - aTime;
  });
}

export function safeAssetUrl(value: unknown, fallback = ""): string {
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
