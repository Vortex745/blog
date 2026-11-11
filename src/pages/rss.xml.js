import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { readContentArticles, readContentProjects } from "../lib/content-store";
import { uniqueByContentKey } from "../lib/content-merge";

function cleanSlug(id) {
  return String(id || "").replace(/\.mdx?$/, "");
}

export async function GET(context) {
  const [staticArticles, staticProjects, sqliteArticles, sqliteProjects] = await Promise.all([
    getCollection("articles").catch(() => []),
    getCollection("projects").catch(() => []),
    readContentArticles().catch(() => []),
    readContentProjects().catch(() => []),
  ]);

  // Admin-published content lives in SQLite; include it alongside the static
  // collections without duplicating entries (same merge rules as /api/search
  // and the sitemap).
  const staticArticleKeys = staticArticles.map((article) => ({
    id: cleanSlug(article.id),
    title: article.data.title,
  }));
  const staticProjectKeys = staticProjects.map((project) => ({
    id: cleanSlug(project.id),
    title: project.data.title,
  }));

  const uniqueSqliteArticles = uniqueByContentKey(
    sqliteArticles,
    (article) => ({ id: String(article.id || ""), title: String(article.title || "") }),
    staticArticleKeys,
  );
  const uniqueSqliteProjects = uniqueByContentKey(
    sqliteProjects,
    (project) => ({ id: String(project.id || ""), title: String(project.title || "") }),
    staticProjectKeys,
  );

  const items = [
    ...staticArticles.map((article) => ({
      title: article.data.title,
      description: article.data.description,
      pubDate: article.data.date,
      link: `/articles/${cleanSlug(article.id)}/`,
    })),
    ...uniqueSqliteArticles.map((article) => ({
      title: article.title,
      description: article.description || article.summary || "",
      pubDate: article.date,
      link: `/articles/local-${encodeURIComponent(article.id || article.title || "")}`,
    })),
    ...staticProjects.map((project) => ({
      title: project.data.title,
      description: project.data.description,
      pubDate: project.data.date,
      link: `/projects/${cleanSlug(project.id)}/`,
    })),
    ...uniqueSqliteProjects.map((project) => ({
      title: project.title,
      description: project.description || "",
      pubDate: project.date,
      link: `/projects/local-${encodeURIComponent(project.id || project.title || "")}`,
    })),
  ];

  items.sort((a, b) => b.pubDate.getTime() - a.pubDate.getTime());

  return rss({
    title: "子衿的个人博客网站",
    description: "子衿的个人博客 — 技术、设计、生活的思考",
    site: context.site,
    items,
    customData: "<language>zh-CN</language>",
  });
}
