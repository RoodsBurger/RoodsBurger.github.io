import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()).max(4),
    category: z.array(z.enum(["code", "cad"])).default(["code"]),
    order: z.number().default(99),
    featured: z.boolean().default(false),
    cover: z.string(),
    coverAlt: z.string(),
    coverTall: z.string().optional(),
    accent: z.string().optional(),
    model3d: z.string().optional(),
    links: z
      .object({
        github: z.string().url().optional(),
        report: z.string().optional(),
        demo: z.string().optional(),
        more: z.array(z.object({ label: z.string(), url: z.string().url() })).optional(),
      })
      .default({}),
    period: z.string().optional(),
  }),
});

export const collections = { projects };
