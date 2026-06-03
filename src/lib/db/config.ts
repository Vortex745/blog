import path from "node:path";
import { readNumberServerEnv, readServerEnv } from "../env";

const DEFAULT_SQLITE_DB_PATH = "data/blog.sqlite";
const DEFAULT_EMBEDDING_DIMENSIONS = 1536;

export type SqliteConfig = {
  dbPath: string;
  embeddingDimensions: number;
};

export function resolveSqliteDbPath(dbPath?: string): string {
  const configured = dbPath || readServerEnv("SQLITE_DB_PATH") || DEFAULT_SQLITE_DB_PATH;
  if (configured === ":memory:") return configured;
  return path.isAbsolute(configured) ? configured : path.resolve(process.cwd(), configured);
}

export function getSqliteConfig(options: Partial<SqliteConfig> = {}): SqliteConfig {
  return {
    dbPath: resolveSqliteDbPath(options.dbPath),
    embeddingDimensions:
      options.embeddingDimensions ?? readNumberServerEnv("AI_EMBEDDING_DIMENSIONS", DEFAULT_EMBEDDING_DIMENSIONS),
  };
}
