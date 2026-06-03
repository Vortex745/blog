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
  inOut: "power3.inOut",
  press: "power2.out",
};

const DURATION = {
  fast: 0.15,
  standard: 0.25,
  entrance: 0.35,
  slow: 0.5,
};

const STAGGER = {
  tight: 0.03,
  standard: 0.04,
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

  gsap.set(children, { opacity: 0, y: 16, scale: 0.98 });

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
    { opacity: 0, y: 20, scale: 0.98 },
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
    { opacity: 0, y: 16 },
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
    { opacity: 0, y: 16, scale: 0.96 },
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
    .forEach((el) => gsap.set(el, { opacity: 0, y: 20, scale: 0.98 }));

  document
    .querySelectorAll("[data-animate='scale-in']")
    .forEach((el) => gsap.set(el, { opacity: 0, y: 16, scale: 0.96 }));
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
      gsap.set(children, { opacity: 0, y: 16 });
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
  const navEl = document.getElementById("desktop-nav");
  const pillEl = document.getElementById("nav-pill");
  if (!navEl || !pillEl) return;

  const links = navEl.querySelectorAll<HTMLElement>(".editorial-nav-link");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Determine actual active link based on current URL
  const currentPath = window.location.pathname;
  let activeLink: HTMLElement | null = null;
  
  links.forEach((link) => {
    const href = link.getAttribute("href") || "/";
    const isActive = currentPath === href || (href !== "/" && currentPath.startsWith(href));
    if (isActive) {
      activeLink = link;
    }
  });

  if (!activeLink && links.length > 0) activeLink = links[0];

  function getMetrics(target: HTMLElement) {
    const navRect = navEl!.getBoundingClientRect();
    const targetRect = target.getBoundingClientRect();
    return {
      width: targetRect.width,
      height: targetRect.height,
      x: targetRect.left - navRect.left + navEl!.scrollLeft,
      y: targetRect.top - navRect.top + navEl!.scrollTop,
    };
  }

  function movePillTo(target: HTMLElement, animate = true) {
    const m = getMetrics(target);

    if (!animate || prefersReduced) {
      gsap.killTweensOf(pillEl);
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

    // --- GPU-Accelerated FLIP + Smooth Slide ---
    const currentX = (gsap.getProperty(pillEl, "x") as number) || m.x;
    const travel = Math.abs(m.x - currentX);
    
    // Stretch max 1.08 (subtle), squash gentle
    const stretch = Math.min(1.08, 1 + travel / 1200);
    const squash = Math.max(0.92, 1 - (stretch - 1) * 0.5);
    const slideDuration = 0.25;

    let curW = pillEl!.offsetWidth;
    let curH = pillEl!.offsetHeight;
    if (curW === 0) curW = m.width;
    if (curH === 0) curH = m.height;

    // FLIP: instantly set layout to final size, inverse scale to match previous size
    gsap.set(pillEl, {
      width: m.width,
      height: m.height,
      scaleX: curW / m.width,
      scaleY: curH / m.height,
      opacity: 1,
      transformOrigin: "50% 50%",
      willChange: "transform",
    });

    const tl = gsap.timeline({
      defaults: { overwrite: "auto" },
      onComplete: () => {
        gsap.set(pillEl, { clearProps: "willChange" });
      }
    });

    // Animate X/Y with smooth ease
    tl.to(pillEl, {
      x: m.x,
      y: m.y,
      duration: slideDuration,
      ease: "power4.out",
    }, 0);

    if (stretch > 1.01) {
      const targetStretchX = stretch * (curW / m.width);
      const targetSquashY = squash * (curH / m.height);
      
      tl.to(pillEl, { scaleX: targetStretchX, scaleY: targetSquashY, duration: slideDuration * 0.3, ease: "power2.out" }, 0);
      tl.to(pillEl, { scaleX: 1, scaleY: 1, duration: slideDuration * 0.7, ease: "power4.out" }, slideDuration * 0.3);
    } else {
      tl.to(pillEl, { scaleX: 1, scaleY: 1, duration: slideDuration, ease: "power4.out" }, 0);
    }
  }

  // Sync is-active classes
  links.forEach(l => l.classList.toggle("is-active", l === activeLink));

  const isFirstLoad = !navEl.hasAttribute("data-pill-init");
  if (activeLink) {
    movePillTo(activeLink, !isFirstLoad);
  }
  navEl.setAttribute("data-pill-init", "true");

  links.forEach((link) => {
    if (link.hasAttribute("data-pill-click")) return;
    link.setAttribute("data-pill-click", "true");
    
    link.addEventListener("click", () => {
      if (link === activeLink) return;
      links.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
      activeLink = link;
      
      movePillTo(link, true);
    });
  });

  if (!navEl.hasAttribute("data-pill-resize")) {
    navEl.setAttribute("data-pill-resize", "true");
    let resizeTimer: ReturnType<typeof setTimeout>;
    window.addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (activeLink) movePillTo(activeLink, false);
      }, 100);
    });
  }
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
