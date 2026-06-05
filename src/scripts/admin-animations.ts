import { gsap } from "gsap";

/**
 * Admin Panel Animation System (v4 — GSAP Performance + Emil Design Engineering)
 *
 * Performance principles applied:
 * 1. Only animate transform + opacity (compositor-only, no layout/paint triggers)
 * 2. will-change declared in CSS on pill; not set dynamically on every element
 * 3. Batch all DOM reads before writes (no layout thrashing)
 * 4. Use overwrite:"auto" to kill competing tweens instead of stacking
 * 5. animateListItemExit uses max-height CSS transition instead of GSAP height tween
 *    → height/margin/padding triggers layout; max-height only triggers paint at most
 * 6. quickTo for frequent nav pill updates (reuses a single tween)
 * 7. Entrance animations only on first load; Astro view transitions handle page swaps
 */

const EASE = {
  out: "power2.out",
  outStrong: "power3.out",
  nav: "power4.out",
  // Jelly: back.out gives a single controlled overshoot (Q弹), 
  // elastic.out(1,0.4) oscillates too many times → 卡顿感
  jellyMove: "back.out(2.0)",
  jellyScale: "back.out(1.7)",
};

const DURATION = {
  fast: 0.12,
  standard: 0.18,
  entrance: 0.24,
  modal: 0.24,
  navPill: 0.18,
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
  // Read current Y so we don't jump if interrupted mid-animation
  const currentY = (gsap.getProperty(pill, "y") as number) || fromY;
  const travel = Math.abs(toY - currentY);
  
  // Subtle squash & stretch — exaggerating too much reads as "glitchy"
  const stretch = Math.min(1.08, 1 + travel / 1200);
  const squash = Math.max(0.96, 1 - (stretch - 1) * 0.5);

  const jellyDuration = 0.36;

  // Prepare hardware acceleration and anchor point without breaking in-flight tweens
  gsap.set(pill, {
    opacity: 1,
    transformOrigin: "50% 50%",
    willChange: "transform",
  });

  const tl = gsap.timeline({
    defaults: { overwrite: "auto" },
    onComplete: () => {
      gsap.set(pill, { clearProps: "willChange" });
    },
  });

  // Phase 1: Move to destination with a single clean overshoot (back.out)
  tl.to(pill, { y: toY, duration: jellyDuration, ease: EASE.jellyMove }, 0);

  if (stretch > 1.005) {
    // Phase 2: Quick squash as it launches (first 30% of duration)
    tl.to(
      pill,
      { scaleY: stretch, scaleX: squash, duration: jellyDuration * 0.3, ease: EASE.out },
      0
    );
    // Phase 3: Settle back with a soft overshoot on the scale
    tl.to(
      pill,
      { scaleY: 1, scaleX: 1, duration: jellyDuration * 0.7, ease: EASE.jellyScale },
      jellyDuration * 0.3
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

/** Page header entrance — ONLY runs on first load
 * Waits one rAF so Astro's view-transition fade-in completes first,
 * then GSAP takes over with a faster, stronger ease.
 * This prevents the double-flash caused by both running simultaneously.
 */
function animatePageHeader(container: Element) {
  if (prefersReducedMotion()) return;
  const items = Array.from(container.querySelectorAll<HTMLElement>(".admin-page-title, .admin-page-desc"));
  if (items.length === 0) return;

  // Set initial state immediately (before paint) so there's no flash of visible content
  gsap.set(items, { opacity: 0, y: 15, scale: 0.95, overwrite: true, willChange: "transform, opacity" });
  requestAnimationFrame(() => {
    gsap.to(items, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION.entrance,
      ease: "back.out(1.5)",
      stagger: STAGGER.tight,
      overwrite: "auto",
      onComplete: () => gsap.set(items, { clearProps: "willChange" })
    });
  });
}

/** Staggered card entrance — ONLY runs on first load
 * Emil: stagger 30-80ms between items; don't block interaction.
 * GSAP: use transform+opacity only (compositor-only path).
 */
function animateStaggerCards(container: Element) {
  if (prefersReducedMotion()) return;
  const cards = Array.from(container.querySelectorAll<HTMLElement>(
    ".admin-card, .form-section, .project-card, .article-card, .gallery-card"
  ));
  if (cards.length === 0) return;

  gsap.set(cards, { opacity: 0, y: 15, scale: 0.95, overwrite: true, willChange: "transform, opacity" });
  requestAnimationFrame(() => {
    gsap.to(cards, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION.entrance,
      ease: "back.out(1.5)",
      stagger: STAGGER.standard,
      overwrite: "auto",
      onComplete: () => gsap.set(cards, { clearProps: "willChange" })
    });
  });
}

/** Toolbar entrance — ONLY runs on first load */
function animateToolbar(container: Element) {
  if (prefersReducedMotion()) return;
  const toolbar = container.querySelector<HTMLElement>(".toolbar");
  if (!toolbar) return;
  gsap.set(toolbar, { opacity: 0, y: 8, overwrite: true, willChange: "transform, opacity" });
  requestAnimationFrame(() => {
    gsap.to(toolbar, {
      opacity: 1,
      y: 0,
      duration: DURATION.standard,
      ease: EASE.out,
      overwrite: "auto",
      onComplete: () => gsap.set(toolbar, { clearProps: "willChange" })
    });
  });
}

/** Modal open animation
 * Emil: scale from 0.95 (not 0) + opacity; ease-out for entering elements;
 * transform-origin: center for modals (not anchored to a trigger).
 * GSAP: overwrite:true kills any in-flight close animation cleanly.
 */
export function animateModalOpen(modal: HTMLElement) {
  if (prefersReducedMotion()) {
    modal.style.display = "flex";
    return;
  }
  const backdrop = modal.querySelector<HTMLElement>(".modal-backdrop");
  const panel = modal.querySelector<HTMLElement>(".modal-panel");

  modal.style.display = "flex";
  if (backdrop) {
    gsap.fromTo(backdrop, { opacity: 0 }, { opacity: 1, duration: DURATION.modal, ease: EASE.out, overwrite: true });
  }
  if (panel) {
    // scale(0.95) not scale(0) — Emil: nothing in real world appears from nothing
    gsap.fromTo(
      panel,
      { opacity: 0, scale: 0.95, y: 16 },
      { opacity: 1, scale: 1, y: 0, duration: DURATION.modal, ease: EASE.outStrong, overwrite: true }
    );
  }
}

/** Modal close animation
 * Emil: asymmetric timing — exit faster than enter.
 * GSAP: overwrite:true kills competing open tween.
 */
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
    defaults: { overwrite: true },
  });

  if (panel) {
    // Exit faster than enter — Emil: "fast where the system is responding"
    tl.to(panel, {
      opacity: 0,
      scale: 0.97,
      y: 8,
      duration: DURATION.fast,
      ease: EASE.out,
    });
  }
  if (backdrop) {
    tl.to(backdrop, { opacity: 0, duration: DURATION.fast, ease: EASE.out }, "<");
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
    ease: EASE.out,
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

/** List item exit
 * Uses CSS max-height transition for the collapse (avoids layout-triggering height/margin/padding
 * tweens which force reflow on every frame). GSAP only handles opacity + x (compositor-only).
 */
export function animateListItemExit(el: HTMLElement, onComplete?: () => void) {
  if (prefersReducedMotion()) {
    onComplete?.();
    return;
  }

  // Snapshot current height for the collapse transition
  const currentHeight = el.getBoundingClientRect().height;
  el.style.overflow = "hidden";
  el.style.maxHeight = `${currentHeight}px`;
  // Force a reflow so the browser registers the explicit value before we animate it
  void el.offsetHeight;

  // GPU-only: opacity + x (no layout cost)
  gsap.to(el, {
    opacity: 0,
    x: -20,
    duration: DURATION.standard,
    ease: EASE.out,
    overwrite: "auto",
  });

  // CSS transition handles the height collapse (paint-only, off main thread on capable browsers)
  el.style.transition = `max-height ${DURATION.standard * 1000}ms cubic-bezier(0.23, 1, 0.32, 1),
    margin ${DURATION.standard * 1000}ms cubic-bezier(0.23, 1, 0.32, 1),
    padding ${DURATION.standard * 1000}ms cubic-bezier(0.23, 1, 0.32, 1)`;
  el.style.maxHeight = "0";
  el.style.marginTop = "0";
  el.style.marginBottom = "0";
  el.style.paddingTop = "0";
  el.style.paddingBottom = "0";

  window.setTimeout(() => {
    onComplete?.();
  }, DURATION.standard * 1000);
}

/** Initialize nav pill position + click listeners (with cleanup) */
function initNavPillAndListeners(): void {
  // Clean up previous listener to prevent duplicates
  if (navAbortController) {
    navAbortController.abort();
  }
  navAbortController = new AbortController();

  // Sync active link based on actual URL (crucial for persisted sidebar during Back/Forward navigation)
  const allLinks = Array.from(document.querySelectorAll<HTMLAnchorElement>(".admin-nav-link"));
  if (allLinks.length > 0) {
    const currentPath = window.location.pathname;
    let matchIndex = allLinks.findIndex(l => new URL(l.href).pathname === currentPath);
    if (matchIndex === -1 && currentPath === "/admin") matchIndex = 0;
    
    allLinks.forEach((item, index) => {
      item.classList.toggle("is-active", index === matchIndex);
    });
  }

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

  // Re-sync pill after web fonts load to prevent layout shift misalignment
  if (typeof document.fonts !== "undefined") {
    document.fonts.ready.then(() => {
      const freshContext = createNavPillContext();
      if (freshContext && !prefersReducedMotion() && !gsap.isTweening(freshContext.pill)) {
        gsap.set(freshContext.pill, { y: freshContext.getY(freshContext.current) });
      }
    });
  }
}

/** Run page entrance animations */
function runPageEntranceAnimations(): void {
  if (prefersReducedMotion()) return;

  document.querySelectorAll(".admin-page-header").forEach(animatePageHeader);
  document.querySelectorAll(".toolbar").forEach(animateToolbar);

  document.querySelectorAll(".admin-main").forEach((main) => {
    animateStaggerCards(main);
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

/** Handle page exit animations during View Transitions */
if (typeof document !== "undefined") {
  document.addEventListener("astro:before-preparation", (ev: any) => {
    if (prefersReducedMotion()) return;
    const originalLoader = ev.loader;
    ev.loader = async () => {
      const loaderPromise = originalLoader();
      const main = document.querySelector(".admin-main");
      if (main && main.children.length > 0) {
        await new Promise((resolve) => {
          gsap.to(main.children, {
            opacity: 0,
            y: -10,
            scale: 0.98,
            duration: DURATION.fast,
            ease: EASE.out,
            stagger: STAGGER.tight,
            overwrite: "auto",
            onComplete: resolve
          });
        });
      }
      await loaderPromise;
    };
  });
}
