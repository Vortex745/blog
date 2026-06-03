export type RagSourceType = "article" | "project" | "about";

export type RagMetadata = Record<string, unknown> & {
  sourceType?: RagSourceType;
  sourceId?: string;
  title?: string;
  url?: string;
  tags?: string[];
  date?: string;
};

export type RagDocument = {
  id: string;
  sourceType: RagSourceType;
  sourceId: string;
  title: string;
  url: string;
  content: string;
  cleanContent: string;
  metadata: RagMetadata;
};

export type RagChunkStrategy = "semantic" | "sliding" | "fixed";

export type RagChunk = {
  chunkKey: string;
  documentId: string;
  chunkIndex: number;
  strategy: RagChunkStrategy;
  title: string;
  text: string;
  tags: string[];
  metadata: RagMetadata & {
    sourceType: RagSourceType;
    sourceId: string;
    chunkStrategy: RagChunkStrategy;
  };
  tokenCount: number;
  contentHash: string;
};

export type RagSearchItem = {
  id: number;
  chunkKey: string;
  documentId: string;
  title: string;
  text: string;
  tags: string[];
  metadata: RagMetadata;
  vectorScore?: number;
  bm25Score?: number;
  rrfScore: number;
};

export type RagContext = {
  query: string;
  rewrittenQuery: string;
  items: RagSearchItem[];
  contextText: string;
};
