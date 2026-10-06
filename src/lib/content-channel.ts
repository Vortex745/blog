/**
 * ContentChannel 契约：admin 内容模块与前台同步脚本之间的唯一约定。
 *
 * key 字符串值与历史散落字面量逐字相同——已有用户本地缓存不失效。
 */
export const CONTENT_STORAGE_KEYS = {
  articles: "admin-articles-data",
  projects: "admin-projects-data",
  about: "admin-about-data",
  gallery: "admin-gallery-data",
  home: "admin-home-data",
} as const;

export type ContentModule = keyof typeof CONTENT_STORAGE_KEYS;

/**
 * 图库本机下载计数 overlay 的存储 key(前台专用,非内容模块,故不进 CONTENT_STORAGE_KEYS)。
 * 命名沿用 admin- 前缀约定;前台下载只写这里,不再把合并列表倒灌进 admin-gallery-data。
 */
export const GALLERY_DOWNLOADS_STORAGE_KEY = "admin-gallery-downloads";

export const CONTENT_CHANGED_EVENT = "admin-content:changed";

export type ContentChangedDetail = { module: ContentModule };

export function dispatchContentChanged(module: ContentModule): void {
  window.dispatchEvent(
    new CustomEvent<ContentChangedDetail>(CONTENT_CHANGED_EVENT, {
      detail: { module },
    })
  );
}
