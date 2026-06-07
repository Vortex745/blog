/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SQLITE_DB_PATH?: string;
  /** Optional: override default upload directory (public/uploads) */
  readonly UPLOAD_DIR?: string;
  readonly ADMIN_USERNAME?: string;
  readonly ADMIN_PASSWORD?: string;
  readonly LLM_API_KEY?: string;
  readonly LLM_BASE_URL?: string;
  readonly LLM_MODEL?: string;
  readonly GITHUB_TOKEN?: string;
  readonly AI_CHAT_MODEL?: string;
  readonly AI_CHAT_TEMPERATURE?: string;
  readonly AI_GATEWAY_API_KEY?: string;
  readonly AI_EMBEDDING_MODEL?: string;
  readonly AI_EMBEDDING_DIMENSIONS?: string;
  readonly AI_RERANK_MODEL?: string;
  readonly RAG_ENABLE_AI_CLEANING?: string;
  readonly EMBEDDING_API_KEY?: string;
  readonly EMBEDDING_BASE_URL?: string;
  readonly EMBEDDING_MODEL?: string;
  readonly RERANK_API_KEY?: string;
  readonly RERANK_BASE_URL?: string;
  readonly RERANK_MODEL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
