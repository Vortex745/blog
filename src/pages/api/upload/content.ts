import type { APIRoute } from "astro";
import { hasAdminWriteAccess } from "../../../lib/auth";
import { jsonResponse } from "../../../lib/api-utils";
import { readImageFormData, saveUploadedImage } from "./_shared";

export const POST: APIRoute = async ({ request }) => {
  if (!await hasAdminWriteAccess(request)) {
    return jsonResponse({ ok: false, message: "请先登录后台" }, 401);
  }

  try {
    const result = await readImageFormData(request);
    if ("error" in result) return jsonResponse({ ok: false, message: result.error }, 400);

    const image = await saveUploadedImage(result.file, "content");
    return jsonResponse({ ok: true, image });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error ? error.message : "正文图片上传失败" },
      500,
    );
  }
};
