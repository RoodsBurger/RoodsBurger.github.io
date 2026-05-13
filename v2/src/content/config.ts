import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    summary: z.string(),
    tags: z.array(z.string()),
    category: z.array(z.enum(["code", "cad"])).default(["code"]),
    order: z.number().default(99),
    featured: z.boolean().default(false),
    cover: z.string(),
    coverAlt: z.string(),
    accent: z.string().optional(),
    model3d: z.string().optional(),
    links: z
      .object({
        github: z.string().url().optional(),
        report: z.string().optional(),
        demo: z.string().optional(),
      })
      .default({}),
    period: z.string().optional(),
  }),
});

export const collections = { projects };
