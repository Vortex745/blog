import { gsap } from "gsap";

/**
 * Editorial Animation System
 * Built with GSAP following Emil Kowalski's design engineering philosophy:
 * - Only animate low-frequency interactions (page load, scroll reveals)
 * - Never animate keyboard-initiated or high-frequency actions
 * - Use ease-out for entrances (feels responsive)
 * - Start from a visible scale + opacity: 0, never scale(0)
 * - Keep UI animations under 300ms; page entrances can be 400–600ms
 * - Stagger items 35–60ms apart
 * - Respect prefers-reduced-motion
 */

const EASE = {
  out: "power2.out",
  outStrong: "power3.out",
  inOut: "power2.inOut",
  press: "power1.out",
};

const DURATION = {
  fast: 0.16,
  standard: 0.28,
  entrance: 0.42,
  slow: 0.5,
};

const STAGGER = {
  tight: 0.035,
  standard: 0.045,
  loose: 0.06,
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getDelay(el: Element): number {
  const raw = el.getAttribute("data-animate-delay");
  return raw ? parseFloat(raw) : 0;
}

/**
 * Hero entrance: used for above-the-fold elements on page load.
 * Sequence: title → subtitle → actions → cards
 */
function animateHero(container: Element) {
  if (prefersReducedMotion()) return;

  const children = container.querySelectorAll("[data-animate='hero-item']");
  if (children.length === 0) return;

  gsap.set(children, { opacity: 0, y: 12, scale: 0.98 });

  gsap.to(children, {
    opacity: 1,
    y: 0,
    scale: 1,
    duration: DURATION.entrance,
    ease: EASE.outStrong,
    stagger: STAGGER.standard,
    delay: getDelay(container),
  });
}

/**
 * Fade-up: general scroll-triggered entrance.
 */
function animateFadeUp(el: Element) {
  if (prefersReducedMotion()) return;

  const delay = getDelay(el);
  gsap.fromTo(
    el,
    { opacity: 0, y: 14, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION.standard,
      ease: EASE.out,
      delay,
    }
  );
}

/**
 * Stagger children: animate direct children with a stagger.
 */
function animateStagger(container: Element) {
  if (prefersReducedMotion()) return;

  const children = container.children;
  if (children.length === 0) return;

  gsap.fromTo(
    children,
    { opacity: 0, y: 10 },
    {
      opacity: 1,
      y: 0,
      duration: DURATION.standard,
      ease: EASE.out,
      stagger: STAGGER.standard,
      delay: getDelay(container),
    }
  );
}

/**
 * Scale-in: for cards and grid items.
 */
function animateScaleIn(el: Element) {
  if (prefersReducedMotion()) return;

  const delay = getDelay(el);
  gsap.fromTo(
    el,
    { opacity: 0, y: 10, scale: 0.98 },
    {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: DURATION.standard,
      ease: EASE.out,
      delay,
    }
  );
}

/**
 * Counter: animate numbers counting up.
 */
function animateCounter(el: Element) {
  if (prefersReducedMotion()) return;

  const target = parseInt(el.textContent || "0", 10);
  if (Number.isNaN(target) || target === 0) return;

  const obj = { val: 0 };
  gsap.to(obj, {
    val: target,
    duration: DURATION.slow,
    ease: EASE.out,
    onUpdate: () => {
      el.textContent = String(Math.round(obj.val));
    },
  });
}

/**
 * Set initial hidden state for scroll-triggered elements.
 * Call this once on page load so elements are invisible before scroll.
 */
function setInitialScrollStates() {
  if (prefersReducedMotion()) return;

  document
    .querySelectorAll("[data-animate='fade-up']")
    .forEach((el) => gsap.set(el, { opacity: 0, y: 14, scale: 0.98 }));

  document
    .querySelectorAll("[data-animate='scale-in']")
    .forEach((el) => gsap.set(el, { opacity: 0, y: 10, scale: 0.98 }));
}

/**
 * Intersection Observer for scroll-triggered animations.
 * Uses a single observer instance for efficiency.
 */
let observer: IntersectionObserver | null = null;

function initScrollAnimations() {
  if (prefersReducedMotion()) return;

  const animated = document.querySelectorAll(
    "[data-animate='fade-up'], [data-animate='scale-in'], [data-animate='counter']"
  );
  if (animated.length === 0) return;

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const type = el.getAttribute("data-animate");

        if (type === "fade-up") animateFadeUp(el);
        else if (type === "scale-in") animateScaleIn(el);
        else if (type === "counter") animateCounter(el);

        observer?.unobserve(el);
      });
    },
    { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
  );

  animated.forEach((el) => observer!.observe(el));
}

/**
 * Initialize all animations on the current page.
 */
export function initAnimations() {
  // Respect reduced motion globally
  if (prefersReducedMotion()) return;

  // Set initial hidden states before any animation runs
  setInitialScrollStates();

  // Hero animations (immediate, above the fold)
  document.querySelectorAll("[data-animate='hero']").forEach(animateHero);

  // Stagger containers (scroll-triggered)
  document.querySelectorAll("[data-animate='stagger']").forEach((container) => {
    // Set children initial state immediately
    const children = container.children;
    if (children.length > 0) {
      gsap.set(children, { opacity: 0, y: 10 });
    }

    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateStagger(entry.target);
            obs.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1, rootMargin: "0px 0px -40px 0px" }
    );
    obs.observe(container);
  });

  // Scroll-triggered individual animations
  initScrollAnimations();
}

/**
 * GSAP-driven sliding pill for dock navigation.
 * Performance-optimized: only animates compositor-friendly properties
 * (x, y, scaleX, scaleY, opacity). Width/height are set once per
 * transition and compensated with scale to avoid per-frame layout thrashing.
 */
export function initDockPill() {
  const nav = document.getElementById("desktop-nav");
  const pill = document.getElementById("nav-pill");
  if (!nav || !pill) return;
  const navEl = nav;
  const pillEl = pill;

  const links = navEl.querySelectorAll<HTMLElement>(".editorial-nav-link");
  let activeLink = navEl.querySelector<HTMLElement>(".editorial-nav-link.is-active");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function getMetrics(target: HTMLElement) {
    const navRect = navEl.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return {
      width: targetRect.width,
      height: targetRect.height,
      x: targetRect.left - navRect.left + navEl.scrollLeft,
      y: targetRect.top - navRect.top + navEl.scrollTop,
    };
  }

  // gsap.quickTo reuses a single opacity tween instead of allocating on each move.
  const pillOpacityTo = gsap.quickTo(pillEl, "opacity", { duration: DURATION.fast, ease: EASE.out });

  function movePillTo(target: HTMLElement, animate = true) {
    const m = getMetrics(target);

    if (!animate || prefersReduced) {
      gsap.set(pillEl, {
        width: m.width,
        height: m.height,
        x: m.x,
        y: m.y,
        scaleX: 1,
        scaleY: 1,
        opacity: 1,
      });
      return;
    }

    // --- Performance trick ---
    // Read current layout size once (batched read)
    const curW = pillEl.offsetWidth;
    const curH = pillEl.offsetHeight;

    // Set new layout dimensions instantly (single layout write),
    // then compensate with inverse scale so it *visually* stays the same
    gsap.set(pillEl, {
      width: m.width,
      height: m.height,
      scaleX: curW / m.width,
      scaleY: curH / m.height,
    });

    // Now animate ONLY compositor properties: x, y, scaleX, scaleY
    // This keeps everything on the GPU — no layout/paint per frame
    gsap.to(pillEl, {
      x: m.x,
      y: m.y,
      scaleX: 1,
      scaleY: 1,
      duration: DURATION.standard,
      ease: EASE.outStrong,
      overwrite: true,
    });

    // Opacity via quickTo (reuses tween)
    pillOpacityTo(1);
  }

  // Initial position — no animation
  if (activeLink) {
    movePillTo(activeLink, false);
  }

  links.forEach((link) => {
    link.addEventListener("click", () => {
      const href = link.getAttribute("href");

      links.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
      activeLink = link;

      // Move pill instantly (no animate — the page will navigate immediately anyway)
      movePillTo(link, false);

      // Navigate immediately — no delay
      if (href) window.location.href = href;
    });
  });

  // Debounced resize handler
  let resizeTimer: ReturnType<typeof setTimeout>;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const current = navEl.querySelector<HTMLElement>(".editorial-nav-link.is-active");
      if (current) movePillTo(current, false);
    }, 100);
  });
}

/**
 * Re-initialize after dynamic content changes (e.g. filter rerenders).
 */
export function refreshAnimations() {
  if (observer) {
    observer.disconnect();
  }
  initAnimations();
}
