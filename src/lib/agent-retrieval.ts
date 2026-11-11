export type RetrievalItem = {
  id: string;
  title: string;
  description: string;
  tags: string[];
  date: string;
  url: string;
};

// 命中判定：整句 query 不区分大小写 includes（沿用 /api/search 语义）；
// 中文问题没有分词，追加回退——query 的任意连续两字出现在字段里即视为命中，
// 单字 query 按字匹配。两字窗口比逐字匹配明显更不易误命中。
function matchesItem(item: RetrievalItem, q: string): boolean {
  const haystacks = [item.title, item.description, ...item.tags].map((text) => text.toLowerCase());
  if (haystacks.some((text) => text.includes(q))) return true;
  const grams: string[] = [];
  for (let i = 0; i + 2 <= q.length; i++) grams.push(q.slice(i, i + 2));
  if (grams.length === 0) grams.push(q);
  return grams.some((gram) => haystacks.some((text) => text.includes(gram)));
}

// 纯函数：把站内内容按 query 过滤后渲染成组装给 bridge 的检索块。
export function retrieveSiteContext(
  content: { articles: RetrievalItem[]; projects: RetrievalItem[] },
  query: string,
  limit: number,
): string {
  const q = query.trim().toLowerCase();
  const items = [...content.articles, ...content.projects];
  const selected = (q ? items.filter((item) => matchesItem(item, q)) : items).slice(0, limit);
  const lines =
    selected.length > 0
      ? selected.map((item) => `- ${item.title} — ${item.url}`)
      : ["（未检索到站内内容）"];
  return ["[站内检索结果]", ...lines].join("\n");
}
