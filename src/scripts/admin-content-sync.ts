// 前台 DOM 回填目前仅首页(home):文章/归档页已由 SSR + API 接管,
// 原先的列表/归档回填死代码已删除(见 GitHub issue #15)。
import { CONTENT_CHANGED_EVENT, CONTENT_STORAGE_KEYS } from "../lib/content-channel";

type AdminHome = {
  generatedDate?: string;
  guidance?: string;
  heroTitle?: string;
  heroLead?: string;
  quoteText?: string;
  quoteAuthor?: string;
};

const HOME_KEY = CONTENT_STORAGE_KEYS.home;
const SYNC_EVENT = CONTENT_CHANGED_EVENT;

let listenersBound = false;

function hasPage(pathname: string, expected: string): boolean {
  const normalized = pathname.replace(/\/+$/, "") || "/";
  return normalized === expected;
}

function readHomeData(): AdminHome | null {
  try {
    const raw = localStorage.getItem(HOME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
}

function syncHome(): void {
  if (!hasPage(window.location.pathname, "/")) return;

  const homeData = readHomeData();
  if (homeData) {
    const heroTitle = document.querySelector<HTMLElement>(".hero-title");
    const heroLead = document.querySelector<HTMLElement>(".hero-desc");
    const quoteText = document.querySelector<HTMLElement>(".quote-text");
    const quoteAuthor = document.querySelector<HTMLElement>(".quote-author");

    if (homeData.heroTitle && heroTitle) {
      heroTitle.textContent = homeData.heroTitle;
      heroTitle.style.whiteSpace = "pre-line";
    }
    if (homeData.heroLead && heroLead) heroLead.textContent = homeData.heroLead;
    if (homeData.quoteText && quoteText) quoteText.textContent = homeData.quoteText;
    if (homeData.quoteAuthor && quoteAuthor) quoteAuthor.textContent = homeData.quoteAuthor;
  }
}

function queueSync(): void {
  window.requestAnimationFrame(syncHome);
}

export function initAdminContentSync(): void {
  syncHome();

  if (listenersBound) return;
  listenersBound = true;

  window.addEventListener("storage", (event) => {
    if (event.key === HOME_KEY) queueSync();
  });
  window.addEventListener(SYNC_EVENT, queueSync);
}
