export type ContentKey = { id: string; title: string };

/**
 * Keep candidates whose (id, title) pair collides with neither of the taken
 * keys. This is the merge rule shared by /api/search, RSS and the sitemap so
 * static and SQLite content coexist without duplicate entries.
 */
export function uniqueByContentKey<T>(
  candidates: readonly T[],
  keyOf: (item: T) => ContentKey,
  taken: readonly ContentKey[],
): T[] {
  const ids = new Set(taken.map((key) => key.id));
  const titles = new Set(taken.map((key) => key.title));
  return candidates.filter((item) => {
    const key = keyOf(item);
    return !ids.has(key.id) && !titles.has(key.title);
  });
}
