import type { APIRoute } from "astro";

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/bmp", "image/tiff"]);

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export const GET: APIRoute = async ({ request }) => {
  const url = new URL(request.url).searchParams.get("url")?.trim() || "";

  let imageUrl: URL;
  try {
    imageUrl = new URL(url);
  } catch {
    return jsonResponse({ ok: false, message: "请输入有效的图片 URL" }, 400);
  }

  if (!ALLOWED_PROTOCOLS.has(imageUrl.protocol)) {
    return jsonResponse({ ok: false, message: "URL 必须以 http:// 或 https:// 开头" }, 400);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const response = await fetch(imageUrl, { method: "HEAD", signal: controller.signal });
    clearTimeout(timeout);

    if (!response.ok) {
      return jsonResponse({ ok: false, message: `图片链接不可访问（HTTP ${response.status}）` }, 400);
    }

    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
    if (!ALLOWED_TYPES.has(contentType)) {
      return jsonResponse({ ok: false, message: "链接返回的内容不是受支持的图片格式" }, 400);
    }

    return jsonResponse({
      ok: true,
      image: {
        url: imageUrl.toString(),
        type: contentType,
        size: response.headers.get("content-length"),
      },
    });
  } catch (error) {
    return jsonResponse(
      { ok: false, message: error instanceof Error && error.name === "AbortError" ? "链接验证超时" : "图片链接验证失败" },
      400,
    );
  }
};
