// Shared upload helpers for the admin pages (articles / projects / gallery / about).
// Extracted from four inline copies (T8); uploadImageWithProgress follows the
// articles/projects/gallery wording ("网络错误，上传失败"), which about.astro now adopts too.

export const IMAGE_ACCEPT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "image/bmp",
  "image/tiff",
] as const;

/** Limit used by article covers and content images (32MB). */
export const COVER_IMAGE_MAX_SIZE = 32 * 1024 * 1024;
/** Limit used by the about-page avatar upload (5MB). */
export const AVATAR_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

export type UploadedImage = {
  url: string;
  [key: string]: unknown;
};

export type ImageFileCheck =
  | { valid: true }
  | { valid: false; reason: "type" | "size"; sizeMb: string; maxSizeMb: string };

/**
 * XHR upload with progress callbacks. `endpoint` is "/api/upload/cover" or
 * "/api/upload/content". Resolves with the `image` object from the server
 * response, rejects with the server-provided message on failure.
 */
export function uploadImageWithProgress(
  endpoint: string,
  file: File,
  onProgress: (percent: number) => void
): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append("image", file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", endpoint);
    xhr.responseType = "json";
    xhr.upload.addEventListener("progress", (event) => {
      if (!event.lengthComputable) return;
      onProgress(Math.round((event.loaded / event.total) * 100));
    });
    xhr.addEventListener("load", () => {
      const response = (xhr.response || {}) as {
        ok?: boolean;
        image?: UploadedImage;
        message?: string;
      };
      if (xhr.status >= 200 && xhr.status < 300 && response.ok) {
        resolve(response.image as UploadedImage);
        return;
      }
      reject(new Error(response.message || "上传失败"));
    });
    xhr.addEventListener("error", () => reject(new Error("网络错误，上传失败")));
    xhr.addEventListener("abort", () => reject(new Error("上传已取消")));
    xhr.send(formData);
  });
}

/**
 * Shared image-file validation. Returns a discriminated result so each page
 * can render its own (historically worded) error message via its status bar.
 */
export function validateImageFile(
  file: File,
  maxSizeBytes: number = COVER_IMAGE_MAX_SIZE
): ImageFileCheck {
  const sizeMb = (file.size / 1024 / 1024).toFixed(1);
  const maxSizeMb = String(Math.round(maxSizeBytes / 1024 / 1024));
  if (!IMAGE_ACCEPT_TYPES.includes(file.type as (typeof IMAGE_ACCEPT_TYPES)[number])) {
    return { valid: false, reason: "type", sizeMb, maxSizeMb };
  }
  if (file.size > maxSizeBytes) {
    return { valid: false, reason: "size", sizeMb, maxSizeMb };
  }
  return { valid: true };
}

export type ImageUrlCheck = { valid: true; type: string } | { valid: false; error: string };

/**
 * Ask /api/validate-image-url whether a remote image URL is usable.
 * Shared verbatim by the articles page and the gallery page.
 */
export async function validateImageUrl(url: string): Promise<ImageUrlCheck> {
  const response = await fetch(`/api/validate-image-url?url=${encodeURIComponent(url)}`);
  const result = await response.json();
  if (!response.ok || !result.ok) {
    return { valid: false, error: result.message || "图片链接验证失败" };
  }
  return { valid: true, type: result.image?.type || "图片" };
}
