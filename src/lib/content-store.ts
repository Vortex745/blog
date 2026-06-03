import type { BlogDatabase } from "./db/sqlite";
import { openBlogDatabase, sqliteStorageConfigured } from "./db/sqlite";
import { profile } from "../data/profile";
import { stripMarkdown } from "./markdown";

export type ContentArticle = {
  id?: string;
  title?: string;
  content?: string;
  description?: string;
  coverImage?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

export type ContentProject = {
  id?: string;
  title?: string;
  category?: string;
  tech?: string;
  url?: string;
  description?: string;
  coverImage?: string;
  imageData?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

export type ContentAbout = {
  name?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  description?: string;
  philosophy?: string[];
  skills?: string[];
  updatedAt?: string;
};

export type ContentGallery = {
  id?: string;
  title?: string;
  imageData?: string;
  description?: string;
  category?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

export type ContentStoreOptions = {
  db?: BlogDatabase;
  dbPath?: string;
};

type ArticleRow = {
  id: string;
  title: string;
  content: string;
  description: string;
  cover_image: string;
  tags: string;
  date: string;
  updated_at: string | null;
};

type ProjectRow = {
  id: string;
  title: string;
  category: string;
  tech: string;
  url: string;
  description: string;
  image_data: string;
  tags: string;
  date: string;
  updated_at: string | null;
};

type AboutRow = {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  description: string;
  philosophy: string;
  skills: string;
  updated_at: string | null;
};

type GalleryRow = {
  id: string;
  title: string;
  image_data: string;
  description: string;
  category: string;
  tags: string;
  date: string;
  updated_at: string | null;
};

export function storageConfigured(): boolean {
  return sqliteStorageConfigured();
}

function withDatabase<T>(options: ContentStoreOptions | undefined, run: (db: BlogDatabase) => T): T {
  if (options?.db) return run(options.db);

  const db = openBlogDatabase({ dbPath: options?.dbPath });
  try {
    return run(db);
  } finally {
    db.close();
  }
}

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const parsed = parseJsonArray(value);
  if (parsed.length > 0) return splitTags(parsed);

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim().replace(/^#+/, "").trim())
    .filter(Boolean);
}

function splitMarkdownBlocks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const parsed = parseJsonArray(value);
  if (parsed.length > 0) return splitMarkdownBlocks(parsed);

  return String(value ?? "")
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function imageUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return "";
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function dateToIso(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export function articleTags(article: ContentArticle): string[] {
  return splitTags(article.tags);
}

export function articleCover(article: ContentArticle): string {
  return imageUrl(article.coverImage);
}

export function articleDate(article: ContentArticle): Date {
  const date = article.date ? new Date(article.date) : new Date(article.updatedAt || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

export function articleSummary(article: ContentArticle): string {
  const source = String(article.description || "").trim() || stripMarkdown(String(article.content || ""));
  return source.length > 140 ? `${source.slice(0, 140)}...` : source;
}

export function projectTags(project: ContentProject): string[] {
  return unique([
    String(project.category ?? "").trim(),
    ...splitTags(project.tech || project.tags),
  ]);
}

export function projectCover(project: ContentProject): string {
  return imageUrl(project.imageData || project.coverImage);
}

export function projectDate(project: ContentProject): Date {
  const date = project.date ? new Date(project.date) : new Date(project.updatedAt || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeArticle(article: ContentArticle, index: number): ContentArticle | null {
  const title = String(article.title || "").trim();
  const content = String(article.content || "").trim();
  if (!title && !content) return null;

  const id = String(article.id || title || index).trim() || String(index);
  const description = String(article.description || "").trim() || stripMarkdown(content).slice(0, 140);

  return {
    id,
    title: title || "未命名文章",
    content,
    description,
    coverImage: String(article.coverImage || "").trim(),
    tags: splitTags(article.tags),
    date: dateToIso(article.date),
    updatedAt: article.updatedAt ? dateToIso(article.updatedAt) : undefined,
  };
}

function normalizeProject(project: ContentProject, index: number): ContentProject | null {
  const title = String(project.title ?? "").trim();
  const description = String(project.description ?? "").trim();
  if (!title && !description) return null;

  const tags = projectTags(project);
  const image = projectCover(project);

  return {
    id: String(project.id || title || index).trim() || String(index),
    title: title || "未命名项目",
    category: String(project.category ?? "").trim(),
    tech: tags.filter((tag) => tag !== String(project.category ?? "").trim()).join(","),
    url: String(project.url ?? "").trim(),
    description,
    coverImage: image,
    imageData: image,
    tags,
    date: dateToIso(project.date),
    updatedAt: project.updatedAt ? dateToIso(project.updatedAt) : undefined,
  };
}

export function normalizeArticles(value: unknown): ContentArticle[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { articles?: unknown }).articles)
      ? (value as { articles: unknown[] }).articles
      : [];

  return list
    .map((article, index) => normalizeArticle(article as ContentArticle, index))
    .filter((article): article is ContentArticle => Boolean(article));
}

export function normalizeProjects(value: unknown): ContentProject[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { projects?: unknown }).projects)
      ? (value as { projects: unknown[] }).projects
      : [];

  return list
    .map((project, index) => normalizeProject(project as ContentProject, index))
    .filter((project): project is ContentProject => Boolean(project));
}

export function normalizeAbout(value: unknown): ContentAbout {
  const source = value && typeof value === "object" ? value as ContentAbout : {};
  return {
    name: String(source.name ?? profile.name ?? "").trim(),
    role: String(source.role ?? profile.role ?? "").trim(),
    avatar: imageUrl(source.avatar) || profile.avatar,
    bio: String(source.bio ?? profile.bio ?? "").trim(),
    description: String(source.description ?? profile.description ?? "").trim(),
    philosophy: splitMarkdownBlocks(source.philosophy ?? profile.philosophy),
    skills: splitTags(source.skills ?? profile.skills),
    updatedAt: source.updatedAt ? dateToIso(source.updatedAt) : undefined,
  };
}

export function normalizeGallery(value: unknown): ContentGallery[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { gallery?: unknown }).gallery)
      ? (value as { gallery: unknown[] }).gallery
      : [];

  return list
    .map((item, index): ContentGallery | null => {
      const gallery = item as ContentGallery;
      const title = String(gallery.title ?? "").trim();
      const imageData = String(gallery.imageData ?? "").trim();
      if (!title && !imageData) return null;

      return {
        id: String(gallery.id || title || index).trim() || String(index),
        title: title || "未命名图片",
        imageData,
        description: String(gallery.description ?? "").trim(),
        category: String(gallery.category ?? "").trim(),
        tags: splitTags(gallery.tags),
        date: dateToIso(gallery.date),
        updatedAt: gallery.updatedAt ? dateToIso(gallery.updatedAt) : undefined,
      };
    })
    .filter((item): item is ContentGallery => Boolean(item));
}

function rowToArticle(row: ArticleRow): ContentArticle {
  return {
    id: row.id,
    title: row.title,
    content: row.content,
    description: row.description,
    coverImage: row.cover_image,
    tags: splitTags(row.tags),
    date: dateToIso(row.date),
    updatedAt: row.updated_at ? dateToIso(row.updated_at) : undefined,
  };
}

function rowToProject(row: ProjectRow): ContentProject {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tech: row.tech,
    url: row.url,
    description: row.description,
    coverImage: row.image_data,
    imageData: row.image_data,
    tags: projectTags({ category: row.category, tech: row.tech || row.tags }),
    date: dateToIso(row.date),
    updatedAt: row.updated_at ? dateToIso(row.updated_at) : undefined,
  };
}

function rowToAbout(row: AboutRow): ContentAbout {
  return normalizeAbout({
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    bio: row.bio,
    description: row.description,
    philosophy: row.philosophy,
    skills: row.skills,
    updatedAt: row.updated_at,
  });
}

function rowToGallery(row: GalleryRow): ContentGallery {
  return {
    id: row.id,
    title: row.title,
    imageData: row.image_data,
    description: row.description,
    category: row.category,
    tags: splitTags(row.tags),
    date: dateToIso(row.date),
    updatedAt: row.updated_at ? dateToIso(row.updated_at) : undefined,
  };
}

export async function readContentArticles(options?: ContentStoreOptions): Promise<ContentArticle[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, content, description, cover_image, tags, date, updated_at from admin_articles order by date desc, id desc")
      .all()
      .map((row) => rowToArticle(row as ArticleRow)),
  );
}

export async function writeContentArticles(articles: unknown, options?: ContentStoreOptions): Promise<ContentArticle[]> {
  const normalized = normalizeArticles(articles);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: ContentArticle[]) => {
      db.prepare("delete from admin_articles").run();
      const insert = db.prepare(`
        insert into admin_articles (id, title, content, description, cover_image, tags, date, updated_at)
        values (@id, @title, @content, @description, @coverImage, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title ?? "",
          content: item.content ?? "",
          description: item.description ?? "",
          coverImage: item.coverImage ?? "",
          tags: JSON.stringify(splitTags(item.tags)),
          date: dateToIso(item.date),
          updatedAt: item.updatedAt ?? null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}

export async function readContentProjects(options?: ContentStoreOptions): Promise<ContentProject[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, category, tech, url, description, image_data, tags, date, updated_at from admin_projects order by date desc, id desc")
      .all()
      .map((row) => rowToProject(row as ProjectRow)),
  );
}

export async function writeContentProjects(projects: unknown, options?: ContentStoreOptions): Promise<ContentProject[]> {
  const normalized = normalizeProjects(projects);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: ContentProject[]) => {
      db.prepare("delete from admin_projects").run();
      const insert = db.prepare(`
        insert into admin_projects (id, title, category, tech, url, description, image_data, tags, date, updated_at)
        values (@id, @title, @category, @tech, @url, @description, @imageData, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title ?? "",
          category: item.category ?? "",
          tech: item.tech ?? "",
          url: item.url ?? "",
          description: item.description ?? "",
          imageData: item.imageData || item.coverImage || "",
          tags: JSON.stringify(projectTags(item)),
          date: dateToIso(item.date),
          updatedAt: item.updatedAt ?? null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}

export async function readContentAbout(options?: ContentStoreOptions): Promise<ContentAbout | null> {
  return withDatabase(options, (db) => {
    const row = db
      .prepare("select name, role, avatar, bio, description, philosophy, skills, updated_at from admin_about where id = 'profile' limit 1")
      .get() as AboutRow | undefined;
    return row ? rowToAbout(row) : null;
  });
}

export async function writeContentAbout(about: unknown, options?: ContentStoreOptions): Promise<ContentAbout> {
  const normalized = normalizeAbout({
    ...(about && typeof about === "object" ? about as ContentAbout : {}),
    updatedAt: new Date().toISOString(),
  });

  withDatabase(options, (db) => {
    db.prepare(`
      insert into admin_about (id, name, role, avatar, bio, description, philosophy, skills, updated_at)
      values ('profile', @name, @role, @avatar, @bio, @description, @philosophy, @skills, @updatedAt)
      on conflict(id) do update set
        name = excluded.name,
        role = excluded.role,
        avatar = excluded.avatar,
        bio = excluded.bio,
        description = excluded.description,
        philosophy = excluded.philosophy,
        skills = excluded.skills,
        updated_at = excluded.updated_at
    `).run({
      name: normalized.name ?? "",
      role: normalized.role ?? "",
      avatar: normalized.avatar ?? "",
      bio: normalized.bio ?? "",
      description: normalized.description ?? "",
      philosophy: JSON.stringify(normalized.philosophy ?? []),
      skills: JSON.stringify(normalized.skills ?? []),
      updatedAt: normalized.updatedAt ?? new Date().toISOString(),
    });
  });

  return normalized;
}

export async function readContentGallery(options?: ContentStoreOptions): Promise<ContentGallery[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, image_data, description, category, tags, date, updated_at from admin_gallery order by date desc, id desc")
      .all()
      .map((row) => rowToGallery(row as GalleryRow)),
  );
}

export async function writeContentGallery(gallery: unknown, options?: ContentStoreOptions): Promise<ContentGallery[]> {
  const normalized = normalizeGallery(gallery);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: ContentGallery[]) => {
      db.prepare("delete from admin_gallery").run();
      const insert = db.prepare(`
        insert into admin_gallery (id, title, image_data, description, category, tags, date, updated_at)
        values (@id, @title, @imageData, @description, @category, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title ?? "",
          imageData: item.imageData ?? "",
          description: item.description ?? "",
          category: item.category ?? "",
          tags: JSON.stringify(splitTags(item.tags)),
          date: dateToIso(item.date),
          updatedAt: item.updatedAt ?? null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}
