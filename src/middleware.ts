import type { MiddlewareHandler } from "astro";

/**
 * Performance middleware:
 * 1. Adds Cache-Control headers for static assets and public pages
 * 2. Adds security headers
 * 3. Preconnect hints for external resources
 */
const PUBLIC_CACHE_PATHS = ["/", "/articles", "/projects", "/search", "/about"];

const onRequest: MiddlewareHandler = async (context, next) => {
  const response = await next();

  const url = new URL(context.request.url);
  const headers = new Headers(response.headers);

  // Cache static assets aggressively
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname.startsWith("/admin")) {
    // Admin pages: no-cache to always get fresh data
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  } else if (PUBLIC_CACHE_PATHS.some((p) => url.pathname === p || url.pathname === p + "/")) {
    // Public pages: CDN can cache for 60s, browser revalidates
    headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
  }

  // Security headers for all responses
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Only set X-Frame-Options for non-HTML responses (pages need to be fetchable by ClientRouter)
  const contentType = headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) {
    headers.set("X-Frame-Options", "DENY");
  }

  for (const [key, value] of headers) {
    response.headers.set(key, value);
  }

  return response;
};

export { onRequest };
