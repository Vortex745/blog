import type { MiddlewareResponseHandler } from "astro";

/**
 * Performance middleware:
 * 1. Adds Cache-Control headers for static assets
 * 2. Adds security headers
 * 3. Preconnect hints for external resources
 */
const onRequest: MiddlewareResponseHandler = async (context, next) => {
  const response = await next();

  // Only modify HTML responses for admin pages
  const url = new URL(context.request.url);
  if (!url.pathname.startsWith("/admin")) {
    return response;
  }

  // Add performance and security headers
  const headers = new Headers(response.headers);

  // Cache static assets aggressively
  if (url.pathname.match(/\.(js|css|woff2?|ttf|svg|png|jpg|jpeg|webp|ico)$/i)) {
    headers.set("Cache-Control", "public, max-age=31536000, immutable");
  } else {
    // Admin pages: no-cache to always get fresh data
    headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
  }

  // Security headers
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

export { onRequest };
