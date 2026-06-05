import type { BlogDatabase } from "./db/sqlite";
import { openBlogDatabase, sqliteStorageConfigured } from "./db/sqlite";
import { profile } from "../data/profile";
import type {
  DomainArticle,
  DomainProject,
  DomainAbout,
  DomainGallery,
} from "./domain-types";
import {
  normalizeDomainArticle,
  normalizeDomainProject,
  normalizeDomainAbout,
  normalizeDomainGallery,
  splitTags,
} from "./domain-types";

// Re-export domain types for convenience of callers
export type { DomainArticle as ContentArticle, DomainProject as ContentProject, DomainAbout as ContentAbout, DomainGallery as ContentGallery };

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

export function normalizeArticles(value: unknown): DomainArticle[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { articles?: unknown }).articles)
      ? (value as { articles: unknown[] }).articles
      : [];

  return list
    .map((article, index) => normalizeDomainArticle(article, index))
    .filter((article): article is DomainArticle => Boolean(article));
}

export function normalizeProjects(value: unknown): DomainProject[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { projects?: unknown }).projects)
      ? (value as { projects: unknown[] }).projects
      : [];

  return list
    .map((project, index) => normalizeDomainProject(project, index))
    .filter((project): project is DomainProject => Boolean(project));
}

export function normalizeAbout(value: unknown): DomainAbout {
  return normalizeDomainAbout(value, profile);
}

export function normalizeGallery(value: unknown): DomainGallery[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { gallery?: unknown }).gallery)
      ? (value as { gallery: unknown[] }).gallery
      : [];

  return list
    .map((item, index) => normalizeDomainGallery(item, index))
    .filter((item): item is DomainGallery => Boolean(item));
}

function rowToArticle(row: ArticleRow, index: number): DomainArticle | null {
  return normalizeDomainArticle({
    id: row.id,
    title: row.title,
    content: row.content,
    description: row.description,
    coverImage: row.cover_image,
    tags: row.tags,
    date: row.date,
    updatedAt: row.updated_at,
  }, index);
}

function rowToProject(row: ProjectRow, index: number): DomainProject | null {
  return normalizeDomainProject({
    id: row.id,
    title: row.title,
    category: row.category,
    tech: row.tech,
    url: row.url,
    description: row.description,
    coverImage: row.image_data,
    imageData: row.image_data,
    tags: row.tags,
    date: row.date,
    updatedAt: row.updated_at,
  }, index);
}

function rowToAbout(row: AboutRow): DomainAbout {
  return normalizeDomainAbout({
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    bio: row.bio,
    description: row.description,
    philosophy: row.philosophy,
    skills: row.skills,
    updatedAt: row.updated_at,
  }, profile);
}

function rowToGallery(row: GalleryRow, index: number): DomainGallery | null {
  return normalizeDomainGallery({
    id: row.id,
    title: row.title,
    imageData: row.image_data,
    description: row.description,
    category: row.category,
    tags: row.tags,
    date: row.date,
    updatedAt: row.updated_at,
  }, index);
}

export async function readContentArticles(options?: ContentStoreOptions): Promise<DomainArticle[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, content, description, cover_image, tags, date, updated_at from admin_articles order by date desc, id desc")
      .all()
      .map((row, index) => rowToArticle(row as ArticleRow, index))
      .filter((a): a is DomainArticle => Boolean(a)),
  );
}

export async function writeContentArticles(articles: unknown, options?: ContentStoreOptions): Promise<DomainArticle[]> {
  const normalized = normalizeArticles(articles);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: DomainArticle[]) => {
      db.prepare("delete from admin_articles").run();
      const insert = db.prepare(`
        insert into admin_articles (id, title, content, description, cover_image, tags, date, updated_at)
        values (@id, @title, @content, @description, @coverImage, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title,
          content: item.content,
          description: item.description,
          coverImage: item.coverImage,
          tags: JSON.stringify(item.tags),
          date: item.date.toISOString(),
          updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}

export async function readContentProjects(options?: ContentStoreOptions): Promise<DomainProject[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, category, tech, url, description, image_data, tags, date, updated_at from admin_projects order by date desc, id desc")
      .all()
      .map((row, index) => rowToProject(row as ProjectRow, index))
      .filter((p): p is DomainProject => Boolean(p)),
  );
}

export async function writeContentProjects(projects: unknown, options?: ContentStoreOptions): Promise<DomainProject[]> {
  const normalized = normalizeProjects(projects);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: DomainProject[]) => {
      db.prepare("delete from admin_projects").run();
      const insert = db.prepare(`
        insert into admin_projects (id, title, category, tech, url, description, image_data, tags, date, updated_at)
        values (@id, @title, @category, @tech, @url, @description, @imageData, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title,
          category: item.category,
          tech: item.tech,
          url: item.url,
          description: item.description,
          imageData: item.imageData,
          tags: JSON.stringify(item.tags),
          date: item.date.toISOString(),
          updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}

export async function readContentAbout(options?: ContentStoreOptions): Promise<DomainAbout> {
  return withDatabase(options, (db) => {
    const row = db.prepare("select name, role, avatar, bio, description, philosophy, skills, updated_at from admin_about limit 1").get();
    return row ? rowToAbout(row as AboutRow) : normalizeAbout({});
  });
}

export async function writeContentAbout(about: unknown, options?: ContentStoreOptions): Promise<DomainAbout> {
  const normalized = normalizeAbout(about);

  withDatabase(options, (db) => {
    const replace = db.transaction((item: DomainAbout) => {
      db.prepare("delete from admin_about").run();
      db.prepare(`
        insert into admin_about (name, role, avatar, bio, description, philosophy, skills, updated_at)
        values (@name, @role, @avatar, @bio, @description, @philosophy, @skills, @updatedAt)
      `).run({
        name: item.name,
        role: item.role,
        avatar: item.avatar,
        bio: item.bio,
        description: item.description,
        philosophy: JSON.stringify(item.philosophy),
        skills: JSON.stringify(item.skills),
        updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
      });
    });
    replace(normalized);
  });

  return normalized;
}

export async function readContentGallery(options?: ContentStoreOptions): Promise<DomainGallery[]> {
  return withDatabase(options, (db) =>
    db
      .prepare("select id, title, image_data, description, category, tags, date, updated_at from admin_gallery order by date desc, id desc")
      .all()
      .map((row, index) => rowToGallery(row as GalleryRow, index))
      .filter((g): g is DomainGallery => Boolean(g)),
  );
}

export async function writeContentGallery(gallery: unknown, options?: ContentStoreOptions): Promise<DomainGallery[]> {
  const normalized = normalizeGallery(gallery);

  withDatabase(options, (db) => {
    const replace = db.transaction((items: DomainGallery[]) => {
      db.prepare("delete from admin_gallery").run();
      const insert = db.prepare(`
        insert into admin_gallery (id, title, image_data, description, category, tags, date, updated_at)
        values (@id, @title, @imageData, @description, @category, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        insert.run({
          id: item.id,
          title: item.title,
          imageData: item.imageData,
          description: item.description,
          category: item.category,
          tags: JSON.stringify(item.tags),
          date: item.date.toISOString(),
          updatedAt: item.updatedAt ? item.updatedAt.toISOString() : null,
        });
      });
    });
    replace(normalized);
  });

  return normalized;
}
