import type { BlogDatabase } from "../db/sqlite";
import { getSharedDatabase } from "../db/sqlite";
import { getAssistantAiConfig } from "../ai/config";
import { cleanDocumentWithAi } from "./clean";
import { documentMetadata, hybridChunkDocument, type HybridChunkOptions } from "./chunkers";
import { embedTextsWithAi, type EmbedTexts } from "./embeddings";
import { sha256 } from "./hash";
import { collectRagDocuments } from "./sources";
import type { RagChunk, RagDocument } from "./types";

export type IndexRagDocumentsOptions = {
  db?: BlogDatabase;
  dbPath?: string;
  embeddingDimensions?: number;
  embeddingModel?: string;
  documents?: RagDocument[];
  embedTexts?: EmbedTexts;
  chunkOptions?: HybridChunkOptions;
  cleanWithAi?: boolean;
};

export type IndexRagDocumentsResult = {
  documentCount: number;
  chunkCount: number;
  embeddingModel: string;
};

function insertDocument(db: BlogDatabase, document: RagDocument) {
  db.prepare(`
    insert into rag_documents (
      id, source_type, source_id, title, url, content, clean_content, metadata_json, content_hash, updated_at
    )
    values (@id, @sourceType, @sourceId, @title, @url, @content, @cleanContent, @metadata, @contentHash, @updatedAt)
  `).run({
    id: document.id,
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    title: document.title,
    url: document.url,
    content: document.content,
    cleanContent: document.cleanContent,
    metadata: JSON.stringify(documentMetadata(document)),
    contentHash: sha256(document.cleanContent || document.content),
    updatedAt: new Date().toISOString(),
  });
}

function insertChunk(db: BlogDatabase, chunk: RagChunk, embedding: number[], embeddingModel: string) {
  const result = db.prepare(`
    insert into rag_chunks (
      chunk_key, document_id, chunk_index, strategy, title, text, tags, metadata_json,
      token_count, content_hash, embedding_model, embedding_json, created_at
    )
    values (
      @chunkKey, @documentId, @chunkIndex, @strategy, @title, @text, @tags, @metadata,
      @tokenCount, @contentHash, @embeddingModel, @embedding, @createdAt
    )
  `).run({
    chunkKey: chunk.chunkKey,
    documentId: chunk.documentId,
    chunkIndex: chunk.chunkIndex,
    strategy: chunk.strategy,
    title: chunk.title,
    text: chunk.text,
    tags: JSON.stringify(chunk.tags),
    metadata: JSON.stringify(chunk.metadata),
    tokenCount: chunk.tokenCount,
    contentHash: chunk.contentHash,
    embeddingModel,
    embedding: JSON.stringify(embedding),
    createdAt: new Date().toISOString(),
  });

  const id = Number(result.lastInsertRowid);
  db.prepare(`
    insert into rag_chunks_fts (rowid, chunk_key, document_id, title, text, tags, metadata)
    values (?, ?, ?, ?, ?, ?, ?)
  `).run(id, chunk.chunkKey, chunk.documentId, chunk.title, chunk.text, chunk.tags.join(" "), JSON.stringify(chunk.metadata));
  db.prepare("insert into rag_chunk_vectors (rowid, embedding) values (?, ?)")
    .run(BigInt(id), JSON.stringify(embedding));
}

async function prepareDocuments(options: IndexRagDocumentsOptions): Promise<RagDocument[]> {
  const documents = options.documents ?? await collectRagDocuments({ dbPath: options.dbPath });
  if (!options.cleanWithAi) return documents;
  return Promise.all(documents.map(cleanDocumentWithAi));
}

export async function indexRagDocuments(options: IndexRagDocumentsOptions = {}): Promise<IndexRagDocumentsResult> {
  const config = getAssistantAiConfig();
  const embeddingModel = options.embeddingModel || config.embeddingModel;
  const documents = await prepareDocuments(options);

  const db = options.db ?? getSharedDatabase({
    dbPath: options.dbPath,
    embeddingDimensions: options.embeddingDimensions ?? config.embeddingDimensions,
  });

  // Compute new content hashes
  const newHashes = new Map(documents.map((d) => [d.id, sha256(d.cleanContent || d.content)]));

  // Find existing hashes to determine what changed
  const existingRows = db.prepare("select id, content_hash from rag_documents").all() as Array<{ id: string; content_hash: string }>;
  const existingHashes = new Map(existingRows.map((r) => [r.id, r.content_hash]));

  const changedIds = new Set<string>();
  const removedIds = new Set(existingHashes.keys());

  for (const [id, hash] of newHashes) {
    removedIds.delete(id);
    if (existingHashes.get(id) !== hash) {
      changedIds.add(id);
    }
  }

  // If all documents are new or changed, or if any were removed, do full rebuild
  const needsFullRebuild = changedIds.size === documents.length || removedIds.size > 0;

  if (!needsFullRebuild && changedIds.size === 0) {
    return {
      documentCount: documents.length,
      chunkCount: db.prepare("select count(*) as c from rag_chunks").get() as number ? (db.prepare("select count(*) as c from rag_chunks").get() as { c: number }).c : 0,
      embeddingModel,
    };
  }

  const docsToIndex = needsFullRebuild ? documents : documents.filter((d) => changedIds.has(d.id));
  const chunks = docsToIndex.flatMap((document) => hybridChunkDocument(document, options.chunkOptions));
  const embedTexts = options.embedTexts ?? ((texts: string[]) => embedTextsWithAi(texts, embeddingModel));
  const embeddings = await embedTexts(chunks.map((chunk) => chunk.text));

  try {
    if (needsFullRebuild) {
      db.transaction(() => {
        db.prepare("delete from rag_chunk_vectors").run();
        db.prepare("delete from rag_chunks_fts").run();
        db.prepare("delete from rag_chunks").run();
        db.prepare("delete from rag_documents").run();

        documents.forEach((document) => insertDocument(db, document));
        chunks.forEach((chunk, index) => insertChunk(db, chunk, embeddings[index], embeddingModel));
      })();
    } else {
      // Incremental: delete old chunks for changed docs, re-insert
      db.transaction(() => {
        for (const id of changedIds) {
          const chunkIds = db.prepare("select id from rag_chunks where document_id = ?").all(id) as Array<{ id: number }>;
          for (const { id: chunkId } of chunkIds) {
            db.prepare("delete from rag_chunk_vectors where rowid = ?").run(BigInt(chunkId));
            db.prepare("delete from rag_chunks_fts where rowid = ?").run(chunkId);
          }
          db.prepare("delete from rag_chunks where document_id = ?").run(id);
          db.prepare("delete from rag_documents where id = ?").run(id);
        }

        docsToIndex.forEach((document) => insertDocument(db, document));
        chunks.forEach((chunk, index) => insertChunk(db, chunk, embeddings[index], embeddingModel));
      })();
    }
  } finally {
    // Shared connection — lifecycle managed by getSharedDatabase
  }

  return {
    documentCount: documents.length,
    chunkCount: chunks.length,
    embeddingModel,
  };
}
