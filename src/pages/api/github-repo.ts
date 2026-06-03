import type { APIRoute } from "astro";
import { jsonResponse } from "../../lib/api-utils";
import { readServerEnv } from "../../lib/env";

const REPO_PARAM_RE = /^[a-zA-Z0-9._-]+$/;

function extractReadmeSummary(markdown: string): string | null {
  if (!markdown || markdown.length < 20) return null;

  // Remove HTML comments
  let text = markdown.replace(/<!--[\s\S]*?-->/g, "");

  // Remove badge lines (images linking to shields.io, etc.)
  text = text.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "");
  text = text.replace(
    /!\[.*?(?:badge|shield|coverage|build|ci|test|npm|download|version|license|stars|fork|commit|issues?|prs?|pipeline|status|release).*?\]\(.*?\)/gi,
    "",
  );

  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`[^`]*`/g, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "");

  const lines = text.split("\n");
  const headingRe = /^#{1,3}\s+/;
  const stopRe =
    /^#{1,3}\s*(installation|getting\s*started|contribut|license|usage|api\s*(reference|documentation)|setup|prerequisites|development|building|testing|deploy|changelog|acknowledg|credits|copyright|support|faq|table\s*of\s*contents|sponsor|roadmap|security|community)\b/i;

  // Collect a condensed summary: first heading + following paragraphs
  const parts: string[] = [];
  const MAX = 500;
  let foundTitle = false;
  let inParagraph = false;

  for (const rawLine of lines) {
    const line = rawLine.trim();

    // Skip horizontal rules, image-only lines
    if (/^[-*_]{3,}$/.test(line)) continue;
    if (/^!\[.*\]\(.*\)$/.test(line)) continue;
    if (/^\[!\[/.test(line)) continue;

    // First heading becomes the project title
    if (!foundTitle && headingRe.test(line)) {
      parts.push(line.replace(headingRe, "**") + "**");
      foundTitle = true;
      inParagraph = false;
      continue;
    }

    // Stop at section headers that indicate non-descriptive content
    if (stopRe.test(line)) break;

    // Skip sub-headings (we take the first paragraph content, not structure)
    if (headingRe.test(line)) continue;

    if (!line) {
      // Blank line = paragraph break
      if (inParagraph) {
        parts.push("");
        inParagraph = false;
      }
      continue;
    }

    // Regular paragraph text
    const candidate = parts.join("\n") + (inParagraph ? " " : "\n") + line;
    if (candidate.length > MAX) {
      const remaining = MAX - parts.join("\n").length - 1;
      if (remaining > 20) {
        parts.push(line.slice(0, remaining - 3) + "...");
      }
      break;
    }
    if (inParagraph) {
      parts[parts.length - 1] += " " + line;
    } else {
      parts.push(line);
    }
    inParagraph = true;
  }

  const result = parts.join("\n\n").trim();
  return result.length > 10 ? result : null;
}

function cleanReadmeContent(markdown: string): string | null {
  if (!markdown || markdown.length < 20) return null;

  // Remove HTML comments
  let text = markdown.replace(/<!--[\s\S]*?-->/g, "");

  // Remove badge lines
  text = text.replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "");
  text = text.replace(
    /!\[.*?(?:badge|shield|coverage|build|ci|test|npm|download|version|license|stars|fork|commit|issues?|prs?|pipeline|status|release).*?\]\(.*?\)/gi,
    "",
  );

  // Remove code blocks and inline code
  text = text.replace(/```[\s\S]*?```/g, "");
  text = text.replace(/`[^`]*`/g, "");

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, "");

  // Remove image-only lines
  text = text.replace(/^!\[.*\]\(.*\)$/gm, "");
  text = text.replace(/^\[!\[/gm, "");

  // Trim multiple blank lines
  text = text.replace(/\n{3,}/g, "\n\n");

  text = text.trim();
  return text.length > 50 ? text.slice(0, 4000) : null;
}

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
