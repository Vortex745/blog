import type { MiddlewareHandler } from "astro";
import { log } from "./lib/logger";
import { getClientKeyFromRequest } from "./lib/rate-limit";

// Static asset extensions. Also keeps request logging silent: the Dockerfile
// healthcheck hits /favicon.svg every 30s and must not flood the log.
const STATIC_ASSET_PATH = /\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i;

/**
 * Performance middleware:
 * 1. Adds Cache-Control headers for static assets (immutable) and admin pages (no-cache)
 * 2. Adds security headers
 * 3. Emits one structured request log line (static assets stay silent)
 */
const onRequest: MiddlewareHandler = async (context, next) => {
  const startedAt = Date.now();
  const response = await next();

  const url = new URL(context.request.url);
  const isStaticAsset = STATIC_ASSET_PATH.test(url.pathname);
  if (!isStaticAsset) {
    log("info", "request", {
      method: context.request.method,
      path: url.pathname,
      status: response.status,
      dur_ms: Date.now() - startedAt,
      ip: getClientKeyFromRequest(context.request),
    });
  }

  const headers = new Headers(response.headers);

  // Cache static assets aggressively
  if (isStaticAsset) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else if (url.pathname.startsWith("/admin")) {
    // Admin pages: no-cache to always get fresh data
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
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
