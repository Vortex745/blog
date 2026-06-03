// @ts-check
import { defineConfig } from "astro/config";
import react from "@astrojs/react";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

// https://astro.build/config
export default defineConfig({
  site: "https://changye.me",
  output: "server",
  adapter: vercel(),
  integrations: [react(), sitemap()],
  vite: {
    server: {
      watch: {
        ignored: ["**/.env"]
      }
    },
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["react", "react-dom", "react-dom/client", "react/jsx-runtime"]
    },
    build: {
      cssMinify: true,
      minify: true,
    },
  },
  prefetch: {
    prefetchAll: true,
    defaultStrategy: "viewport",
  },
});
