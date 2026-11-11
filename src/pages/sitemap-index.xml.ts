import type { APIRoute } from "astro";

/** Sitemap index pointing at the on-demand URL set. */
export const GET: APIRoute = async ({ site }) => {
  const base = site?.toString().replace(/\/+$/, "") ?? "";
  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    `<sitemap><loc>${base}/sitemap-0.xml</loc></sitemap>`,
    "</sitemapindex>",
  ].join("");

  return new Response(body, {
    headers: { "content-type": "application/xml; charset=utf-8" },
  });
};
