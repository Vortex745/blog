import { sha256 } from "./hash";
import type { RagChunk, RagChunkStrategy, RagDocument, RagMetadata } from "./types";

export type HybridChunkOptions = {
  semanticMaxChars?: number;
  slidingWindowWords?: number;
  slidingOverlapWords?: number;
  fixedSize?: number;
  fixedOverlap?: number;
};

const DEFAULT_OPTIONS: Required<HybridChunkOptions> = {
  semanticMaxChars: 900,
  slidingWindowWords: 140,
  slidingOverlapWords: 40,
  fixedSize: 900,
  fixedOverlap: 160,
};

function normalizeSpace(value: string): string {
  return value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function estimateTokenCount(value: string): number {
  const cjk = value.match(/[\u3400-\u9fff]/g)?.length ?? 0;
  const words = value.match(/[A-Za-z0-9_]+/g)?.length ?? 0;
  return Math.max(1, Math.ceil(cjk + words * 1.3));
}

function chunkKey(document: RagDocument, strategy: RagChunkStrategy, index: number, text: string): string {
  return `${document.id}:${strategy}:${index}:${sha256(text).slice(0, 12)}`;
}

function baseMetadata(document: RagDocument, strategy: RagChunkStrategy): RagChunk["metadata"] {
  return {
    ...document.metadata,
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    title: document.title,
    url: document.url,
    chunkStrategy: strategy,
  };
}

function makeChunk(document: RagDocument, strategy: RagChunkStrategy, index: number, text: string): RagChunk {
  const cleanText = normalizeSpace(text);
  const tags = Array.isArray(document.metadata.tags)
    ? document.metadata.tags.map((tag) => String(tag)).filter(Boolean)
    : [];

  return {
    chunkKey: chunkKey(document, strategy, index, cleanText),
    documentId: document.id,
    chunkIndex: index,
    strategy,
    title: document.title,
    text: cleanText,
    tags,
    metadata: baseMetadata(document, strategy),
    tokenCount: estimateTokenCount(cleanText),
    contentHash: sha256(cleanText),
  };
}

function splitSemanticSections(document: RagDocument, maxChars: number): string[] {
  const source = normalizeSpace(document.content || document.cleanContent);
  if (!source) return [];

  const sections: string[] = [];
  let current: string[] = [];

  for (const line of source.split("\n")) {
    if (/^#{1,4}\s+/.test(line.trim()) && current.length > 0) {
      sections.push(current.join("\n").trim());
      current = [line];
      continue;
    }
    current.push(line);
  }
  if (current.length > 0) sections.push(current.join("\n").trim());

  const chunks: string[] = [];
  let buffer = "";
  for (const section of sections.flatMap((item) => item.split(/\n{2,}/))) {
    const next = buffer ? `${buffer}\n\n${section}` : section;
    if (next.length > maxChars && buffer) {
      chunks.push(buffer);
      buffer = section;
    } else {
      buffer = next;
    }
  }
  if (buffer) chunks.push(buffer);

  return chunks.length > 0 ? chunks : [source];
}

function splitSlidingWindows(text: string, windowWords: number, overlapWords: number): string[] {
  const words = normalizeSpace(text).split(/\s+/).filter(Boolean);
  if (words.length === 0) return [];
  if (words.length <= windowWords) return [words.join(" ")];

  const chunks: string[] = [];
  const step = Math.max(1, windowWords - overlapWords);
  for (let start = 0; start < words.length; start += step) {
    chunks.push(words.slice(start, start + windowWords).join(" "));
    if (start + windowWords >= words.length) break;
  }
  return chunks;
}

function splitFixed(text: string, size: number, overlap: number): string[] {
  const source = normalizeSpace(text);
  if (!source) return [];
  if (source.length <= size) return [source];

  const chunks: string[] = [];
  const step = Math.max(1, size - overlap);
  for (let start = 0; start < source.length; start += step) {
    chunks.push(source.slice(start, start + size));
    if (start + size >= source.length) break;
  }
  return chunks;
}

function appendStrategyChunks(
  output: RagChunk[],
  seen: Set<string>,
  document: RagDocument,
  strategy: RagChunkStrategy,
  texts: string[],
) {
  for (const text of texts) {
    const cleanText = normalizeSpace(text);
    if (cleanText.length < 12) continue;

    const identity = `${strategy}:${cleanText}`;
    if (seen.has(identity)) continue;
    seen.add(identity);
    output.push(makeChunk(document, strategy, output.length, cleanText));
  }
}

export function hybridChunkDocument(document: RagDocument, options: HybridChunkOptions = {}): RagChunk[] {
  const settings = { ...DEFAULT_OPTIONS, ...options };
  const cleanContent = normalizeSpace(document.cleanContent || document.content);
  const chunks: RagChunk[] = [];
  const seen = new Set<string>();

  appendStrategyChunks(chunks, seen, document, "semantic", splitSemanticSections(document, settings.semanticMaxChars));
  appendStrategyChunks(
    chunks,
    seen,
    document,
    "sliding",
    splitSlidingWindows(cleanContent, settings.slidingWindowWords, settings.slidingOverlapWords),
  );
  appendStrategyChunks(chunks, seen, document, "fixed", splitFixed(cleanContent, settings.fixedSize, settings.fixedOverlap));

  return chunks.map((chunk, index) => ({
    ...chunk,
    chunkIndex: index,
    chunkKey: chunkKey(document, chunk.strategy, index, chunk.text),
  }));
}

export function documentMetadata(document: RagDocument): RagMetadata {
  return {
    ...document.metadata,
    sourceType: document.sourceType,
    sourceId: document.sourceId,
    title: document.title,
    url: document.url,
  };
}
