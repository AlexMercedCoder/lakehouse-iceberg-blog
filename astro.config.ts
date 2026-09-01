import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import react from "@astrojs/react";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import sitemap from "@astrojs/sitemap";
import { SITE } from "./src/config";
import rehypeExternalLinks from "rehype-external-links";

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  prefetch: true,
  integrations: [
    react(),
    sitemap({
      // Drop paginated tag clone pages (/tags/{tag}/1/, /2+, ...) from the
      // sitemap — they duplicate the base tag listing and steal crawl budget.
      filter: page => !/\/tags\/[^/]+\/\d+\/?$/.test(new URL(page).pathname),
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkToc,
      [
        remarkCollapse,
        {
          test: "Table of contents",
        },
      ],
    ],
    rehypePlugins: [
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["noopener", "noreferrer"],
        },
      ],
    ],
    shikiConfig: {
      theme: "one-dark-pro",
      wrap: true,
    },
  },
  vite: {
    // Tailwind 4 is a Vite plugin rather than an Astro integration.
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  scopedStyleStrategy: "where",
  image: {
    domains: ["i.imgur.com"],
  },
});
