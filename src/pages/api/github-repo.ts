import type { APIRoute } from "astro";
import { jsonResponse } from "../../lib/api-utils";
import { readServerEnv } from "../../lib/env";
import { cleanReadmeContent, extractReadmeSummary } from "../../lib/markdown";

const REPO_PARAM_RE = /^[a-zA-Z0-9._-]+$/;

export const GET: APIRoute = async ({ url }) => {
  const owner = url.searchParams.get("owner") ?? "";
  const repo = url.searchParams.get("repo") ?? "";

  if (!owner || !REPO_PARAM_RE.test(owner)) {
    return jsonResponse({ ok: false, message: "缺少或无效的 owner 参数" }, 400);
  }

  if (!repo || !REPO_PARAM_RE.test(repo)) {
    return jsonResponse({ ok: false, message: "缺少或无效的 repo 参数" }, 400);
  }

  const githubToken = readServerEnv("GITHUB_TOKEN");
  const authHeaders: Record<string, string> = {
    "User-Agent": "changye-blog",
    "Accept": "application/vnd.github+json",
  };
  if (githubToken) {
    authHeaders["Authorization"] = `Bearer ${githubToken}`;
  }

  try {
    const res = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
      headers: authHeaders,
    });

    if (!res.ok) {
      return jsonResponse(
        { ok: false, message: `GitHub API 返回 ${res.status}` },
        res.status,
      );
    }

    const data = await res.json();

    // Fetch README for summaries
    let readmeSummary: string | null = null;
    let readmeCleaned: string | null = null;
    try {
      const readmeRes = await fetch(
        `https://api.github.com/repos/${owner}/${repo}/readme`,
        { headers: { ...authHeaders, "Accept": "application/vnd.github.raw" } },
      );
      if (readmeRes.ok) {
        const content = await readmeRes.text();
        readmeSummary = extractReadmeSummary(content);
        readmeCleaned = cleanReadmeContent(content);
      }
    } catch {
      // README fetch failed — fall back to description
    }

    return jsonResponse({
      ok: true,
      repo: {
        name: data.name,
        description: data.description,
        readme_summary: readmeSummary,
        readme_cleaned: readmeCleaned,
        language: data.language,
        topics: data.topics,
        html_url: data.html_url,
      },
    });
  } catch (error) {
    return jsonResponse(
      {
        ok: false,
        message: error instanceof Error ? error.message : "请求 GitHub API 失败",
      },
      502,
    );
  }
};
