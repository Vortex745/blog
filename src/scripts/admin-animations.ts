import { gsap } from "gsap";

/**
 * Admin Panel Animation System (v3 — Optimized for View Transitions)
 *
 * Root causes of 300-500ms stutter FIXED:
 * 1. GSAP entrance animations conflicted with View Transition fade-in (double-flash)
 *    → Entrance animations now only run on FIRST load; View Transition handles subsequent
 * 2. Nav click listeners were re-attached on every swap (duplicate handlers)
 *    → Use AbortController for clean teardown + re-bind
 * 3. offsetTop/offsetHeight forced synchronous layout reflow
 *    → Cache measurements, batch reads before writes
 * 4. Persisted sidebar could keep "switching" locks across routes
 *    → Navigation no longer disables pointer events; state is synced from the URL
 */

const EASE = {
  out: "power2.out",
  outStrong: "power3.out",
  nav: "power4.out",
};

const DURATION = {
  fast: 0.14,
  standard: 0.2,
  entrance: 0.28,
  modal: 0.3,
  navPill: 0.22,
};

const STAGGER = {
  tight: 0.03,
  standard: 0.04,
};

type NavPillContext = {
  nav: HTMLElement;
  pill: HTMLElement;
  links: HTMLAnchorElement[];
  current: number;
  getY: (index: number) => number;
};

/** Module-level nav transition state — persists across View Transition swaps */
let pendingNavTo: number | null = null;
let lastActiveNavIndex: number | null = null;

/** Track whether this is the first page load (run entrance animations) vs a swap */
let isFirstLoad = true;

/** AbortController for nav click listener cleanup */
let navAbortController: AbortController | null = null;

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function normalizePath(path: string): string {
  const normalized = path.replace(/\/+$/, "");
  return normalized || "/";
}

function isLinkActiveForCurrentLocation(link: HTMLAnchorElement): boolean {
  const currentPath = normalizePath(window.location.pathname);
  const linkPath = normalizePath(new URL(link.href, window.location.href).pathname);

  if (linkPath === "/admin") {
    return currentPath === "/admin";
  }

  return currentPath === linkPath || currentPath.startsWith(`${linkPath}/`);
}

function syncActiveLinkState(links: HTMLAnchorElement[]): number {
  let activeIndex = links.findIndex(isLinkActiveForCurrentLocation);
  if (activeIndex === -1) {
    activeIndex = links.findIndex((link) => link.classList.contains("is-active"));
  }

  links.forEach((link, index) => {
    link.classList.toggle("is-active", index === activeIndex);
  });

  return activeIndex;
}

/** Batch-read all link positions, then write pill position — avoids layout thrashing */
function createNavPillContext(): NavPillContext | null {
  const nav = document.querySelector<HTMLElement>(".admin-nav");
  const pill = nav?.querySelector<HTMLElement>(".nav-pill");
  const links = Array.from(nav?.querySelectorAll<HTMLAnchorElement>(".admin-nav-link") ?? []);
  if (!nav || !pill || links.length === 0) return null;

  delete nav.dataset.switching;
  nav.removeAttribute("aria-busy");

  const current = syncActiveLinkState(links);
  if (current === -1) return null;

  // Batch all layout READS first
  const positions = links.map((l) => l.offsetTop);
  const baseTop = positions[0];
  const baseHeight = links[current].offsetHeight;
  const getY = (index: number) => positions[index] - baseTop;

  // Batch all layout WRITES after reads
  pill.style.top = `${baseTop}px`;
  pill.style.height = `${baseHeight}px`;

  return { nav, pill, links, current, getY };
}

function animateNavPill(
  pill: HTMLElement,
  fromY: number,
  toY: number,
  duration = DURATION.navPill
): gsap.core.Timeline {
  const travel = Math.abs(toY - fromY);
  const direction = Math.sign(toY - fromY) || 1;
  const stretch = Math.min(1.045, 1 + travel / 1200);
  const stretchDuration = Math.min(0.06, duration * 0.4);
  const settleDuration = Math.min(0.12, duration * 0.7);

  gsap.killTweensOf(pill);
  gsap.set(pill, {
    y: fromY,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: direction > 0 ? "50% 0%" : "50% 100%",
  });

  const tl = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      gsap.set(pill, { y: toY, scaleX: 1, scaleY: 1, opacity: 1 });
    },
  });
  tl.to(pill, { y: toY, duration, ease: EASE.nav }, 0);

  if (stretch > 1.01) {
    tl.to(
      pill,
      { scaleY: stretch, scaleX: 0.985, duration: stretchDuration, ease: EASE.out },
      0
    ).to(
      pill,
      { scaleY: 1, scaleX: 1, duration: settleDuration, ease: EASE.outStrong },
      duration * 0.34
    );
  }

  return tl;
}

function isPlainLeftClick(event: MouseEvent): boolean {
  return (
    event.detail !== 0 &&
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  );
}

function isSameOriginAdminHref(link: HTMLAnchorElement): boolean {
  const url = new URL(link.href, window.location.href);
  return url.origin === window.location.origin && url.pathname.startsWith("/admin");
}

/** Page header entrance — ONLY runs on first load */
function animatePageHeader(container: Element) {
  if (prefersReducedMotion()) return;
  const items = container.querySelectorAll(".admin-page-title, .admin-page-desc");
  if (items.length === 0) return;
  gsap.set(items, { opacity: 0, y: 14, scale: 0.98 });
  gsap.to(items, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: DURATION.entrance,
    ease: EASE.outStrong,
    stagger: STAGGER.tight,
  });
}

/** Staggered card entrance — ONLY runs on first load */
function animateStaggerCards(container: Element) {
  if (prefersReducedMotion()) return;
  const cards = container.querySelectorAll(
    ".admin-card, .form-section, .project-card, .article-card, .gallery-card"
  );
  if (cards.length === 0) return;
  gsap.set(cards, { opacity: 0, y: 16, scale: 0.97 });
  gsap.to(cards, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: DURATION.entrance,
    ease: EASE.out,
    stagger: STAGGER.standard,
  });
}

/** Toolbar entrance — ONLY runs on first load */
function animateToolbar(container: Element) {
  if (prefersReducedMotion()) return;
  const toolbar = container.querySelector(".toolbar");
  if (!toolbar) return;
  gsap.set(toolbar, { opacity: 0, y: 10 });
  gsap.to(toolbar, {
    opacity: 1,
    y: 0,
    duration: DURATION.standard,
    ease: EASE.out,
  });
}

/** Modal open animation */
export function animateModalOpen(modal: HTMLElement) {
  if (prefersReducedMotion()) {
    modal.style.display = "flex";
    return;
  }
  const backdrop = modal.querySelector<HTMLElement>(".modal-backdrop");
  const panel = modal.querySelector<HTMLElement>(".modal-panel");

  modal.style.display = "flex";
  if (backdrop) {
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: DURATION.modal, ease: EASE.out });
  }
  if (panel) {
    gsap.fromTo(
      panel,
      { opacity: 0, scale: 0.96, y: 20 },
      { opacity: 1, scale: 1, y: 0, duration: DURATION.modal, ease: EASE.outStrong }
    );
  }
}

/** Modal close animation */
export function animateModalClose(modal: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    modal.style.display = "none";
    onComplete?.();
    return;
  }
  const backdrop = modal.querySelector<HTMLElement>(".modal-backdrop");
  const panel = modal.querySelector<HTMLElement>(".modal-panel");

  const tl = gsap.timeline({
    onComplete: () => {
      modal.style.display = "none";
      onComplete?.();
    },
  });

  if (panel) {
    tl.to(panel, {
      opacity: 0,
      scale: 0.98,
      y: 12,
      duration: DURATION.fast,
      ease: "power2.in",
    });
  }
  if (backdrop) {
    tl.to(backdrop, { opacity: 0, duration: DURATION.fast, ease: "power2.in" }, "<");
  }
}

/** Slide-in toast/notification */
export function animateSlideIn(el: HTMLElement, from: "left" | "right" = "right") {
  if (prefersReducedMotion()) {
    el.style.opacity = "1";
    el.style.transform = "translateX(0)";
    return;
  }
  const xStart = from === "right" ? 40 : -40;
  gsap.fromTo(
    el,
    { opacity: 0, x: xStart },
    { opacity: 1, x: 0, duration: DURATION.standard, ease: EASE.outStrong }
  );
}

/** Fade out and remove element */
export function animateFadeOut(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    el.style.opacity = "0";
    onComplete?.();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    y: -8,
    scale: 0.98,
    duration: DURATION.fast,
    ease: "power2.in",
    onComplete,
  });
}

/** List item enter */
export function animateListItemEnter(el: HTMLElement) {
  if (prefersReducedMotion()) return;
  gsap.fromTo(
    el,
    { opacity: 0, y: 12, scale: 0.98 },
    { opacity: 1, y: 0, scale: 1, duration: DURATION.standard, ease: EASE.out }
  );
}

/** List item exit */
export function animateListItemExit(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    onComplete?.();
    return;
  }
  gsap.to(el, {
    opacity: 0,
    x: -20,
    height: 0,
    margin: 0,
    padding: 0,
    duration: DURATION.standard,
    ease: "power2.in",
    onComplete,
  });
}

/** Initialize nav pill position + click listeners (with cleanup) */
function initNavPillAndListeners(): void {
  // Clean up previous listener to prevent duplicates
  if (navAbortController) {
    navAbortController.abort();
  }
  navAbortController = new AbortController();

  const context = createNavPillContext();
  if (!context) return;

  const { nav, pill, links, current, getY } = context;
  const reducedMotion = prefersReducedMotion();
  const pendingTo = pendingNavTo;

  if (reducedMotion) {
    gsap.killTweensOf(pill);
    gsap.set(pill, { y: getY(current), opacity: 1, scale: 1 });
    pendingNavTo = null;
  } else if (pendingTo === current) {
    if (!gsap.isTweening(pill)) {
      gsap.set(pill, { y: getY(current), opacity: 1, scale: 1 });
    }
    pendingNavTo = null;
  } else if (!isFirstLoad && lastActiveNavIndex !== null && lastActiveNavIndex !== current) {
    animateNavPill(pill, getY(lastActiveNavIndex), getY(current), DURATION.navPill);
    pendingNavTo = null;
  } else if (isFirstLoad) {
    // First load — subtle entrance
    gsap.fromTo(
      pill,
      { opacity: 0, y: getY(current), scaleX: 0.98, scaleY: 0.96 },
      {
        opacity: 1,
        scaleX: 1,
        scaleY: 1,
        duration: DURATION.fast,
        ease: EASE.outStrong,
        overwrite: true,
      }
    );
  } else {
    // Swap — pill should already be in position, just ensure visible
    gsap.set(pill, { y: getY(current), opacity: 1, scale: 1 });
  }
  lastActiveNavIndex = current;

  // Click listener with AbortController for clean teardown
  nav.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(".admin-nav-link");
    if (!link) return;

    const index = links.indexOf(link);
    const activeIndex = links.findIndex((item) => item.classList.contains("is-active"));
    const fromIndex = activeIndex === -1 ? current : activeIndex;
    if (
      index === -1 ||
      index === fromIndex ||
      !isPlainLeftClick(event as MouseEvent) ||
      !isSameOriginAdminHref(link)
    ) {
      return;
    }

    pendingNavTo = index;
    lastActiveNavIndex = index;
    links.forEach((item, itemIndex) => {
      item.classList.toggle("is-active", itemIndex === index);
    });

    if (reducedMotion) {
      gsap.set(pill, { y: getY(index), opacity: 1, scale: 1 });
    } else {
      animateNavPill(pill, getY(fromIndex), getY(index), DURATION.navPill);
    }
  }, { signal: navAbortController.signal });
}

/** Run page entrance animations — ONLY on first load, NOT on swaps */
function runPageEntranceAnimations(): void {
  if (!isFirstLoad) return;
  if (prefersReducedMotion()) return;

  document.querySelectorAll(".admin-page-header").forEach(animatePageHeader);
  document.querySelectorAll(".toolbar").forEach(animateToolbar);

  requestAnimationFrame(() => {
    document.querySelectorAll(".admin-main").forEach((main) => {
      animateStaggerCards(main);
    });
  });
}

/** Initialize all admin animations */
export function initAdminAnimations(): void {
  initNavPillAndListeners();
  runPageEntranceAnimations();

  // After first load, mark as not first load anymore
  if (isFirstLoad) {
    isFirstLoad = false;
  }
}
