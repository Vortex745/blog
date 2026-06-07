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
 * Single observer instance handles all animation types including stagger.
 */
let observer: IntersectionObserver | null = null;

function initScrollAnimations() {
  if (prefersReducedMotion()) return;

  const animated = document.querySelectorAll(
    "[data-animate='fade-up'], [data-animate='scale-in'], [data-animate='counter'], [data-animate='stagger']"
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
        else if (type === "stagger") animateStagger(el);

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

  // Stagger containers: set children initial state (observer handles trigger)
  document.querySelectorAll("[data-animate='stagger']").forEach((container) => {
    const children = container.children;
    if (children.length > 0) {
      gsap.set(children, { opacity: 0, y: 16 });
    }
  });

  // Scroll-triggered individual animations
  initScrollAnimations();
}

// 全局记录跨页前的 pill 动画状态 (已被移除，因为 nav 是 persist 的，不需要打断动画)
// 之前这里有 astro:before-swap 监听器，现在移除了，避免破坏跨页连续动画

/**
 * Transitions.dev - Tabs sliding (GSAP Core)
 * Uses GSAP to animate width and transform (x/y).
 */
export function initDockPill() {
  const navEl = document.getElementById("desktop-nav");
  const pillEl = document.getElementById("nav-pill");
  if (!navEl || !pillEl) return;

  const links = navEl.querySelectorAll<HTMLElement>(".editorial-nav-link");
  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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

  let isPillHeightSet = pillEl.style.height !== "";

  // [Performance] 使用 gsap.quickTo 缓存动画实例，避免每次调用重复创建 Tween 造成 GC 和性能损耗
  const xTo = gsap.quickTo(pillEl, "x", { duration: 0.25, ease: "power2.out" });
  const widthTo = gsap.quickTo(pillEl, "width", { duration: 0.25, ease: "power2.out" });

  function movePillTo(target: HTMLElement, animate = true) {
    if (!target || !pillEl) return;
    
    // [Performance] 集中 DOM Reads，获取最新的几何属性
    const left = target.offsetLeft;
    const width = target.offsetWidth;

    // [Performance] 垂直属性保持静态，仅在初始化时设定，不参与动画循环
    if (!isPillHeightSet) {
      gsap.set(pillEl, { height: target.offsetHeight, y: target.offsetTop });
      isPillHeightSet = true;
    }

    if (!animate || prefersReduced) {
      gsap.set(pillEl, {
        x: left,
        width,
        opacity: 1
      });
    } else {
      gsap.set(pillEl, { opacity: 1 }); // 透明度直接渐变到位
      xTo(left);
      widthTo(width);
    }
  }

  // 判断当前 DOM 状态，是否已经激活了对应的链接
  const alreadyActive = activeLink?.classList.contains("is-active");

  links.forEach(l => l.classList.toggle("is-active", l === activeLink));

  const isFirstLoad = !navEl.hasAttribute("data-pill-init");
  navEl.setAttribute("data-pill-init", "true");

  if (activeLink) {
    if (isFirstLoad) {
      movePillTo(activeLink, false);
    } else if (!alreadyActive) {
      // 只有当活动链接真正发生改变时（例如点击了浏览器的前进/后退），才触发动画
      // 如果是用户点击了链接，点击事件的回调已经触发了动画，这里不需要重复触发，从而避免打断正在进行的过渡
      movePillTo(activeLink, true);
    }
  }

  links.forEach((link) => {
    if (link.hasAttribute("data-pill-click")) return;
    link.setAttribute("data-pill-click", "true");
    
    link.addEventListener("click", () => {
      if (link.classList.contains("is-active")) return;
      links.forEach((l) => l.classList.remove("is-active"));
      link.classList.add("is-active");
      
      // 立即触发动画，提供点击即时反馈，因为 nav 被 persist，动画会跨页面无缝继续
      movePillTo(link, true);
    });
  });

  if (!navEl.hasAttribute("data-pill-resize")) {
    navEl.setAttribute("data-pill-resize", "true");
    
    // [Performance] 针对 resize 必须加防抖（Debounce），避免连续高频触发导致严重的 Layout Thrashing
    let resizeTimer: number;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        const currentActive = navEl.querySelector<HTMLElement>(".editorial-nav-link.is-active");
        if (currentActive) movePillTo(currentActive, false);
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
