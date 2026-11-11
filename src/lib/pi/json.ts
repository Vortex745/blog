import { parseJsonWithRepair } from "@earendil-works/pi-ai";

/**
 * Extract the first JSON object from model output that may wrap it in prose
 * or code fences. Returns undefined when no parseable object is present;
 * callers fall back to their pre-pi degradation behavior.
 */
export function extractJsonObject<T>(text: string): T | undefined {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) return undefined;
  try {
    const value = parseJsonWithRepair<unknown>(text.slice(start, end + 1));
    if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
    return value as T;
  } catch {
    return undefined;
  }
}
