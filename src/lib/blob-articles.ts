import { BlobNotFoundError, get, put } from "@vercel/blob";

export type BlobArticle = {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  coverImage?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

const ARTICLES_BLOB_PATH = "admin/articles.json";

export function blobArticlesStorageConfigured(): boolean {
  return Boolean(import.meta.env.BLOB_READ_WRITE_TOKEN);
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

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[[^\]]*]\([^)]*\)/g, "")
    .replace(/\[([^\]]+)]\([^)]*\)/g, "$1")
    .replace(/[`*_>#-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeArticle(article: BlobArticle, index: number): BlobArticle | null {
  const title = String(article.title || "").trim();
  const content = String(article.content || "").trim();
  if (!title && !content) return null;

  const id = String(article.id || title || index).trim() || String(index);
  const description =
    String(article.description || "").trim() ||
    stripMarkdown(content).slice(0, 140);
  const date = article.date ? String(article.date) : new Date().toISOString();

  return {
    id,
    title: title || "未命名文章",
    content,
    description,
    coverImage: String(article.coverImage || "").trim(),
    tags: splitTags(article.tags),
    date,
    updatedAt: article.updatedAt ? String(article.updatedAt) : undefined,
  };
}

export function normalizeArticles(value: unknown): BlobArticle[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { articles?: unknown }).articles)
      ? (value as { articles: unknown[] }).articles
      : [];

  return list
    .map((article, index) => normalizeArticle(article as BlobArticle, index))
    .filter((article): article is BlobArticle => Boolean(article));
}

export async function readBlobArticles(): Promise<BlobArticle[]> {
  if (!blobArticlesStorageConfigured()) return [];

  try {
    const result = await get(ARTICLES_BLOB_PATH, {
      access: "private",
      useCache: false,
    });
    if (!result || result.statusCode !== 200 || !result.stream) return [];

    const payload = await new Response(result.stream).json();
    return normalizeArticles(payload);
  } catch (error) {
    if (error instanceof BlobNotFoundError) return [];
    throw error;
  }
}

export async function writeBlobArticles(articles: unknown): Promise<BlobArticle[]> {
  const normalized = normalizeArticles(articles);
  const payload = JSON.stringify(
    {
      articles: normalized,
      updatedAt: new Date().toISOString(),
    },
    null,
    2,
  );

  await put(ARTICLES_BLOB_PATH, payload, {
    access: "private",
    allowOverwrite: true,
    cacheControlMaxAge: 60,
    contentType: "application/json; charset=utf-8",
  });

  return normalized;
}
