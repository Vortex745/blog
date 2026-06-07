import type { BlogDatabase } from "../db/sqlite";
import { getSharedDatabase } from "../db/sqlite";
import { getAssistantAiConfig } from "../ai/config";
import { buildRagContext } from "./context";
import { embedQueryWithAi, type EmbedQuery } from "./embeddings";
import { reciprocalRankFusion } from "./fusion";
import { rerankRagItems } from "./rerank";
import { rewriteRagQuery } from "./rewrite";
import type { RagContext, RagMetadata, RagSearchItem } from "./types";

export type RetrieveRagContextOptions = {
  db?: BlogDatabase;
  dbPath?: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  embedQuery?: EmbedQuery;
  skipAiRewrite?: boolean;
  skipAiRerank?: boolean;
  limit?: number;
};

type ChunkRow = {
  id: number;
  chunk_key: string;
  document_id: string;
  title: string;
  text: string;
  tags: string;
  metadata_json: string;
  distance?: number;
  bm25?: number;
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function rowToItem(row: ChunkRow, scores: Partial<Pick<RagSearchItem, "vectorScore" | "bm25Score">>): RagSearchItem {
  return {
    id: row.id,
    chunkKey: row.chunk_key,
    documentId: row.document_id,
    title: row.title,
    text: row.text,
    tags: parseJson<string[]>(row.tags, []),
    metadata: parseJson<RagMetadata>(row.metadata_json, {}),
    vectorScore: scores.vectorScore,
    bm25Score: scores.bm25Score,
    rrfScore: 0,
  };
}

function ftsQuery(query: string): string {
  const tokens = query
    .replace(/[^\p{L}\p{N}_\s-]/gu, " ")
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0)
    .slice(0, 8);

  return tokens.length > 0 ? tokens.map((token) => `"${token.replace(/"/g, '""')}"`).join(" OR ") : "\"\"";
}

function vectorSearch(db: BlogDatabase, embedding: number[], limit: number): RagSearchItem[] {
  const rows = db.prepare(`
    select c.id, c.chunk_key, c.document_id, c.title, c.text, c.tags, c.metadata_json, v.distance
    from rag_chunk_vectors v
    join rag_chunks c on c.id = v.rowid
    where v.embedding match ? and v.k = ?
    order by v.distance
  `).all(JSON.stringify(embedding), limit) as ChunkRow[];

  return rows.map((row) => rowToItem(row, { vectorScore: row.distance }));
}

function bm25Search(db: BlogDatabase, query: string, limit: number): RagSearchItem[] {
  const match = ftsQuery(query);
  if (match === "\"\"") return [];

  const rows = db.prepare(`
    select c.id, c.chunk_key, c.document_id, c.title, c.text, c.tags, c.metadata_json,
      bm25(rag_chunks_fts) as bm25
    from rag_chunks_fts
    join rag_chunks c on c.id = rag_chunks_fts.rowid
    where rag_chunks_fts match ?
    order by bm25(rag_chunks_fts)
    limit ?
  `).all(match, limit) as ChunkRow[];

  return rows.map((row) => rowToItem(row, { bm25Score: row.bm25 }));
}

export async function retrieveRagContext(query: string, options: RetrieveRagContextOptions = {}): Promise<RagContext> {
  const limit = options.limit ?? 6;
  const config = getAssistantAiConfig();
  const rewrittenQuery = options.skipAiRewrite ? query : await rewriteRagQuery(query);

  const db = options.db ?? getSharedDatabase({
    dbPath: options.dbPath,
    embeddingDimensions: options.embeddingDimensions ?? config.embeddingDimensions,
  });

  try {
    if (!options.embedQuery && !config.gatewayApiKey && !config.embeddingFallback) {
      const bm25Items = bm25Search(db, rewrittenQuery, limit);
      return buildRagContext(query, rewrittenQuery, bm25Items);
    }

    const embedQuery = options.embedQuery ?? ((value: string) => embedQueryWithAi(value, options.embeddingModel || config.embeddingModel));
    const embeddingPromise = embedQuery(rewrittenQuery);
    const bm25Items = bm25Search(db, rewrittenQuery, Math.max(limit * 4, 12));
    const embedding = await embeddingPromise;
    const vectorItems = vectorSearch(db, embedding, Math.max(limit * 4, 12));
    const fused = reciprocalRankFusion([vectorItems, bm25Items]).map((item) => ({
      ...item,
      rrfScore: item.rrfScore,
    }));
    const reranked = options.skipAiRerank ? fused.slice(0, limit) : await rerankRagItems(rewrittenQuery, fused, limit);
    return buildRagContext(query, rewrittenQuery, reranked);
  } catch {
    const bm25Items = bm25Search(db, rewrittenQuery, limit);
    return buildRagContext(query, rewrittenQuery, bm25Items);
  }
}
