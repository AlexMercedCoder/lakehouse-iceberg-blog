import { SITE } from "@config";
import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/blog",
    // Every post declares its own slug in frontmatter, and the legacy API used
    // that for the URL. A Content Layer id defaults to the file path, which
    // would drag all 497 posts into /posts/2024/... and break every link to
    // them, so the frontmatter slug is what the id is built from.
    generateId: ({ entry, data }) =>
      typeof data.slug === "string" && data.slug
        ? data.slug
        : entry.replace(/\.md$/, ""),
  }),
  schema: ({ image }) =>
    z.object({
      author: z.string().default(SITE.author),
      pubDatetime: z.date(),
      modDatetime: z.date().optional().nullable(),
      title: z.string(),
      featured: z.boolean().optional(),
      draft: z.boolean().optional(),
      tags: z.array(z.string()).default(["others"]),
      ogImage: image()
        .refine(img => img.width >= 1200 && img.height >= 630, {
          message: "OpenGraph image must be at least 1200 X 630 pixels!",
        })
        .or(z.string())
        .optional(),
      description: z.string(),
      faqs: z
        .array(
          z.object({
            question: z.string(),
            answer: z.string(),
          })
        )
        .optional(),
      canonicalURL: z.string().optional(),
    }),
});

const iceberg = defineCollection({
  // No frontmatter slugs here, so the filename is the id, exactly as before.
  loader: glob({ pattern: "**/*.md", base: "./src/content/iceberg" }),
  schema: z.object({
    term: z.string(),
    description: z.string(),
    category: z.string(),
    relatedTerms: z.array(z.string()).default([]),
    keywords: z.array(z.string()).default([]),
    lastUpdated: z.date(),
  }),
});

export const collections = { blog, iceberg };
