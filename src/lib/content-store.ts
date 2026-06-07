import type { BlogDatabase } from "./db/sqlite";
import { getSharedDatabase, sqliteStorageConfigured } from "./db/sqlite";
import { profile } from "../data/profile";
import type {
  DomainArticle,
  DomainProject,
  DomainAbout,
  DomainGallery,
  DomainHome,
} from "./domain-types";
import {
  normalizeDomainArticle,
  normalizeDomainProject,
  normalizeDomainAbout,
  normalizeDomainGallery,
  normalizeDomainHome,
  splitTags,
} from "./domain-types";

// Re-export domain types for convenience of callers
export type { DomainArticle as ContentArticle, DomainProject as ContentProject, DomainAbout as ContentAbout, DomainGallery as ContentGallery, DomainHome as ContentHome };

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

type HomeRow = {
  id: string;
  generated_date: string;
  guidance: string;
  hero_title: string;
  hero_lead: string;
  quote_text: string;
  quote_author: string;
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

export function hasAnyContent(options?: ContentStoreOptions): boolean {
  return withDatabase(options, (db) => {
    const row = db.prepare(`
      select
        (select count(*) from admin_articles) +
        (select count(*) from admin_projects) +
        (select count(*) from admin_about) +
        (select count(*) from admin_home) +
        (select count(*) from admin_gallery) as total
    `).get() as { total: number } | undefined;
    return (row?.total ?? 0) > 0;
  });
}

function withDatabase<T>(options: ContentStoreOptions | undefined, run: (db: BlogDatabase) => T): T {
  if (options?.db) return run(options.db);

  const db = getSharedDatabase({ dbPath: options?.dbPath });
  return run(db);
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

export function normalizeHome(value: unknown): DomainHome {
  return normalizeDomainHome(value);
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

function rowToHome(row: HomeRow): DomainHome {
  return normalizeDomainHome({
    generatedDate: row.generated_date,
    guidance: row.guidance,
    heroTitle: row.hero_title,
    heroLead: row.hero_lead,
    quoteText: row.quote_text,
    quoteAuthor: row.quote_author,
    updatedAt: row.updated_at,
  });
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
      // Delete rows no longer in the new set
      const newIds = items.map((i) => i.id);
      if (newIds.length > 0) {
        const placeholders = newIds.map(() => "?").join(",");
        db.prepare(`delete from admin_articles where id not in (${placeholders})`).run(...newIds);
      } else {
        db.prepare("delete from admin_articles").run();
      }

      const upsert = db.prepare(`
        insert or replace into admin_articles (id, title, content, description, cover_image, tags, date, updated_at)
        values (@id, @title, @content, @description, @coverImage, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        upsert.run({
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
      const newIds = items.map((i) => i.id);
      if (newIds.length > 0) {
        const placeholders = newIds.map(() => "?").join(",");
        db.prepare(`delete from admin_projects where id not in (${placeholders})`).run(...newIds);
      } else {
        db.prepare("delete from admin_projects").run();
      }

      const upsert = db.prepare(`
        insert or replace into admin_projects (id, title, category, tech, url, description, image_data, tags, date, updated_at)
        values (@id, @title, @category, @tech, @url, @description, @imageData, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        upsert.run({
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
    db.prepare(`
      insert or replace into admin_about (id, name, role, avatar, bio, description, philosophy, skills, updated_at)
      values ('about', @name, @role, @avatar, @bio, @description, @philosophy, @skills, @updatedAt)
    `).run({
      name: normalized.name,
      role: normalized.role,
      avatar: normalized.avatar,
      bio: normalized.bio,
      description: normalized.description,
      philosophy: JSON.stringify(normalized.philosophy),
      skills: JSON.stringify(normalized.skills),
      updatedAt: normalized.updatedAt ? normalized.updatedAt.toISOString() : null,
    });
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
      const newIds = items.map((i) => i.id);
      if (newIds.length > 0) {
        const placeholders = newIds.map(() => "?").join(",");
        db.prepare(`delete from admin_gallery where id not in (${placeholders})`).run(...newIds);
      } else {
        db.prepare("delete from admin_gallery").run();
      }

      const upsert = db.prepare(`
        insert or replace into admin_gallery (id, title, image_data, description, category, tags, date, updated_at)
        values (@id, @title, @imageData, @description, @category, @tags, @date, @updatedAt)
      `);
      items.forEach((item) => {
        upsert.run({
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

export async function readContentHome(options?: ContentStoreOptions): Promise<DomainHome> {
  return withDatabase(options, (db) => {
    const row = db.prepare("select generated_date, guidance, hero_title, hero_lead, quote_text, quote_author, updated_at from admin_home limit 1").get();
    return row ? rowToHome(row as HomeRow) : normalizeHome({});
  });
}

export async function writeContentHome(home: unknown, options?: ContentStoreOptions): Promise<DomainHome> {
  const normalized = normalizeHome(home);

  withDatabase(options, (db) => {
    db.prepare(`
      insert or replace into admin_home (id, generated_date, guidance, hero_title, hero_lead, quote_text, quote_author, updated_at)
      values ('home', @generatedDate, @guidance, @heroTitle, @heroLead, @quoteText, @quoteAuthor, @updatedAt)
    `).run({
      generatedDate: normalized.generatedDate,
      guidance: normalized.guidance,
      heroTitle: normalized.heroTitle,
      heroLead: normalized.heroLead,
      quoteText: normalized.quoteText,
      quoteAuthor: normalized.quoteAuthor,
      updatedAt: normalized.updatedAt ? normalized.updatedAt.toISOString() : null,
    });
  });

  return normalized;
}
