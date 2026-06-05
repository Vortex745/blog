import { stripMarkdown } from "./markdown";

export type DomainArticle = {
  id: string;
  title: string;
  content: string;
  description: string;
  summary: string;
  coverImage: string;
  tags: string[];
  date: Date;
  updatedAt?: Date;
  href: string;
};

export type DomainProject = {
  id: string;
  title: string;
  category: string;
  tech: string;
  url: string;
  description: string;
  coverImage: string;
  imageData: string;
  tags: string[];
  date: Date;
  updatedAt?: Date;
  href: string;
  githubUrl: string;
  demoUrl: string;
};

export type DomainAbout = {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  description: string;
  philosophy: string[];
  skills: string[];
  updatedAt?: Date;
};

export type DomainGallery = {
  id: string;
  title: string;
  imageData: string;
  description: string;
  category: string;
  tags: string[];
  date: Date;
  updatedAt?: Date;
};

function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  if (typeof value !== "string") return [];

  const trimmed = value.trim();
  if (!trimmed.startsWith("[") && !trimmed.startsWith("{")) return [];

  try {
    const parsed = JSON.parse(trimmed);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const parsed = parseJsonArray(value);
  if (parsed.length > 0) return splitTags(parsed);

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim().replace(/^#+/, "").trim())
    .filter(Boolean);
}

function splitMarkdownBlocks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  const parsed = parseJsonArray(value);
  if (parsed.length > 0) return splitMarkdownBlocks(parsed);

  return String(value ?? "")
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function imageUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return "";
}

export function articleSummary(description: string, content: string): string {
  const source = description.trim() || stripMarkdown(content.trim());
  return source.length > 140 ? `${source.slice(0, 140)}...` : source;
}

export function normalizeDomainArticle(article: any, index: number): DomainArticle | null {
  const title = String(article.title || "").trim();
  const content = String(article.content || "").trim();
  if (!title && !content) return null;

  const id = String(article.id || title || index).trim() || String(index);
  const description = String(article.description || "").trim();

  const parsedDate = article.date ? new Date(String(article.date)) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  
  const parsedUpdated = article.updatedAt ? new Date(String(article.updatedAt)) : undefined;
  const updatedAt = parsedUpdated && !Number.isNaN(parsedUpdated.getTime()) ? parsedUpdated : undefined;

  return {
    id,
    title: title || "未命名文章",
    content,
    description,
    summary: articleSummary(description, content),
    coverImage: imageUrl(article.coverImage),
    tags: splitTags(article.tags),
    date,
    updatedAt,
    href: `/articles/local-${encodeURIComponent(id)}`,
  };
}

export function normalizeDomainProject(project: any, index: number): DomainProject | null {
  const title = String(project.title ?? "").trim();
  const description = String(project.description ?? "").trim();
  if (!title && !description) return null;

  const category = String(project.category ?? "").trim();
  const rawTech = String(project.tech ?? "").trim();
  const rawTags = project.tags;
  const tags = unique([category, ...splitTags(rawTech), ...splitTags(rawTags)]);

  const id = String(project.id || title || index).trim() || String(index);
  const image = imageUrl(project.imageData || project.image_data || project.coverImage);

  const parsedDate = project.date ? new Date(String(project.date)) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  
  const parsedUpdated = project.updatedAt ? new Date(String(project.updatedAt)) : undefined;
  const updatedAt = parsedUpdated && !Number.isNaN(parsedUpdated.getTime()) ? parsedUpdated : undefined;

  return {
    id,
    title: title || "未命名项目",
    category,
    tech: tags.filter((tag) => tag !== category).join(","),
    url: String(project.url ?? "").trim(),
    description,
    coverImage: image,
    imageData: image,
    tags,
    date,
    updatedAt,
    href: `/projects/local-${encodeURIComponent(id)}`,
    githubUrl: "",
    demoUrl: String(project.url ?? "").trim(),
  };
}

export function normalizeDomainAbout(about: any, profileFallback: any): DomainAbout {
  const parsedUpdated = about.updatedAt ? new Date(String(about.updatedAt)) : undefined;
  const updatedAt = parsedUpdated && !Number.isNaN(parsedUpdated.getTime()) ? parsedUpdated : undefined;

  return {
    name: String(about.name ?? profileFallback.name ?? "").trim(),
    role: String(about.role ?? profileFallback.role ?? "").trim(),
    avatar: imageUrl(about.avatar) || profileFallback.avatar,
    bio: String(about.bio ?? profileFallback.bio ?? "").trim(),
    description: String(about.description ?? profileFallback.description ?? "").trim(),
    philosophy: splitMarkdownBlocks(about.philosophy ?? profileFallback.philosophy),
    skills: splitTags(about.skills ?? profileFallback.skills),
    updatedAt,
  };
}

export function normalizeDomainGallery(gallery: any, index: number): DomainGallery | null {
  const title = String(gallery.title ?? "").trim();
  const imageData = String(gallery.imageData ?? gallery.image_data ?? "").trim();
  if (!title && !imageData) return null;

  const parsedDate = gallery.date ? new Date(String(gallery.date)) : new Date();
  const date = Number.isNaN(parsedDate.getTime()) ? new Date() : parsedDate;
  
  const parsedUpdated = gallery.updatedAt ? new Date(String(gallery.updatedAt)) : undefined;
  const updatedAt = parsedUpdated && !Number.isNaN(parsedUpdated.getTime()) ? parsedUpdated : undefined;

  return {
    id: String(gallery.id || title || index).trim() || String(index),
    title: title || "未命名图片",
    imageData,
    description: String(gallery.description ?? "").trim(),
    category: String(gallery.category ?? "").trim(),
    tags: splitTags(gallery.tags),
    date,
    updatedAt,
  };
}
