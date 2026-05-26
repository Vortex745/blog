const COMPLETE_ENDPOINT_SUFFIXES = ["/chat/completions", "/models"] as const;

export function buildOpenAiCompatibleEndpoint(
  baseUrlRaw: string,
  resourcePath: "chat/completions" | "models",
) {
  const trimmed = baseUrlRaw.trim().replace(/\/+$/, "");
  if (!trimmed) return { error: "Base URL 不能为空" } as const;

  let baseUrl: URL;
  try {
    baseUrl = new URL(trimmed);
  } catch {
    return { error: "Base URL 格式不正确" } as const;
  }

  if (baseUrl.protocol !== "http:" && baseUrl.protocol !== "https:") {
    return { error: "Base URL 必须以 http:// 或 https:// 开头" } as const;
  }

  let pathname = baseUrl.pathname.replace(/\/+$/, "");
  const lowerPathname = pathname.toLowerCase();
  for (const suffix of COMPLETE_ENDPOINT_SUFFIXES) {
    if (lowerPathname.endsWith(suffix)) {
      pathname = pathname.slice(0, -suffix.length).replace(/\/+$/, "");
      break;
    }
  }

  if (!pathname && baseUrl.hostname === "api.openai.com") {
    pathname = "/v1";
  }

  baseUrl.pathname = `${pathname}/${resourcePath}`.replace(/\/{2,}/g, "/");
  baseUrl.search = "";
  baseUrl.hash = "";

  return { endpoint: baseUrl } as const;
}
