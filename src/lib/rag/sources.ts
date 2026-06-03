import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import {
  articleDate,
  articleSummary,
  articleTags,
  normalizeAbout,
  projectDate,
  projectTags,
  readContentAbout,
  readContentArticles,
  readContentProjects,
  type ContentArticle,
  type ContentProject,
} from "../content-store";
import { cleanDocumentText } from "./clean";
import type { RagDocument, RagSourceType } from "./types";

export type CollectRagDocumentsOptions = {
  dbPath?: string;
  contentRoot?: string;
};

function cleanSlug(value: string) {
  return value.replace(/\\/g, "/").replace(/\.mdx?$/i, "");
}

function parseFrontmatter(markdown: string) {
  if (!markdown.startsWith("---")) return { data: {} as Record<string, unknown>, body: markdown };
  const end = markdown.indexOf("\n---", 3);
  if (end < 0) return { data: {} as Record<string, unknown>, body: markdown };

  const raw = markdown.slice(3, end).trim();
  const data: Record<string, unknown> = {};
  for (const line of raw.split("\n")) {
    const match = line.match(/^([A-Za-z0-9_-]+):\s*(.*)$/);
    if (!match) continue;
    const value = match[2].trim();
    if (value.startsWith("[") && value.endsWith("]")) {
      data[match[1]] = value
        .slice(1, -1)
        .split(",")
        .map((item) => item.trim().replace(/^["']|["']$/g, ""))
        .filter(Boolean);
    } else {
      data[match[1]] = value.replace(/^["']|["']$/g, "");
    }
  }

  return { data, body: markdown.slice(end + 4).trim() };
}

function walkMarkdownFiles(dir: string): string[] {
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) return walkMarkdownFiles(fullPath);
    return /\.mdx?$/i.test(entry.name) ? [fullPath] : [];
  });
}

function tagsFromFrontmatter(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function markdownDocuments(root: string, sourceType: Extract<RagSourceType, "article" | "project">): RagDocument[] {
  const baseDir = path.join(root, sourceType === "article" ? "articles" : "projects");
  return walkMarkdownFiles(baseDir).map((filePath) => {
    const raw = readFileSync(filePath, "utf8");
    const { data, body } = parseFrontmatter(raw);
    const sourceId = cleanSlug(path.relative(baseDir, filePath));
    const title = String(data.title || sourceId).trim();
    const tags = tagsFromFrontmatter(data.tags);
    const url = sourceType === "article" ? `/articles/${sourceId}` : `/projects/${sourceId}`;

    return {
      id: `${sourceType}:${sourceId}`,
      sourceType,
      sourceId,
      title,
      url,
      content: body,
      cleanContent: cleanDocumentText({ content: body }),
      metadata: {
        title,
        url,
        tags,
        date: data.date ? new Date(String(data.date)).toISOString() : undefined,
        description: data.description,
        origin: "content",
      },
    };
  });
}

function articleDocument(article: ContentArticle, index: number): RagDocument {
  const sourceId = String(article.id || article.title || index);
  const title = article.title || "未命名文章";
  const content = article.content || article.description || articleSummary(article);
  return {
    id: `article:${sourceId}`,
    sourceType: "article",
    sourceId,
    title,
    url: `/articles/local-${encodeURIComponent(sourceId)}`,
    content,
    cleanContent: cleanDocumentText({ content }),
    metadata: {
      title,
      tags: articleTags(article),
      date: articleDate(article).toISOString(),
      description: articleSummary(article),
      origin: "sqlite",
    },
  };
}

function projectDocument(project: ContentProject, index: number): RagDocument {
  const sourceId = String(project.id || project.title || index);
  const title = project.title || "未命名项目";
  const content = project.description || "";
  return {
    id: `project:${sourceId}`,
    sourceType: "project",
    sourceId,
    title,
    url: `/projects/local-${encodeURIComponent(sourceId)}`,
    content,
    cleanContent: cleanDocumentText({ content }),
    metadata: {
      title,
      tags: projectTags(project),
      date: projectDate(project).toISOString(),
      description: project.description,
      origin: "sqlite",
    },
  };
}

export async function collectRagDocuments(options: CollectRagDocumentsOptions = {}): Promise<RagDocument[]> {
  const contentRoot = options.contentRoot ?? path.resolve(process.cwd(), "src/content");
  const [articles, projects, about] = await Promise.all([
    readContentArticles({ dbPath: options.dbPath }).catch(() => []),
    readContentProjects({ dbPath: options.dbPath }).catch(() => []),
    readContentAbout({ dbPath: options.dbPath }).catch(() => null),
  ]);
  const profile = normalizeAbout(about ?? {});
  const aboutContent = [
    profile.name,
    profile.role,
    profile.bio,
    profile.description,
    ...(profile.philosophy ?? []),
    ...(profile.skills ?? []),
  ].filter(Boolean).join("\n\n");

  const documents = [
    ...markdownDocuments(contentRoot, "article"),
    ...markdownDocuments(contentRoot, "project"),
    ...articles.map(articleDocument),
    ...projects.map(projectDocument),
  ];

  if (aboutContent.trim()) {
    documents.push({
      id: "about:profile",
      sourceType: "about",
      sourceId: "profile",
      title: profile.name || "个人介绍",
      url: "/about",
      content: aboutContent,
      cleanContent: cleanDocumentText({ content: aboutContent }),
      metadata: {
        title: profile.name || "个人介绍",
        tags: profile.skills ?? [],
        origin: "sqlite",
      },
    });
  }

  return documents.filter((document) => document.cleanContent || document.content);
}
