import { gsap } from "gsap";

/**
 * Admin Panel Animation System
 * Following Emil Kowalski's design engineering philosophy:
 * - Only animate low-frequency interactions (page load, modals, toasts)
 * - Never animate keyboard-initiated or high-frequency actions
 * - Use ease-out for entrances (feels responsive)
 * - Start from scale(0.95) + opacity: 0, never scale(0)
 * - Keep UI animations under 300ms; page entrances can be 400-600ms
 * - Stagger items 50-80ms apart
 * - Respect prefers-reduced-motion
 */

const EASE = {
  out: "power2.out",
  outStrong: "power3.out",
  inOut: "power2.inOut",
  nav: "power4.out",
};

const DURATION = {
  fast: 0.14,
  standard: 0.2,
  entrance: 0.28,
  modal: 0.3,
  navHandoff: 0.16,
};

const STAGGER = {
  tight: 0.03,
  standard: 0.04,
};

const NAV_TRANSITION_KEY = "admin-nav-transition";
const NAV_TRANSITION_MAX_AGE = 3000;

type NavTransition = {
  at: number;
  from: number;
  to: number;
  settled?: boolean;
};

type NavPillContext = {
  nav: HTMLElement;
  pill: HTMLElement;
  links: HTMLElement[];
  current: number;
  getY: (index: number) => number;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function readNavTransition(current: number, linkCount: number): NavTransition | null {
  const raw = sessionStorage.getItem(NAV_TRANSITION_KEY);
  sessionStorage.removeItem(NAV_TRANSITION_KEY);
  if (!raw) return null;

  try {
    const transition = JSON.parse(raw) as NavTransition;
    const isFresh = Date.now() - transition.at < NAV_TRANSITION_MAX_AGE;
    const isInRange =
      transition.from >= 0 &&
      transition.from < linkCount &&
      transition.to >= 0 &&
      transition.to < linkCount;

    if (!isFresh || !isInRange || transition.to !== current || transition.from === current) {
      return null;
    }

    return transition;
  } catch {
    return null;
  }
}

function createNavPillContext(): NavPillContext | null {
  const nav = document.querySelector<HTMLElement>(".admin-nav");
  const pill = nav?.querySelector<HTMLElement>(".nav-pill");
  const links = Array.from(nav?.querySelectorAll<HTMLElement>(".admin-nav-link") ?? []);
  if (!nav || !pill || links.length === 0) return null;

  const current = links.findIndex((l) => l.classList.contains("is-active"));
  if (current === -1) return null;

  const baseTop = links[0].offsetTop;
  const baseHeight = links[0].offsetHeight;
  const getY = (index: number) => links[index].offsetTop - baseTop;

  pill.style.top = `${baseTop}px`;
  pill.style.height = `${baseHeight}px`;

  return { nav, pill, links, current, getY };
}

function animateNavPill(
  pill: HTMLElement,
  fromY: number,
  toY: number,
  duration = DURATION.standard
): gsap.core.Timeline {
  const travel = Math.abs(toY - fromY);
  const direction = Math.sign(toY - fromY) || 1;
  const stretch = Math.min(1.1, 1 + travel / 560);
  const stretchDuration = Math.min(0.09, duration * 0.5);
  const settleDuration = Math.min(0.18, duration * 0.85);

  gsap.killTweensOf(pill);
  gsap.set(pill, {
    y: fromY,
    opacity: 1,
    scaleX: 1,
    scaleY: 1,
    transformOrigin: direction > 0 ? "50% 0%" : "50% 100%",
  });

  const tl = gsap.timeline({ defaults: { overwrite: "auto" } });

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

function animateModuleEntrance(transition: NavTransition | null) {
  if (!transition || prefersReducedMotion()) return;

  const main = document.querySelector<HTMLElement>(".admin-main");
  if (!main) return;

  const direction = Math.sign(transition.to - transition.from) || 1;
  const offset = Math.min(10, 5 + Math.abs(transition.to - transition.from) * 1.25);

  gsap.fromTo(
    main,
    { autoAlpha: 0.94, y: direction * offset, filter: "blur(2px)" },
    {
      autoAlpha: 1,
      y: 0,
      filter: "blur(0px)",
      duration: DURATION.standard,
      ease: EASE.outStrong,
      overwrite: true,
      clearProps: "opacity,visibility,transform,filter",
    }
  );
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

/** Page header entrance: title + desc fade up */
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

/** Staggered card/grid entrance */
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

/** Toolbar entrance */
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

/** List item enter (for dynamically added items) */
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

/** Nav pill slide animation — compositor-only (y + opacity + scale) */
function initNavPill(): { context: NavPillContext | null; transition: NavTransition | null } {
  const context = createNavPillContext();
  if (!context) return { context: null, transition: null };

  const { pill, links, current, getY } = context;

  const transition = readNavTransition(current, links.length);

  if (prefersReducedMotion()) {
    gsap.set(pill, { y: getY(current), opacity: 1, scale: 1 });
  } else if (transition?.settled) {
    gsap.set(pill, { y: getY(current), opacity: 1, scale: 1 });
  } else if (transition) {
    const fromY = getY(transition.from);
    const toY = getY(current);
    const duration = Math.min(0.28, Math.max(0.18, 0.16 + Math.abs(toY - fromY) / 1200));
    animateNavPill(pill, fromY, toY, duration);
  } else {
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
  }

  return { context, transition };
}

function initNavClickListeners(context: NavPillContext | null): void {
  if (!context) return;
  const { nav, pill, links, current, getY } = context;
  // Use event delegation on the nav container instead of per-link listeners
  nav.addEventListener("click", (event) => {
    const link = (event.target as HTMLElement).closest<HTMLAnchorElement>(".admin-nav-link");
    if (!link) return;

    const index = links.indexOf(link);
    if (
      index === -1 ||
      index === current ||
      !isPlainLeftClick(event as MouseEvent) ||
      !isSameOriginAdminHref(link)
    ) {
      sessionStorage.removeItem(NAV_TRANSITION_KEY);
      return;
    }

    const transition = {
      at: Date.now(),
      from: current,
      to: index,
      settled: !prefersReducedMotion(),
    } satisfies NavTransition;

    sessionStorage.setItem(
      NAV_TRANSITION_KEY,
      JSON.stringify(transition)
    );

    if (prefersReducedMotion()) return;

    event.preventDefault();

    nav.dataset.switching = "true";
    links[current].classList.remove("is-active");
    link.classList.add("is-active");

    const main = document.querySelector<HTMLElement>(".admin-main");
    const direction = Math.sign(index - current) || 1;
    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        window.location.assign(link.href);
      },
    });

    tl.add(animateNavPill(pill, getY(current), getY(index), DURATION.navHandoff), 0);

    if (main) {
      tl.to(
        main,
        {
          autoAlpha: 0.92,
          y: -direction * 6,
          filter: "blur(1.5px)",
          duration: 0.12,
          ease: EASE.out,
        },
        0
      );
    }
  });
}

/** Initialize all admin animations on page load */
export function initAdminAnimations() {
  // Nav pill
  const { context, transition: navTransition } = initNavPill();

  // Nav click listeners (event delegation, only bind once)
  initNavClickListeners(context);

  if (prefersReducedMotion()) return;

  // Module switch
  animateModuleEntrance(navTransition);

  if (!navTransition) {
    document.querySelectorAll(".admin-page-header").forEach(animatePageHeader);
    document.querySelectorAll(".toolbar").forEach(animateToolbar);

    setTimeout(() => {
      document.querySelectorAll(".admin-main").forEach((main) => {
        animateStaggerCards(main);
      });
    }, 24);
  }
}
