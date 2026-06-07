import type { APIRoute } from "astro";
import { readServerEnv } from "../../../lib/env";
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ── Local Storage Configuration ───────────────────────────────────────
// UPLOAD_DIR env var overrides the default path (useful for Docker/custom mounts)
const UPLOAD_DIR_ENV = readServerEnv("UPLOAD_DIR");

/** Absolute path to the uploads directory (defaults to <project-root>/public/uploads). */
function getUploadDir(): string {
  if (UPLOAD_DIR_ENV) return UPLOAD_DIR_ENV;
  // Use robust absolute path resolution based on the process working directory
  return join(process.cwd(), "public", "uploads");
}

// ── Validation ───────────────────────────────────────────────────────
export const MAX_IMAGE_SIZE = 32 * 1024 * 1024; // 32 MB
export const ACCEPTED_IMAGE_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/gif", "gif"],
  ["image/webp", "webp"],
  ["image/bmp", "bmp"],
  ["image/tiff", "tiff"],
]);

// ── JSON Response Helper ─────────────────────────────────────────────
export function validateImageFile(file: File) {
  if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
    return "仅支持 JPG、PNG、GIF、WebP、BMP、TIFF 格式";
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return "文件大小不能超过 32MB";
  }

  return "";
}

// ── Save to Local Disk ────────────────────────────────────────────────
export async function saveUploadedImage(file: File, _bucket: string) {
  const uploadDir = getUploadDir();

  // Ensure uploads directory exists
  await mkdir(uploadDir, { recursive: true });

  const extension = ACCEPTED_IMAGE_TYPES.get(file.type) || "jpg";
  const filename = `${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const destPath = join(uploadDir, filename);

  const arrayBuffer = await file.arrayBuffer();
  await writeFile(destPath, Buffer.from(arrayBuffer));

  const url = `/uploads/${filename}`;

  return {
    url,
    display_url: url,
    thumb_url: url,
    medium_url: url,
    filename,
    size: file.size,
    type: file.type,
    width: 0,
    height: 0,
    delete_url: "",
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
