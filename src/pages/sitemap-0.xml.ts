import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { readContentArticles, readContentProjects } from "../lib/content-store";
import { uniqueByContentKey, type ContentKey } from "../lib/content-merge";

/**
 * On-demand sitemap: static pages plus every published article and project
 * from both the static collections and the admin-managed SQLite store.
 * Admin routes stay out — they are behind authentication and not indexable.
 */
const PUBLIC_PATHS = [
  "/",
  "/about/",
  "/archive/",
  "/articles/",
  "/articles/new/",
  "/gallery/",
  "/gallery/new/",
  "/projects/",
  "/projects/new/",
  "/search/",
];

function cleanSlug(id: string): string {
  return String(id || "").replace(/\.mdx?$/, "");
}

function escapeXml(value: string): string {
  return value.replace(/[&<>"']/g, (char) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] as string
  ));
}

function siteUrl(site: URL | undefined, path: string): string {
  const base = site?.toString().replace(/\/+$/, "") ?? "";
  return `${base}${encodeURI(path)}`;
}

export const GET: APIRoute = async ({ site }) => {
  const [staticArticles, staticProjects, sqliteArticles, sqliteProjects] = await Promise.all([
    getCollection("articles").catch(() => []),
    getCollection("projects").catch(() => []),
    readContentArticles().catch(() => []),
    readContentProjects().catch(() => []),
  ]);

  const publishedStaticArticles = staticArticles.filter((article) => !article.data.draft);
  const staticArticleKeys: ContentKey[] = publishedStaticArticles.map((article) => ({
    id: cleanSlug(article.id),
    title: article.data.title,
  }));
  const staticProjectKeys: ContentKey[] = staticProjects.map((project) => ({
    id: cleanSlug(project.id),
    title: project.data.title,
  }));

  const entries: Array<{ loc: string; lastmod?: string }> = PUBLIC_PATHS.map((path) => ({
    loc: siteUrl(site, path),
  }));

  for (const article of publishedStaticArticles) {
    entries.push({
      loc: siteUrl(site, `/articles/${cleanSlug(article.id)}/`),
      lastmod: article.data.date.toISOString(),
    });
  }
  for (const article of uniqueByContentKey(
    sqliteArticles,
    (item) => ({ id: String(item.id || ""), title: String(item.title || "") }),
    staticArticleKeys,
  )) {
    entries.push({
      loc: siteUrl(site, `/articles/local-${encodeURIComponent(String(article.id || article.title || ""))}`),
      lastmod: (article.updatedAt ?? article.date).toISOString(),
    });
  }

  for (const project of staticProjects) {
    entries.push({
      loc: siteUrl(site, `/projects/${cleanSlug(project.id)}/`),
      lastmod: project.data.date.toISOString(),
    });
  }
  for (const project of uniqueByContentKey(
    sqliteProjects,
    (item) => ({ id: String(item.id || ""), title: String(item.title || "") }),
    staticProjectKeys,
  )) {
    entries.push({
      loc: siteUrl(site, `/projects/local-${encodeURIComponent(String(project.id || project.title || ""))}`),
      lastmod: (project.updatedAt ?? project.date).toISOString(),
    });
  }

  entries.sort((a, b) => a.loc.localeCompare(b.loc));

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...entries.map((entry) =>
      `<url><loc>${escapeXml(entry.loc)}</loc>${entry.lastmod ? `<lastmod>${entry.lastmod}</lastmod>` : ""}</url>`,
    ),
    "</urlset>",
  ].join("");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
