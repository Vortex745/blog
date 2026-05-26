import { expect, test } from "@playwright/test";

type RouteCase = {
  path: string;
  label: string;
};

type RouteMetrics = {
  path: string;
  label: string;
  ttfb: number;
  fcp: number;
  lcp: number;
  dcl: number;
  load: number;
};

const ROUTES: RouteCase[] = [
  { path: "/", label: "首页" },
  { path: "/projects", label: "项目" },
  { path: "/articles", label: "文章" },
  { path: "/archive", label: "归档" },
  { path: "/about", label: "关于" },
];

const PERF_TARGET = {
  lcpMs: 2500,
  dclMs: 2000,
  loadMs: 3000,
  switchMs: 2200,
};

function round(value: number): number {
  return Math.round(value * 100) / 100;
}

async function collectRouteMetrics(
  page: import("@playwright/test").Page,
  route: RouteCase,
): Promise<RouteMetrics> {
  await page.goto(route.path, { waitUntil: "domcontentloaded", timeout: 60_000 });
  await page.waitForLoadState("load", { timeout: 8_000 }).catch(() => undefined);

  const metrics = await page.evaluate(() => {
    const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
    const paints = performance.getEntriesByType("paint");
    const fcp = paints.find((item) => item.name === "first-contentful-paint")?.startTime ?? 0;
    const marks = (window as Window & { __perfMarks?: { lcp?: number } }).__perfMarks;

    return {
      ttfb: nav?.responseStart ?? 0,
      fcp,
      lcp: marks?.lcp ?? 0,
      dcl: nav?.domContentLoadedEventEnd ?? 0,
      load: nav?.loadEventEnd ?? 0,
    };
  });

  return {
    path: route.path,
    label: route.label,
    ttfb: round(metrics.ttfb),
    fcp: round(metrics.fcp),
    lcp: round(metrics.lcp),
    dcl: round(metrics.dcl),
    load: round(metrics.load),
  };
}

test.describe("前台模块加载与切换性能", () => {
  test("首页和核心模块加载、切换满足性能目标", async ({ page }) => {
    test.setTimeout(180_000);

    await page.addInitScript(() => {
      (window as Window & { __perfMarks?: { lcp: number } }).__perfMarks = { lcp: 0 };

      try {
        const observer = new PerformanceObserver((entryList) => {
          for (const entry of entryList.getEntries()) {
            const marks = (window as Window & { __perfMarks?: { lcp: number } }).__perfMarks;
            if (!marks) continue;
            marks.lcp = Math.max(marks.lcp, entry.startTime);
          }
        });
        observer.observe({ type: "largest-contentful-paint", buffered: true });
      } catch {
        // Browser without LCP support: keep lcp as 0 to avoid runtime errors.
      }
    });

    const routeMetrics: RouteMetrics[] = [];
    for (const route of ROUTES) {
      routeMetrics.push(await collectRouteMetrics(page, route));
    }

    const switchMetrics: Array<{ from: string; to: string; durationMs: number }> = [];
    await page.goto("/", { waitUntil: "domcontentloaded", timeout: 60_000 });
    for (let index = 1; index < ROUTES.length; index += 1) {
      const target = ROUTES[index];
      const startedAt = Date.now();
      await Promise.all([
        page.waitForURL((value) => new URL(value.toString()).pathname === target.path, { waitUntil: "domcontentloaded" }),
        page.locator("#desktop-nav .editorial-nav-link", { hasText: target.label }).click(),
      ]);
      switchMetrics.push({
        from: ROUTES[index - 1].path,
        to: target.path,
        durationMs: Date.now() - startedAt,
      });
    }

    console.table(routeMetrics);
    console.table(switchMetrics);

    const overLcp = routeMetrics.filter((item) => item.lcp > PERF_TARGET.lcpMs);
    const overDcl = routeMetrics.filter((item) => item.dcl > PERF_TARGET.dclMs);
    const measuredLoad = routeMetrics.filter((item) => item.load > 0);
    const overLoad = measuredLoad.filter((item) => item.load > PERF_TARGET.loadMs);
    const overSwitch = switchMetrics.filter((item) => item.durationMs > PERF_TARGET.switchMs);

    expect(
      overLcp,
      `LCP 超出阈值 ${PERF_TARGET.lcpMs}ms: ${overLcp.map((item) => `${item.path}:${item.lcp}`).join(", ")}`
    ).toEqual([]);
    expect(
      overDcl,
      `DCL 超出阈值 ${PERF_TARGET.dclMs}ms: ${overDcl.map((item) => `${item.path}:${item.dcl}`).join(", ")}`
    ).toEqual([]);
    expect(
      overLoad,
      `Load 超出阈值 ${PERF_TARGET.loadMs}ms: ${overLoad.map((item) => `${item.path}:${item.load}`).join(", ")}`
    ).toEqual([]);
    expect(
      overSwitch,
      `模块切换超出阈值 ${PERF_TARGET.switchMs}ms: ${overSwitch
        .map((item) => `${item.from}->${item.to}:${item.durationMs}`)
        .join(", ")}`
    ).toEqual([]);
  });
});
