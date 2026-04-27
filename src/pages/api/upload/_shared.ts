import type { APIRoute } from "astro";

// ── ImgBB Configuration ──────────────────────────────────────────────
const IMGBB_API_KEY = import.meta.env.IMGBB_API_KEY;
const IMGBB_ENDPOINT = "https://api.imgbb.com/1/upload";

// ── Validation ───────────────────────────────────────────────────────
export const MAX_IMAGE_SIZE = 32 * 1024 * 1024; // 32MB (imgbb limit)
export const ACCEPTED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/bmp", "bmp"],
  ["image/tiff", "tiff"],
]);

// ── JSON Response Helper ─────────────────────────────────────────────
export function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

// ── File Validation ──────────────────────────────────────────────────
export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "仅支持 JPG、PNG、GIF、WebP、BMP、TIFF 格式";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "文件大小不能超过 32MB";
  }

  return "";
}

// ── Upload to ImgBB ──────────────────────────────────────────────────
export async function saveUploadedImage(file: File, _bucket: string) {
  if (!IMGBB_API_KEY) {
    throw new Error("缺少 IMGBB_API_KEY 环境变量");
  }

  // Read file as base64 for imgbb API
  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const extension = ACCEPTED_IMAGE_TYPES.get(file.type) || "jpg";

  // Build multipart form for imgbb
  const formData = new FormData();
  formData.append("key", IMGBB_API_KEY);
  formData.append("image", base64);
  formData.append("name", `${Date.now()}-${crypto.randomUUID()}.${extension}`);

  const response = await fetch(IMGBB_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    const text = await response.text().catch(() => "");
    throw new Error(`图床上传失败 (HTTP ${response.status}): ${text}`);
  }

  const result = await response.json();

  if (!result.success || !result.data) {
    throw new Error(result.error?.message || "图床返回异常");
  }

  return {
    url: result.data.url as string,           // 原图直链
    display_url: result.data.display_url as string,
    thumb_url: result.data.thumb?.url as string || "",
    medium_url: result.data.medium?.url as string || "",
    filename: result.data.image?.filename || file.name,
    size: result.data.size || file.size,
    type: file.type,
    width: result.data.width as number,
    height: result.data.height as number,
    delete_url: result.data.delete_url as string,
  };
}

// ── Read & Validate Form Data ────────────────────────────────────────
export async function readImageFormData(request: Request) {
  const formData = await request.formData();
  const file = formData.get("image");

  if (!(file instanceof File)) {
    return { error: "请通过 image 字段上传图片文件" } as const;
  }

  const validationError = validateImageFile(file);
  if (validationError) return { error: validationError } as const;

  return { file } as const;
}
