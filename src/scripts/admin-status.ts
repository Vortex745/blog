// Shared status-bar helper for the admin pages.
// Replaces 12+ inline "find element -> set class -> set text -> timed clear"
// copies. Per-page cadence is intentionally preserved: gallery clears after
// 4000ms, save-status bars after 3000ms, and the home page never auto-clears
// "info" messages.

export type AdminStatusType = "success" | "error" | "info";

export type ShowStatusOptions = {
  /** Base CSS class; rendered as `${className} is-${type}`. Default "save-status". */
  className?: string;
  /** Auto-clear delay in ms. 0 disables auto-clear. Default 3000. */
  clearMs?: number;
  /** When true, "info" messages are not auto-cleared (home.astro behavior). */
  keepInfo?: boolean;
};

const DEFAULT_STATUS_CLASS = "save-status";
const DEFAULT_CLEAR_MS = 3000;

export function showElementStatus(
  element: HTMLElement | null,
  text: string,
  type: AdminStatusType | string,
  options: ShowStatusOptions = {}
): void {
  if (!element) return;
  const baseClass = options.className ?? DEFAULT_STATUS_CLASS;
  element.textContent = text;
  element.className = `${baseClass} is-${type}`;

  if (options.keepInfo && type === "info") return;
  const clearMs = options.clearMs === undefined ? DEFAULT_CLEAR_MS : options.clearMs;
  if (clearMs === null || clearMs <= 0) return;
  setTimeout(() => {
    element.textContent = "";
    element.className = baseClass;
  }, clearMs);
}
