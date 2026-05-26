import type { APIRoute } from "astro";
import { jsonResponse, readImageFormData, saveUploadedImage } from "./_shared";

export const POST: APIRoute = async ({ request }) => {
  try {
    const result = await readImageFormData(request);
    if ("error" in result) return jsonResponse({ ok: false, message: result.error }, 400);

    const image = await saveUploadedImage(result.file, "cover");
    return jsonResponse({ ok: true, image });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "封面图片上传失败" },
      500,
    );
  }
};
