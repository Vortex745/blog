import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

export const SENSITIVE_KEYS = [
  "AI_GATEWAY_API_KEY",
  "LLM_API_KEY",
  "EMBEDDING_API_KEY",
  "RERANK_API_KEY",
];

export const CONFIGURABLE_KEYS = [
  "AI_GATEWAY_API_KEY",
  "AI_CHAT_MODEL",
  "AI_CHAT_TEMPERATURE",
  "AI_EMBEDDING_MODEL",
  "AI_EMBEDDING_DIMENSIONS",
  "AI_RERANK_MODEL",
  "RAG_ENABLE_AI_CLEANING",
  "LLM_API_KEY",
  "LLM_BASE_URL",
  "LLM_MODEL",
  "EMBEDDING_API_KEY",
  "EMBEDDING_BASE_URL",
  "EMBEDDING_MODEL",
  "RERANK_API_KEY",
  "RERANK_BASE_URL",
  "RERANK_MODEL",
];

function resolveFilePath(filePath?: string): string {
  return filePath ?? join(process.cwd(), ".env");
}

export function readEnvFile(filePath?: string): Map<string, string> {
  const resolved = resolveFilePath(filePath);
  const map = new Map<string, string>();

  if (!existsSync(resolved)) {
    return map;
  }

  const content = readFileSync(resolved, "utf-8");
  const lines = content.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      continue;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    let value = trimmed.slice(eqIndex + 1).trim();

    if (
      value.startsWith('"') &&
      value.endsWith('"') &&
      value.length >= 2
    ) {
      value = value.slice(1, -1);
    }

    map.set(key, value);
  }

  return map;
}

export function writeEnvFile(
  updates: Record<string, string>,
  filePath?: string
): void {
  const resolved = resolveFilePath(filePath);
  const existingKeys = new Set<string>();
  let lines: string[] = [];

  if (existsSync(resolved)) {
    const content = readFileSync(resolved, "utf-8");
    lines = content.split(/\r?\n/);
  }

  const updatedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) {
      return line;
    }

    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) {
      return line;
    }

    const key = trimmed.slice(0, eqIndex).trim();
    if (key in updates) {
      existingKeys.add(key);
      const value = updates[key];
      return `${key}=${value.includes(" ") ? `"${value}"` : value}`;
    }

    return line;
  });

  const newKeys = Object.keys(updates).filter((k) => !existingKeys.has(k));
  for (const key of newKeys) {
    const value = updates[key];
    updatedLines.push(`${key}=${value.includes(" ") ? `"${value}"` : value}`);
  }

  const result = updatedLines.join("\n");
  writeFileSync(resolved, result, "utf-8");

  for (const [key, value] of Object.entries(updates)) {
    process.env[key] = value;
  }
}

export function maskSensitiveValues(
  values: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, value] of Object.entries(values)) {
    if (SENSITIVE_KEYS.includes(key)) {
      result[key] = value ? "true" : "false";
    } else {
      result[key] = value;
    }
  }

  return result;
}
