import { neon } from "@neondatabase/serverless";
import { profile } from "../data/profile";

export type NeonProject = {
  id?: string;
  title?: string;
  category?: string;
  tech?: string;
  url?: string;
  description?: string;
  coverImage?: string;
  imageData?: string;
  tags?: unknown;
  date?: string;
  updatedAt?: string;
};

export type NeonAbout = {
  name?: string;
  role?: string;
  avatar?: string;
  bio?: string;
  description?: string;
  philosophy?: string[];
  skills?: string[];
  updatedAt?: string;
};

type ProjectRow = {
  id: string;
  title: string;
  category: string;
  tech: string;
  url: string;
  description: string;
  image_data: string;
  date: string | Date;
  updated_at: string | Date | null;
};

type AboutRow = {
  name: string;
  role: string;
  avatar: string;
  bio: string;
  description: string;
  philosophy: unknown;
  skills: unknown;
  updated_at: string | Date | null;
};

const connectionString = process.env.DATABASE_URL ?? import.meta.env.DATABASE_URL;
let projectsTableReady: Promise<void> | null = null;
let aboutTableReady: Promise<void> | null = null;

export function neonContentStorageConfigured(): boolean {
  return Boolean(connectionString);
}

function getSql() {
  if (!connectionString) {
    throw new Error("缺少 DATABASE_URL，无法连接 Neon 数据库");
  }

  return neon(connectionString);
}

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

export function splitTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/[,，]/)
    .map((item) => item.trim().replace(/^#+/, "").trim())
    .filter(Boolean);
}

function splitMarkdownBlocks(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value ?? "")
    .split(/\n\n+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function dateToIso(value: unknown): string {
  const date = value ? new Date(String(value)) : new Date();
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function imageUrl(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.startsWith("/") || /^https?:\/\//i.test(raw)) return raw;
  return "";
}

export function projectTags(project: NeonProject): string[] {
  return unique([
    String(project.category ?? "").trim(),
    ...splitTags(project.tech || project.tags),
  ]);
}

export function projectCover(project: NeonProject): string {
  return imageUrl(project.imageData || project.coverImage);
}

export function projectDate(project: NeonProject): Date {
  const date = project.date ? new Date(project.date) : new Date(project.updatedAt || Date.now());
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function normalizeProject(project: NeonProject, index: number): NeonProject | null {
  const title = String(project.title ?? "").trim();
  const description = String(project.description ?? "").trim();
  if (!title && !description) return null;

  const tags = projectTags(project);
  const image = projectCover(project);

  return {
    id: String(project.id || title || index).trim() || String(index),
    title: title || "未命名项目",
    category: String(project.category ?? "").trim(),
    tech: tags.filter((tag) => tag !== String(project.category ?? "").trim()).join(","),
    url: String(project.url ?? "").trim(),
    description,
    coverImage: image,
    imageData: image,
    tags,
    date: dateToIso(project.date),
    updatedAt: project.updatedAt ? dateToIso(project.updatedAt) : undefined,
  };
}

function rowToProject(row: ProjectRow): NeonProject {
  return {
    id: row.id,
    title: row.title,
    category: row.category,
    tech: row.tech,
    url: row.url,
    description: row.description,
    coverImage: row.image_data,
    imageData: row.image_data,
    tags: projectTags({ category: row.category, tech: row.tech }),
    date: dateToIso(row.date),
    updatedAt: row.updated_at ? dateToIso(row.updated_at) : undefined,
  };
}

export function normalizeProjects(value: unknown): NeonProject[] {
  const list = Array.isArray(value)
    ? value
    : value && typeof value === "object" && Array.isArray((value as { projects?: unknown }).projects)
      ? (value as { projects: unknown[] }).projects
      : [];

  return list
    .map((project, index) => normalizeProject(project as NeonProject, index))
    .filter((project): project is NeonProject => Boolean(project));
}

async function ensureProjectsTable() {
  projectsTableReady ??= getSql()`
    create table if not exists admin_projects (
      id text primary key,
      title text not null default '',
      category text not null default '',
      tech text not null default '',
      url text not null default '',
      description text not null default '',
      image_data text not null default '',
      date timestamptz not null default now(),
      updated_at timestamptz
    )
  `.then(() => undefined);

  await projectsTableReady;
}

export async function readNeonProjects(): Promise<NeonProject[]> {
  if (!neonContentStorageConfigured()) return [];

  await ensureProjectsTable();
  const sql = getSql();
  const rows = await sql<ProjectRow[]>`
    select id, title, category, tech, url, description, image_data, date, updated_at
    from admin_projects
    order by date desc, id desc
  `;

  return rows.map(rowToProject);
}

export async function writeNeonProjects(projects: unknown): Promise<NeonProject[]> {
  const normalized = normalizeProjects(projects);
  const payload = JSON.stringify(normalized);

  await ensureProjectsTable();
  await getSql()`
    with incoming as (
      select *
      from jsonb_to_recordset(${payload}::jsonb) as project(
        id text,
        title text,
        category text,
        tech text,
        url text,
        description text,
        "imageData" text,
        "coverImage" text,
        date timestamptz,
        "updatedAt" timestamptz
      )
    ),
    removed as (
      delete from admin_projects
      where not exists (
        select 1
        from incoming
        where incoming.id = admin_projects.id
      )
      returning id
    ),
    upserted as (
      insert into admin_projects (
        id,
        title,
        category,
        tech,
        url,
        description,
        image_data,
        date,
        updated_at
      )
      select
        id,
        coalesce(title, ''),
        coalesce(category, ''),
        coalesce(tech, ''),
        coalesce(url, ''),
        coalesce(description, ''),
        coalesce(nullif("imageData", ''), "coverImage", ''),
        coalesce(date, now()),
        "updatedAt"
      from incoming
      on conflict (id) do update set
        title = excluded.title,
        category = excluded.category,
        tech = excluded.tech,
        url = excluded.url,
        description = excluded.description,
        image_data = excluded.image_data,
        date = excluded.date,
        updated_at = excluded.updated_at
      returning id
    )
    select
      (select count(*) from removed) as removed_count,
      (select count(*) from upserted) as upserted_count
  `;

  return normalized;
}

export function normalizeAbout(value: unknown): NeonAbout {
  const source = value && typeof value === "object" ? value as NeonAbout : {};
  return {
    name: String(source.name ?? profile.name ?? "").trim(),
    role: String(source.role ?? profile.role ?? "").trim(),
    avatar: imageUrl(source.avatar) || profile.avatar,
    bio: String(source.bio ?? profile.bio ?? "").trim(),
    description: String(source.description ?? profile.description ?? "").trim(),
    philosophy: splitMarkdownBlocks(source.philosophy ?? profile.philosophy),
    skills: splitTags(source.skills ?? profile.skills),
    updatedAt: source.updatedAt ? dateToIso(source.updatedAt) : undefined,
  };
}

function rowToAbout(row: AboutRow): NeonAbout {
  return normalizeAbout({
    name: row.name,
    role: row.role,
    avatar: row.avatar,
    bio: row.bio,
    description: row.description,
    philosophy: row.philosophy,
    skills: row.skills,
    updatedAt: row.updated_at ? dateToIso(row.updated_at) : undefined,
  });
}

async function ensureAboutTable() {
  aboutTableReady ??= getSql()`
    create table if not exists admin_about (
      id text primary key,
      name text not null default '',
      role text not null default '',
      avatar text not null default '',
      bio text not null default '',
      description text not null default '',
      philosophy jsonb not null default '[]'::jsonb,
      skills jsonb not null default '[]'::jsonb,
      updated_at timestamptz
    )
  `.then(() => undefined);

  await aboutTableReady;
}

export async function readNeonAbout(): Promise<NeonAbout | null> {
  if (!neonContentStorageConfigured()) return null;

  await ensureAboutTable();
  const sql = getSql();
  const rows = await sql<AboutRow[]>`
    select name, role, avatar, bio, description, philosophy, skills, updated_at
    from admin_about
    where id = 'profile'
    limit 1
  `;

  return rows[0] ? rowToAbout(rows[0]) : null;
}

export async function writeNeonAbout(about: unknown): Promise<NeonAbout> {
  const normalized = normalizeAbout({
    ...(about && typeof about === "object" ? about as NeonAbout : {}),
    updatedAt: new Date().toISOString(),
  });

  await ensureAboutTable();
  await getSql()`
    insert into admin_about (
      id,
      name,
      role,
      avatar,
      bio,
      description,
      philosophy,
      skills,
      updated_at
    )
    values (
      'profile',
      ${normalized.name ?? ''},
      ${normalized.role ?? ''},
      ${normalized.avatar ?? ''},
      ${normalized.bio ?? ''},
      ${normalized.description ?? ''},
      ${JSON.stringify(normalized.philosophy ?? [])}::jsonb,
      ${JSON.stringify(normalized.skills ?? [])}::jsonb,
      ${normalized.updatedAt ?? new Date().toISOString()}
    )
    on conflict (id) do update set
      name = excluded.name,
      role = excluded.role,
      avatar = excluded.avatar,
      bio = excluded.bio,
      description = excluded.description,
      philosophy = excluded.philosophy,
      skills = excluded.skills,
      updated_at = excluded.updated_at
  `;

  return normalized;
}
