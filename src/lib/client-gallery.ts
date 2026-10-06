/**
 * 前台图库的纯逻辑:SQLite 与 localStorage 列表合并、本机数据筛选、下载计数 overlay。
 *
 * 页面(src/pages/gallery/index.astro)只负责 DOM 渲染与事件绑定;
 * 这里不触碰 window/document,localStorage 通过参数注入以便测试。
 */
import { GALLERY_DOWNLOADS_STORAGE_KEY } from "./content-channel";

/** localStorage/SSR payload 中可能出现的原始图库条目形状。 */
export type GalleryImageSource = {
  id?: string;
  url?: string;
  imageData?: string;
  title?: string;
  name?: string;
  filename?: string;
  size?: number;
  type?: string;
  source?: string;
  date?: string;
  updatedAt?: string;
  createdAt?: string;
  downloadCount?: number;
};

/** 解析图库列表 JSON,三态:缺失/非法 → 空数组。 */
export function parseGalleryImages(raw: string | null | undefined): GalleryImageSource[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 倒灌防护:只保留用户本机产生的条目。
 *
 * 历史版本曾把合并结果(source: "sqlite" 的服务端条目,含 base64 imageData)整表写回
 * localStorage;本函数既用于读取时过滤历史倒灌副本,也是持久化本地列表的唯一出口。
 * admin 端本机条目的 source 为 "local"/"url",不会误伤。
 */
export function pickLocalGalleryImages(images: GalleryImageSource[]): GalleryImageSource[] {
  return images.filter((img) => img?.source !== "sqlite");
}

/**
 * SQLite 列表 ⊕ 本地列表:SQLite 条目归一化在前,本地条目去重(id 或 url 命中即弃)后追加。
 *
 * 幂等:对合并结果再次合并(作为 localImages 传入)不会产生重复——
 * 归一化条目携带与 SQLite 相同的 id,会被 sqliteIds 过滤掉。
 */
export function mergeGalleryImages(
  sqliteImages: GalleryImageSource[],
  localImages: GalleryImageSource[]
): GalleryImageSource[] {
  const sqliteIds = new Set(sqliteImages.map((img) => img?.id || img?.url));
  const localOnly = localImages.filter((img) => !sqliteIds.has(img?.id || img?.url));
  return [
    ...sqliteImages.map((img) => ({
      id: img.id,
      url: img.imageData || img.url || "",
      title: img.title || "未命名图片",
      name: img.title || "未命名图片",
      filename: img.title || "",
      size: 0,
      type: "image/unknown",
      source: "sqlite",
      date: img.date || new Date().toISOString(),
      downloadCount: 0,
    })),
    ...localOnly,
  ];
}

/** 本机下载计数 overlay:id(缺 id 时用 url)→ 本浏览器累计的额外下载次数。 */
export type GalleryDownloadOverlay = Record<string, number>;

type StorageLike = Pick<Storage, "getItem" | "setItem">;

/** 读取下载计数 overlay:缺失/非法 JSON/非对象/非法数值一律降级为空表。 */
export function loadGalleryDownloadOverlay(storage: StorageLike): GalleryDownloadOverlay {
  let raw: string | null;
  try {
    raw = storage.getItem(GALLERY_DOWNLOADS_STORAGE_KEY);
  } catch {
    return {};
  }
  if (!raw) return {};
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    const overlay: GalleryDownloadOverlay = {};
    for (const [key, value] of Object.entries(parsed as Record<string, unknown>)) {
      const count = Number(value);
      if (Number.isFinite(count) && count >= 0) overlay[key] = count;
    }
    return overlay;
  } catch {
    return {};
  }
}

/** 持久化下载计数 overlay。只写 overlay key,绝不触碰图库列表本身。 */
export function saveGalleryDownloadOverlay(storage: StorageLike, overlay: GalleryDownloadOverlay): void {
  storage.setItem(GALLERY_DOWNLOADS_STORAGE_KEY, JSON.stringify(overlay));
}

/** 本机一次下载:+1,返回新表(不就地修改)。空 id 忽略。 */
export function bumpDownloadOverlay(overlay: GalleryDownloadOverlay, id: string): GalleryDownloadOverlay {
  const key = String(id || "");
  if (!key) return overlay;
  return { ...overlay, [key]: Number(overlay[key] || 0) + 1 };
}

/** 渲染前把本机计数叠加到条目上:downloadCount = 原值(服务端/本地既有) + 本机 overlay。 */
export function applyDownloadOverlay<T extends { id?: string; url?: string; downloadCount?: number }>(
  images: T[],
  overlay: GalleryDownloadOverlay
): T[] {
  return images.map((img) => {
    const key = String(img?.id || img?.url || "");
    const extra = key ? overlay[key] : undefined;
    if (!extra) return img;
    return { ...img, downloadCount: Number(img.downloadCount || 0) + extra };
  });
}
