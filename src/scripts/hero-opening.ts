import { gsap } from "gsap";

interface PlayHeroOpeningOptions {
  title: string;
}

const STORAGE_KEY = "hero-opening-played";

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function shouldPlayHeroOpening(): boolean {
  if (typeof window === "undefined") return false;
  if (prefersReducedMotion()) return false;
  const params = new URLSearchParams(window.location.search);
  if (params.get("hero-opening") === "preview") {
    sessionStorage.removeItem(STORAGE_KEY);
    return true;
  }
  return sessionStorage.getItem(STORAGE_KEY) !== "1";
}

function getHeroItems(): Element[] {
  return Array.from(document.querySelectorAll("[data-animate='hero-item']"));
}

function revealHeroItems(): void {
  const items = getHeroItems();
  if (items.length === 0) return;
  gsap.set(items, { opacity: 1, y: 0, scale: 1 });
}

function hideHeroItems(): void {
  const items = getHeroItems();
  if (items.length === 0) return;
  gsap.set(items, { opacity: 0, y: 16, scale: 0.98 });
}

function hideOverlay(): void {
  const overlay = document.querySelector("[data-hero-opening]");
  if (!overlay) return;
  gsap.set(overlay, { opacity: 0, visibility: "hidden", pointerEvents: "none" });
}

export function playHeroOpening(options: PlayHeroOpeningOptions): () => void {
  if (!shouldPlayHeroOpening()) {
    hideOverlay();
    revealHeroItems();
    return () => {};
  }

  hideHeroItems();

  const overlay = document.querySelector("[data-hero-opening]");
  const titleEl = overlay?.querySelector(".hero-opening__title");

  if (!overlay) {
    revealHeroItems();
    sessionStorage.setItem(STORAGE_KEY, "1");
    return () => {};
  }

  const tl = gsap.timeline({
    onComplete: () => {
      sessionStorage.setItem(STORAGE_KEY, "1");
      gsap.set(overlay, { visibility: "hidden", pointerEvents: "none" });
    },
  });

  tl.set(overlay, { opacity: 1, y: 0, scale: 1, visibility: "visible", filter: "blur(0px)" });

  const chars = titleEl ? titleEl.querySelectorAll(".hero-opening__char") : [];
  if (chars.length > 0) {
    gsap.set(chars, { opacity: 0, y: 40, scale: 0.65, rotateX: -30 });
    tl.to(chars, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotateX: 0,
      duration: 0.75,
      stagger: 0.05,
      ease: "back.out(1.7)",
    });
  }

  tl.to({}, { duration: 0.6 });

  const heroItems = getHeroItems();
  if (heroItems.length > 0) {
    tl.fromTo(
      heroItems,
      { opacity: 0, y: 36, scale: 0.94 },
      {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 0.75,
        stagger: 0.06,
        ease: "power2.out",
      },
      "-=0.75"
    );
  }

  tl.to(overlay, {
    opacity: 0,
    scale: 1.05,
    filter: "blur(10px)",
    duration: 0.8,
    ease: "power3.inOut",
  });

  return () => {
    tl.kill();
  };
}

export function hasHeroOpeningPlayed(): boolean {
  if (typeof window === "undefined") return false;
  return sessionStorage.getItem(STORAGE_KEY) === "1";
}

export function isHeroOpeningActive(): boolean {
  if (typeof window === "undefined") return false;
  return document.querySelector("[data-hero-opening]") !== null;
}
