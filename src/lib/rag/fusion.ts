export type RankedItem<T> = T & { id: number };

export function reciprocalRankFusion<T extends { id: number }>(
  rankedLists: T[][],
  k = 60,
): Array<T & { rrfScore: number }> {
  const merged = new Map<number, T & { rrfScore: number }>();

  for (const list of rankedLists) {
    list.forEach((item, index) => {
      const current = merged.get(item.id) ?? { ...item, rrfScore: 0 };
      current.rrfScore += 1 / (k + index + 1);
      merged.set(item.id, current);
    });
  }

  return [...merged.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}
