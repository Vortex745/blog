/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly IMGBB_API_KEY?: string;
  readonly SQLITE_DB_PATH?: string;
  readonly ADMIN_USERNAME?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly LLM_API_KEY?: string;
  readonly GITHUB_TOKEN?: string;
  readonly AI_CHAT_MODEL?: string;
  readonly AI_CHAT_TEMPERATURE?: string;
  readonly AI_GATEWAY_API_KEY?: string;
  readonly AI_EMBEDDING_MODEL?: string;
  readonly AI_EMBEDDING_DIMENSIONS?: string;
  readonly AI_RERANK_MODEL?: string;
  readonly RAG_ENABLE_AI_CLEANING?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
