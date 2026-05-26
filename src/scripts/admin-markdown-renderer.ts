type MarkdownLine = {
  kind: "paragraph" | "heading" | "quote" | "unordered-list" | "ordered-list" | "code";
  level?: number;
  marker?: string;
  prefix: string;
  text: string;
};

type LiveEditorState = {
  editor: HTMLDivElement;
  isComposing: boolean;
  isRendering: boolean;
  isSyncingFromEditor: boolean;
  source: HTMLTextAreaElement;
};

type MarkdownSelection = {
  start: number;
  end: number;
};

const stateBySource = new WeakMap<HTMLTextAreaElement, LiveEditorState>();
let selectionSyncReady = false;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseMarkdownLine(line: string): MarkdownLine {
  const heading = line.match(/^(#{1,6})\s(.*)$/);
  if (heading) {
    return {
      kind: "heading",
      level: heading[1].length,
      prefix: `${heading[1]} `,
      text: heading[2],
    };
  }

  const quote = line.match(/^>\s?(.*)$/);
  if (quote) {
    return {
      kind: "quote",
      prefix: line.startsWith("> ") ? "> " : ">",
      text: quote[1],
    };
  }

  const unordered = line.match(/^([-*+])\s(.*)$/);
  if (unordered) {
    return {
      kind: "unordered-list",
      marker: "•",
      prefix: `${unordered[1]} `,
      text: unordered[2],
    };
  }

  const ordered = line.match(/^(\d+\.)\s(.*)$/);
  if (ordered) {
    return {
      kind: "ordered-list",
      marker: ordered[1],
      prefix: `${ordered[1]} `,
      text: ordered[2],
    };
  }

  if (/^```/.test(line.trim()) || /^ {4}/.test(line)) {
    return {
      kind: "code",
      prefix: "",
      text: line,
    };
  }

  return {
    kind: "paragraph",
    prefix: "",
    text: line,
  };
}

function parseMarkdownLines(markdown: string): MarkdownLine[] {
  const normalized = markdown.replace(/\r\n?/g, "\n");
  const lines = normalized.length > 0 ? normalized.split("\n") : [""];
  return lines.map(parseMarkdownLine);
}

function createLiveLine(line: MarkdownLine): HTMLDivElement {
  const element = document.createElement("div");
  element.className = `markdown-live-line markdown-live-${line.kind}`;
  element.dataset.liveLine = "true";
  element.dataset.prefix = line.prefix;

  if (line.kind === "heading") {
    element.classList.add("markdown-live-heading", `markdown-live-heading-${line.level || 1}`);
  }

  if (line.marker) {
    element.dataset.marker = line.marker;
  }

  if (line.text) {
    element.textContent = line.text;
  } else {
    element.appendChild(document.createElement("br"));
  }

  return element;
}

function getLiveLines(editor: HTMLElement): HTMLElement[] {
  return Array.from(editor.querySelectorAll<HTMLElement>("[data-live-line]"));
}

function getLineText(line: HTMLElement): string {
  return (line.textContent || "").replace(/\u00a0/g, " ");
}

function getLineRawLength(line: HTMLElement): number {
  return (line.dataset.prefix || "").length + getLineText(line).length;
}

function serializeEditor(editor: HTMLElement): string {
  const lines = getLiveLines(editor);
  if (lines.length === 0) return "";

  return lines.map((line) => `${line.dataset.prefix || ""}${getLineText(line)}`).join("\n");
}

function findLineForNode(editor: HTMLElement, node: Node): HTMLElement | null {
  if (node === editor) return getLiveLines(editor)[0] || null;

  const element = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  return element?.closest<HTMLElement>("[data-live-line]") || null;
}

function getLineStartOffset(editor: HTMLElement, targetLine: HTMLElement): number {
  let offset = 0;
  for (const line of getLiveLines(editor)) {
    if (line === targetLine) return offset;
    offset += getLineRawLength(line) + 1;
  }
  return offset;
}

function getTextOffsetWithinLine(line: HTMLElement, node: Node, offset: number): number {
  const range = document.createRange();
  range.selectNodeContents(line);

  try {
    range.setEnd(node, offset);
  } catch {
    range.detach();
    return getLineText(line).length;
  }

  const textOffset = range.toString().length;
  range.detach();
  return clamp(textOffset, 0, getLineText(line).length);
}

function domPointToMarkdownOffset(state: LiveEditorState, node: Node, offset: number): number | null {
  const line = findLineForNode(state.editor, node);
  if (!line) return null;

  const lineStart = getLineStartOffset(state.editor, line);
  const prefixLength = (line.dataset.prefix || "").length;
  const textOffset = getTextOffsetWithinLine(line, node, offset);

  return lineStart + prefixLength + textOffset;
}

function getEditorSelection(state: LiveEditorState): MarkdownSelection | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;

  const range = selection.getRangeAt(0);
  if (!state.editor.contains(range.startContainer) || !state.editor.contains(range.endContainer)) {
    return null;
  }

  const start = domPointToMarkdownOffset(state, range.startContainer, range.startOffset);
  const end = domPointToMarkdownOffset(state, range.endContainer, range.endOffset);
  if (start === null || end === null) return null;

  return {
    start: Math.min(start, end),
    end: Math.max(start, end),
  };
}

function getSourceSelection(source: HTMLTextAreaElement): MarkdownSelection {
  return {
    start: source.selectionStart ?? source.value.length,
    end: source.selectionEnd ?? source.value.length,
  };
}

function setSourceSelection(source: HTMLTextAreaElement, start: number, end = start): void {
  const max = source.value.length;
  source.setSelectionRange(clamp(start, 0, max), clamp(end, 0, max));
}

function findDomPointForTextOffset(line: HTMLElement, offset: number): { node: Node; offset: number } {
  const walker = document.createTreeWalker(line, NodeFilter.SHOW_TEXT);
  let remaining = offset;
  let textNode = walker.nextNode();

  while (textNode) {
    const length = textNode.textContent?.length || 0;
    if (remaining <= length) {
      return { node: textNode, offset: remaining };
    }
    remaining -= length;
    textNode = walker.nextNode();
  }

  return { node: line, offset: line.childNodes.length };
}

function markdownOffsetToDomPoint(editor: HTMLElement, markdownOffset: number): { node: Node; offset: number } {
  const lines = getLiveLines(editor);
  if (lines.length === 0) return { node: editor, offset: 0 };

  let current = 0;
  for (const line of lines) {
    const rawLength = getLineRawLength(line);
    const lineEnd = current + rawLength;

    if (markdownOffset <= lineEnd) {
      const prefixLength = (line.dataset.prefix || "").length;
      const textLength = getLineText(line).length;
      const textOffset = clamp(markdownOffset - current - prefixLength, 0, textLength);
      return findDomPointForTextOffset(line, textOffset);
    }

    current = lineEnd + 1;
  }

  const lastLine = lines[lines.length - 1];
  return findDomPointForTextOffset(lastLine, getLineText(lastLine).length);
}

function setEditorSelection(state: LiveEditorState, start: number, end = start): void {
  const selection = window.getSelection();
  if (!selection) return;

  const range = document.createRange();
  const startPoint = markdownOffsetToDomPoint(state.editor, start);
  const endPoint = markdownOffsetToDomPoint(state.editor, end);

  range.setStart(startPoint.node, startPoint.offset);
  range.setEnd(endPoint.node, endPoint.offset);

  selection.removeAllRanges();
  selection.addRange(range);
  state.editor.focus({ preventScroll: true });
}

function renderLiveEditor(state: LiveEditorState, selection?: MarkdownSelection, shouldFocus = false): void {
  state.isRendering = true;
  state.editor.replaceChildren(...parseMarkdownLines(state.source.value).map(createLiveLine));
  state.editor.classList.toggle("is-empty", state.source.value.trim().length === 0);
  state.isRendering = false;

  if (selection && shouldFocus) {
    setEditorSelection(state, selection.start, selection.end);
  }
}

function notifySourceInput(state: LiveEditorState): void {
  state.source.dispatchEvent(new Event("input", { bubbles: true }));
}

function syncSourceFromEditor(state: LiveEditorState, shouldRender: boolean): void {
  if (state.isRendering) return;

  const selection = getEditorSelection(state);
  const nextValue = serializeEditor(state.editor);

  state.isSyncingFromEditor = true;
  state.source.value = nextValue;
  if (selection) setSourceSelection(state.source, selection.start, selection.end);
  notifySourceInput(state);
  state.isSyncingFromEditor = false;

  if (shouldRender) {
    renderLiveEditor(state, selection ?? getSourceSelection(state.source), true);
  }
}

function insertMarkdownAtSelection(state: LiveEditorState, markdown: string): void {
  const liveSelection = getEditorSelection(state);
  const selection = liveSelection ?? getSourceSelection(state.source);
  const nextValue =
    state.source.value.slice(0, selection.start) + markdown + state.source.value.slice(selection.end);
  const nextCaret = selection.start + markdown.length;

  state.source.value = nextValue;
  setSourceSelection(state.source, nextCaret);
  notifySourceInput(state);
  renderLiveEditor(state, { start: nextCaret, end: nextCaret }, true);
}

function maybeRemoveBlockPrefix(state: LiveEditorState, event: KeyboardEvent): void {
  const selection = getEditorSelection(state);
  if (!selection || selection.start !== selection.end) return;

  const domSelection = window.getSelection();
  if (!domSelection || domSelection.rangeCount === 0) return;

  const range = domSelection.getRangeAt(0);
  const line = findLineForNode(state.editor, range.startContainer);
  if (!line) return;

  const prefix = line.dataset.prefix || "";
  if (!prefix) return;

  const lineStart = getLineStartOffset(state.editor, line);
  const textOffset = getTextOffsetWithinLine(line, range.startContainer, range.startOffset);
  if (textOffset !== 0 || selection.start !== lineStart + prefix.length) return;

  event.preventDefault();
  const nextValue = state.source.value.slice(0, lineStart) + state.source.value.slice(lineStart + prefix.length);
  state.source.value = nextValue;
  setSourceSelection(state.source, lineStart);
  notifySourceInput(state);
  renderLiveEditor(state, { start: lineStart, end: lineStart }, true);
}

function handleSourceChanged(state: LiveEditorState): void {
  if (!state.isSyncingFromEditor) {
    renderLiveEditor(state, getSourceSelection(state.source), document.activeElement === state.source);
  }
}

function setupLiveEditor(source: HTMLTextAreaElement): LiveEditorState {
  const existingState = stateBySource.get(source);
  if (existingState) return existingState;

  const editor = document.createElement("div");
  editor.className = "markdown-live-editor";
  editor.contentEditable = "true";
  editor.dataset.markdownLiveEditor = "true";
  editor.dataset.placeholder = source.getAttribute("placeholder") || "";
  editor.setAttribute("role", "textbox");
  editor.setAttribute("aria-multiline", "true");
  editor.setAttribute("aria-label", source.getAttribute("aria-label") || source.name || "Markdown editor");
  editor.spellcheck = true;

  source.classList.add("markdown-source-hidden");
  source.tabIndex = -1;
  source.after(editor);

  const state: LiveEditorState = {
    editor,
    isComposing: false,
    isRendering: false,
    isSyncingFromEditor: false,
    source,
  };

  stateBySource.set(source, state);

  editor.addEventListener("compositionstart", () => {
    state.isComposing = true;
  });

  editor.addEventListener("compositionend", () => {
    state.isComposing = false;
    syncSourceFromEditor(state, true);
  });

  editor.addEventListener("input", () => {
    syncSourceFromEditor(state, !state.isComposing);
  });

  editor.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      insertMarkdownAtSelection(state, "\n");
      return;
    }

    if (event.key === "Tab") {
      event.preventDefault();
      insertMarkdownAtSelection(state, "  ");
      return;
    }

    if (event.key === "Backspace") {
      maybeRemoveBlockPrefix(state, event);
    }
  });

  editor.addEventListener("paste", (event) => {
    const items = Array.from(event.clipboardData?.items || []);
    if (items.some((item) => item.type.startsWith("image/"))) return;

    const text = event.clipboardData?.getData("text/plain");
    if (text === undefined) return;

    event.preventDefault();
    insertMarkdownAtSelection(state, text.replace(/\r\n?/g, "\n"));
  });

  editor.addEventListener("keyup", () => {
    const selection = getEditorSelection(state);
    if (selection) setSourceSelection(source, selection.start, selection.end);
  });

  editor.addEventListener("mouseup", () => {
    const selection = getEditorSelection(state);
    if (selection) setSourceSelection(source, selection.start, selection.end);
  });

  source.addEventListener("focus", () => {
    const selection = getSourceSelection(source);
    requestAnimationFrame(() => setEditorSelection(state, selection.start, selection.end));
  });

  source.addEventListener("input", () => handleSourceChanged(state));
  source.addEventListener("change", () => handleSourceChanged(state));

  renderLiveEditor(state, getSourceSelection(source), false);

  return state;
}

export function refreshMarkdownRendererFor(source: HTMLTextAreaElement | null | undefined): void {
  if (!source || !source.closest<HTMLElement>("[data-markdown-renderer]")) return;

  const state = stateBySource.get(source);
  if (state) {
    renderLiveEditor(state, getSourceSelection(source), document.activeElement === source);
    return;
  }
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

    setupLiveEditor(source);
  });

  if (!selectionSyncReady) {
    selectionSyncReady = true;
    document.addEventListener("selectionchange", () => {
      const activeSource = Array.from(
        document.querySelectorAll<HTMLTextAreaElement>("textarea[data-markdown-source]")
      ).find((source) => {
        const state = stateBySource.get(source);
        const selection = window.getSelection();
        return Boolean(state && selection?.rangeCount && selection.anchorNode && state.editor.contains(selection.anchorNode));
      });

      if (!activeSource) return;

      const state = stateBySource.get(activeSource);
      const selection = state ? getEditorSelection(state) : null;
      if (selection) setSourceSelection(activeSource, selection.start, selection.end);
    });
  }
}
