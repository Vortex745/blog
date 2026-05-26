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
let articlesTableReady: Promise<void> | null = null;

export function neonArticlesStorageConfigured(): boolean {
  return Boolean(connectionString);
}

function getSql() {
  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL，无法连接 Neon 数据库");
  }

  return neon(connectionString);
}

async function ensureArticlesTable() {
  articlesTableReady ??= getSql()`
    create table if not exists admin_articles (
      id text primary key,
      title text not null default '',
      content text not null default '',
      description text not null default '',
      cover_image text not null default '',
      tags jsonb not null default '[]'::jsonb,
      date timestamptz not null default now(),
      updated_at timestamptz
    )
  `.then(() => undefined);

  await articlesTableReady;
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

function imageUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return "";
}

export function articleTags(article: NeonArticle): string[] {
  return splitTags(article.tags);
}

export function articleCover(article: NeonArticle): string {
  return imageUrl(article.coverImage);
}

export function articleDate(article: NeonArticle): Date {
  const date = article.date ? new Date(article.date) : new Date(article.updatedAt || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function articleSummary(article: NeonArticle): string {
  const source = String(article.description || "").trim() || stripMarkdown(String(article.content || ""));
  return source.length > 140 ? `${source.slice(0, 140)}...` : source;
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

  await ensureArticlesTable();
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

  await ensureArticlesTable();
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
