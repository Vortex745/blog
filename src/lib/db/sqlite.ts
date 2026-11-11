import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { getSqliteConfig, type SqliteConfig } from "./config";

export type BlogDatabase = Database.Database;

export type OpenBlogDatabaseOptions = Partial<SqliteConfig>;

function ensureParentDirectory(dbPath: string) {
  if (dbPath === ":memory:") return;
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

export function initializeBlogDatabase(db: BlogDatabase) {
  db.exec(`
    create table if not exists admin_articles (
      id text primary key,
      title text not null default '',
      content text not null default '',
      description text not null default '',
      cover_image text not null default '',
      tags text not null default '[]',
      date text not null,
      updated_at text
    );

    create table if not exists admin_projects (
      id text primary key,
      title text not null default '',
      category text not null default '',
      tech text not null default '',
      url text not null default '',
      description text not null default '',
      image_data text not null default '',
      tags text not null default '[]',
      date text not null,
      updated_at text
    );

    create table if not exists admin_about (
      id text primary key,
      name text not null default '',
      role text not null default '',
      avatar text not null default '',
      bio text not null default '',
      description text not null default '',
      philosophy text not null default '[]',
      skills text not null default '[]',
      updated_at text
    );

    create table if not exists admin_home (
      id text primary key,
      generated_date text not null default '',
      guidance text not null default '',
      hero_title text not null default '',
      hero_lead text not null default '',
      quote_text text not null default '',
      quote_author text not null default '',
      updated_at text
    );

    create table if not exists admin_gallery (
      id text primary key,
      title text not null default '',
      image_data text not null default '',
      description text not null default '',
      category text not null default '',
      tags text not null default '[]',
      date text not null,
      updated_at text
    );
  `);
}

export function openBlogDatabase(options: OpenBlogDatabaseOptions = {}): BlogDatabase {
  const config = getSqliteConfig(options);
  ensureParentDirectory(config.dbPath);

  const db = new Database(config.dbPath);
  db.pragma("foreign_keys = ON");
  if (config.dbPath !== ":memory:") db.pragma("journal_mode = WAL");
  initializeBlogDatabase(db);
  return db;
}

const sharedDbCache = new Map<string, BlogDatabase>();

export function getSharedDatabase(options: OpenBlogDatabaseOptions = {}): BlogDatabase {
  const config = getSqliteConfig(options);
  const key = config.dbPath;

  const cached = sharedDbCache.get(key);
  if (cached) return cached;

  const db = openBlogDatabase(options);
  sharedDbCache.set(key, db);
  return db;
}

export function closeSharedDatabases(): void {
  for (const db of sharedDbCache.values()) {
    try { db.close(); } catch { /* ignore */ }
  }
  sharedDbCache.clear();
}

export function sqliteStorageConfigured(): boolean {
  return true;
}
