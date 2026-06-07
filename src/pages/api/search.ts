import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readContentArticles, readContentProjects, hasAnyContent } from "../../lib/content-store";
import { jsonResponse } from "../../lib/api-utils";

export const GET: APIRoute = async ({ url }) => {
  const q = (url.searchParams.get("q") || "").trim().toLowerCase();
  const type = url.searchParams.get("type") || "all";
  const year = url.searchParams.get("year") || "all";

  const [allArticles, allProjects] = await Promise.all([
    getCollection("articles").then((a) => a.filter((x) => !x.data.draft)),
    getCollection("projects"),
  ]);

  const hasSqlite = hasAnyContent();
  const [sqliteArticles, sqliteProjects] = hasSqlite
    ? await Promise.all([
        readContentArticles().catch(() => []),
        readContentProjects().catch(() => []),
      ])
    : [[], []];

  function cleanSlug(id: string) {
    return id.replace(/\.mdx?$/, "");
  }

  const localArticleIds = new Set(allArticles.map((a) => cleanSlug(a.id)));
  const localArticleTitles = new Set(allArticles.map((a) => a.data.title));
  const localProjectIds = new Set(allProjects.map((p) => cleanSlug(p.id)));
  const localProjectTitles = new Set(allProjects.map((p) => p.data.title));

  const uniqueSqliteArticles = sqliteArticles.filter((a) => {
    const id = String(a.id || "");
    const title = String(a.title || "");
    return !localArticleIds.has(id) && !localArticleTitles.has(title);
  });

  const uniqueSqliteProjects = sqliteProjects.filter((p) => {
    const id = String(p.id || "");
    const title = String(p.title || "");
    return !localProjectIds.has(id) && !localProjectTitles.has(title);
  });

  const articles = [
    ...allArticles.map((a) => ({
      id: cleanSlug(a.id),
      title: a.data.title,
      description: a.data.description,
      date: a.data.date.toISOString(),
      tags: a.data.tags,
      type: "article" as const,
      url: `/articles/${cleanSlug(a.id)}/`,
    })),
    ...uniqueSqliteArticles.map((a) => ({
      id: `local-${a.id || a.title || ""}`,
      title: a.title || "",
      description: a.description || "无简介",
      date: a.date.toISOString(),
      tags: a.tags,
      type: "article" as const,
      url: `/articles/local-${encodeURIComponent(a.id || a.title || "")}`,
    })),
  ];

  const projects = [
    ...allProjects.map((p) => ({
      id: cleanSlug(p.id),
      title: p.data.title,
      description: p.data.description,
      date: p.data.date.toISOString(),
      tags: p.data.tags,
      type: "project" as const,
      url: `/projects/${cleanSlug(p.id)}/`,
    })),
    ...uniqueSqliteProjects.map((p) => ({
      id: `local-${p.id || p.title || ""}`,
      title: p.title || "",
      description: p.description || "",
      date: p.date.toISOString(),
      tags: p.tags,
      type: "project" as const,
      url: `/projects/local-${encodeURIComponent(p.id || p.title || "")}`,
    })),
  ];

  let items = [...articles, ...projects];

  if (q) {
    items = items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.tags.some((tag) => tag.toLowerCase().includes(q)),
    );
  }

  if (type !== "all") {
    items = items.filter((item) => item.type === type);
  }

  if (year !== "all") {
    items = items.filter((item) => new Date(item.date).getFullYear().toString() === year);
  }

  return jsonResponse({ ok: true, items, total: items.length });
};
