import { isLensSupported, liquidGlass, type LiquidGlassController } from "./lens.js";

const lenses = new Map<HTMLElement, LiquidGlassController>();
const reducedTransparency = window.matchMedia("(prefers-reduced-transparency: reduce)");
let observer: MutationObserver | undefined;
let started = false;

function markWebKit() {
  const ua = navigator.userAgent;
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const safari = /^((?!chrome|chromium|android).)*safari/i.test(ua);
  if (iOS || safari) document.documentElement.dataset.engine = "webkit";
}

function mountSurface(el: HTMLElement) {
  if (lenses.has(el) || !isLensSupported() || reducedTransparency.matches) return;
  lenses.set(el, liquidGlass(el, { rim: 40, edge: 1.1, power: 2.6, dispersion: 0.15 }));
}

function unmountSurface(el: HTMLElement) {
  lenses.get(el)?.destroy();
  lenses.delete(el);
}

function mountWithin(root: ParentNode) {
  if (root instanceof HTMLElement && root.matches(".glass")) mountSurface(root);
  root.querySelectorAll<HTMLElement>(".glass").forEach(mountSurface);
}

function unmountWithin(root: ParentNode) {
  if (root instanceof HTMLElement && lenses.has(root)) unmountSurface(root);
  root.querySelectorAll<HTMLElement>(".glass").forEach((el) => {
    if (lenses.has(el)) unmountSurface(el);
  });
}

export function initLiquidGlass() {
  markWebKit();
  mountWithin(document);
  if (started) return;
  started = true;

  if (isLensSupported()) {
    observer = new MutationObserver((records) => {
      for (const record of records) {
        if (record.type === "attributes" && record.target instanceof HTMLElement) {
          if (record.target.matches(".glass")) mountSurface(record.target);
          else unmountSurface(record.target);
          continue;
        }
        record.addedNodes.forEach((node) => {
          if (node instanceof HTMLElement) mountWithin(node);
        });
        record.removedNodes.forEach((node) => {
          if (node instanceof HTMLElement) unmountWithin(node);
        });
      }
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class"],
    });
  }

  reducedTransparency.addEventListener("change", () => {
    if (reducedTransparency.matches) {
      lenses.forEach((lens) => lens.destroy());
      lenses.clear();
    } else {
      mountWithin(document);
    }
  });
}
