type MarkdownMode = "edit" | "preview";

function escapeHtml(value: unknown): string {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return entities[char] ?? char;
  });
}

function safeUrl(value: string, allowImageData = false): string {
  const raw = value.trim();
  if (!raw) return "";
  if (raw.startsWith("/") || raw.startsWith("#") || raw.startsWith("./") || raw.startsWith("../")) {
    return raw;
  }
  if (allowImageData && /^data:image\//i.test(raw)) return raw;

  try {
    const url = new URL(raw, window.location.origin);
    if (["http:", "https:", "mailto:", "tel:"].includes(url.protocol)) return raw;
  } catch {}

  return "";
}

function renderInline(value: string): string {
  const placeholders: string[] = [];
  const stash = (html: string) => {
    const key = `\u0000${placeholders.length}\u0000`;
    placeholders.push(html);
    return key;
  };

  let text = value
    .replace(/`([^`]+)`/g, (_match, code) => stash(`<code>${escapeHtml(code)}</code>`))
    .replace(/!\[([^\]]*)]\(([^)]+)\)/g, (_match, alt, url) => {
      const safe = safeUrl(url, true);
      if (!safe) return "";
      return stash(`<img src="${escapeHtml(safe)}" alt="${escapeHtml(alt)}" loading="lazy" />`);
    })
    .replace(/\[([^\]]+)]\(([^)]+)\)/g, (_match, label, url) => {
      const safe = safeUrl(url);
      if (!safe) return escapeHtml(label);
      return stash(`<a href="${escapeHtml(safe)}" target="_blank" rel="noreferrer">${escapeHtml(label)}</a>`);
    });

  text = escapeHtml(text)
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/__([^_]+)__/g, "<strong>$1</strong>")
    .replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>")
    .replace(/(^|[^_])_([^_\n]+)_(?!_)/g, "$1<em>$2</em>");

  return placeholders.reduce((html, placeholder, index) => {
    return html.replace(new RegExp(`\\u0000${index}\\u0000`, "g"), placeholder);
  }, text);
}

function isTableDivider(line: string): boolean {
  return /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*$/.test(line);
}

function splitTableRow(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderParagraph(lines: string[]): string {
  const content = lines.map((line) => renderInline(line.trim())).join("<br>");
  return content ? `<p>${content}</p>` : "";
}

export function renderAdminMarkdown(markdown: string): string {
  const source = markdown.replace(/\r\n/g, "\n").trim();
  if (!source) return '<p class="markdown-preview-empty">暂无预览内容。</p>';

  const lines = source.split("\n");
  const html: string[] = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];
    const trimmed = line.trim();

    if (!trimmed) {
      index += 1;
      continue;
    }

    if (trimmed.startsWith("```")) {
      const codeLines: string[] = [];
      index += 1;
      while (index < lines.length && !lines[index].trim().startsWith("```")) {
        codeLines.push(lines[index]);
        index += 1;
      }
      if (index < lines.length) index += 1;
      html.push(`<pre><code>${escapeHtml(codeLines.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      index += 1;
      continue;
    }

    const image = trimmed.match(/^!\[([^\]]*)]\(([^)]+)\)$/);
    if (image) {
      const url = safeUrl(image[2], true);
      if (url) {
        html.push(`<figure><img src="${escapeHtml(url)}" alt="${escapeHtml(image[1])}" loading="lazy" /></figure>`);
      }
      index += 1;
      continue;
    }

    if (index + 1 < lines.length && trimmed.includes("|") && isTableDivider(lines[index + 1])) {
      const headers = splitTableRow(trimmed);
      const rows: string[][] = [];
      index += 2;
      while (index < lines.length && lines[index].trim().includes("|")) {
        rows.push(splitTableRow(lines[index]));
        index += 1;
      }
      html.push(
        `<div class="markdown-table-wrap"><table><thead><tr>${headers
          .map((cell) => `<th>${renderInline(cell)}</th>`)
          .join("")}</tr></thead><tbody>${rows
          .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
          .join("")}</tbody></table></div>`
      );
      continue;
    }

    if (/^>\s?/.test(trimmed)) {
      const quoteLines: string[] = [];
      while (index < lines.length && /^>\s?/.test(lines[index].trim())) {
        quoteLines.push(lines[index].trim().replace(/^>\s?/, ""));
        index += 1;
      }
      html.push(`<blockquote>${renderParagraph(quoteLines)}</blockquote>`);
      continue;
    }

    if (/^[-*+]\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^[-*+]\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^[-*+]\s+/, ""));
        index += 1;
      }
      html.push(`<ul>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ul>`);
      continue;
    }

    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (index < lines.length && /^\d+\.\s+/.test(lines[index].trim())) {
        items.push(lines[index].trim().replace(/^\d+\.\s+/, ""));
        index += 1;
      }
      html.push(`<ol>${items.map((item) => `<li>${renderInline(item)}</li>`).join("")}</ol>`);
      continue;
    }

    const paragraph: string[] = [line];
    index += 1;
    while (
      index < lines.length &&
      lines[index].trim() &&
      !lines[index].trim().startsWith("```") &&
      !/^(#{1,4})\s+/.test(lines[index].trim()) &&
      !/^!\[([^\]]*)]\(([^)]+)\)$/.test(lines[index].trim()) &&
      !/^>\s?/.test(lines[index].trim()) &&
      !/^[-*+]\s+/.test(lines[index].trim()) &&
      !/^\d+\.\s+/.test(lines[index].trim()) &&
      !(index + 1 < lines.length && lines[index].trim().includes("|") && isTableDivider(lines[index + 1]))
    ) {
      paragraph.push(lines[index]);
      index += 1;
    }
    html.push(renderParagraph(paragraph));
  }

  return html.filter(Boolean).join("");
}

function renderRenderer(renderer: HTMLElement): void {
  const source = renderer.querySelector<HTMLTextAreaElement>("textarea[data-markdown-source]");
  const preview = renderer.querySelector<HTMLElement>("[data-markdown-preview]");
  if (!source || !preview) return;
  preview.innerHTML = renderAdminMarkdown(source.value);
}

function setMode(renderer: HTMLElement, mode: MarkdownMode): void {
  const editPane = renderer.querySelector<HTMLElement>("[data-markdown-edit-pane]");
  const previewPane = renderer.querySelector<HTMLElement>("[data-markdown-preview-pane]");

  renderer.querySelectorAll<HTMLButtonElement>("[data-markdown-mode]").forEach((button) => {
    const active = button.dataset.markdownMode === mode;
    button.classList.toggle("is-active", active);
    button.setAttribute("aria-pressed", String(active));
  });

  if (editPane) editPane.hidden = mode !== "edit";
  if (previewPane) previewPane.hidden = mode !== "preview";
  if (mode === "preview") renderRenderer(renderer);
}

export function refreshMarkdownRendererFor(source: HTMLTextAreaElement | null | undefined): void {
  const renderer = source?.closest<HTMLElement>("[data-markdown-renderer]");
  if (renderer) renderRenderer(renderer);
}

export function initMarkdownRenderers(scope: ParentNode = document): void {
  const renderers =
    scope instanceof Element && scope.matches("[data-markdown-renderer]")
      ? [scope as HTMLElement]
      : Array.from(scope.querySelectorAll<HTMLElement>("[data-markdown-renderer]"));

  renderers.forEach((renderer) => {
    if (renderer.dataset.markdownRendererReady === "true") return;
    renderer.dataset.markdownRendererReady = "true";

    const source = renderer.querySelector<HTMLTextAreaElement>("textarea[data-markdown-source]");
    if (!source) return;

    source.addEventListener("input", () => renderRenderer(renderer));
    source.addEventListener("change", () => renderRenderer(renderer));
    renderer.querySelectorAll<HTMLButtonElement>("[data-markdown-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.markdownMode === "preview" ? "preview" : "edit";
        setMode(renderer, mode);
      });
    });

    renderRenderer(renderer);
  });
}
