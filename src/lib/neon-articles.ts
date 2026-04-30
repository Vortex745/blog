import { neon } from "@neondatabase/serverless";

export type NeonArticle = {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  coverImage?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

type ArticleRow = {
  id: string;
  title: string;
  content: string;
  description: string;
  cover_image: string;
  tags: unknown;
  date: string | Date;
  updated_at: string | Date | null;
};

const connectionString = process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL;

export function neonArticlesStorageConfigured(): boolean {
  return Boolean(connectionString);
}

function getSql() {
  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL，无法连接 Neon 数据库");
  }

  return neon(connectionString);
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

function normalizeArticle(article: NeonArticle, index: number): NeonArticle | null {
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

function rowToArticle(row: ArticleRow): NeonArticle {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    description: row.description,
    coverImage: row.cover_image,
    tags: splitTags(row.tags),
    date: new Date(row.date).toISOString(),
    updatedAt: row.updated_at ? new Date(row.updated_at).toISOString() : undefined,
  };
}

export function normalizeArticles(value: unknown): NeonArticle[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { articles?: unknown }).articles)
      ? (value as { articles: unknown[] }).articles
      : [];

  return list
    .map((article, index) => normalizeArticle(article as NeonArticle, index))
    .filter((article): article is NeonArticle => Boolean(article));
}

export async function readNeonArticles(): Promise<NeonArticle[]> {
  if (!neonArticlesStorageConfigured()) return [];

  const sql = getSql();
  const rows = await sql<ArticleRow[]>`
    select id, title, content, description, cover_image, tags, date, updated_at
    from admin_articles
    order by date desc, id desc
  `;

  return rows.map(rowToArticle);
}

export async function writeNeonArticles(articles: unknown): Promise<NeonArticle[]> {
  const normalized = normalizeArticles(articles);
  const payload = JSON.stringify(normalized);
  const sql = getSql();

  await sql`
    with incoming as (
      select *
      from jsonb_to_recordset(${payload}::jsonb) as article(
        id text,
        title text,
        content text,
        description text,
        "coverImage" text,
        tags jsonb,
        date timestamptz,
        "updatedAt" timestamptz
      )
    ),
    removed as (
      delete from admin_articles
      where not exists (
        select 1
        from incoming
        where incoming.id = admin_articles.id
      )
      returning id
    ),
    upserted as (
      insert into admin_articles (
        id,
        title,
        content,
        description,
        cover_image,
        tags,
        date,
        updated_at
      )
      select
        id,
        title,
        coalesce(content, ''),
        coalesce(description, ''),
        coalesce("coverImage", ''),
        coalesce(tags, '[]'::jsonb),
        coalesce(date, now()),
        "updatedAt"
      from incoming
      on conflict (id) do update set
        title = excluded.title,
        content = excluded.content,
        description = excluded.description,
        cover_image = excluded.cover_image,
        tags = excluded.tags,
        date = excluded.date,
        updated_at = excluded.updated_at
      returning id
    )
    select
      (select count(*) from removed) as removed_count,
      (select count(*) from upserted) as upserted_count
  `;

  return normalized;
}
