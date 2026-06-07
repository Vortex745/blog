import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { load as loadSqliteVec } from "sqlite-vec";
import { getSqliteConfig, type SqliteConfig } from "./config";

export type BlogDatabase = Database.Database;

export type OpenBlogDatabaseOptions = Partial<SqliteConfig>;

function ensureParentDirectory(dbPath: string) {
  if (dbPath === ":memory:") return;
  mkdirSync(path.dirname(dbPath), { recursive: true });
}

function checkedDimensions(value: number) {
  if (!Number.isInteger(value) || value < 1 || value > 4096) {
    throw new Error(`Invalid AI_EMBEDDING_DIMENSIONS: ${value}`);
  }
  return value;
}

export function initializeBlogDatabase(db: BlogDatabase, options: Pick<SqliteConfig, "embeddingDimensions">) {
  const dimensions = checkedDimensions(options.embeddingDimensions);

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

    create table if not exists rag_documents (
      id text primary key,
      source_type text not null,
      source_id text not null,
      title text not null,
      url text not null default '',
      content text not null,
      clean_content text not null,
      metadata_json text not null default '{}',
      content_hash text not null,
      updated_at text not null
    );

    create table if not exists rag_chunks (
      id integer primary key autoincrement,
      chunk_key text not null unique,
      document_id text not null references rag_documents(id) on delete cascade,
      chunk_index integer not null,
      strategy text not null,
      title text not null,
      text text not null,
      tags text not null default '[]',
      metadata_json text not null default '{}',
      token_count integer not null default 0,
      content_hash text not null,
      embedding_model text,
      embedding_json text,
      created_at text not null
    );

    create virtual table if not exists rag_chunks_fts using fts5(
      chunk_key unindexed,
      document_id unindexed,
      title,
      text,
      tags,
      metadata
    );
  `);

  db.exec(`create virtual table if not exists rag_chunk_vectors using vec0(embedding float[${dimensions}])`);
}

export function openBlogDatabase(options: OpenBlogDatabaseOptions = {}): BlogDatabase {
  const config = getSqliteConfig(options);
  ensureParentDirectory(config.dbPath);

  const db = new Database(config.dbPath);
  db.pragma("foreign_keys = ON");
  if (config.dbPath !== ":memory:") db.pragma("journal_mode = WAL");
  loadSqliteVec(db);
  initializeBlogDatabase(db, config);
  return db;
}

export function sqliteStorageConfigured(): boolean {
  return true;
}
