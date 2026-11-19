import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Документация. content/docs/*.md создаёт yarn sync:engine из README и docs/ программы Slideria
 * (только разделы о работе в программе, без ручек к коду); content/guide/*.md написаны для сайта.
 * Адрес страницы — имя файла: content/guide/mcp.md → /docs/mcp, index.md → /docs.
 */
const docs = defineCollection({
  loader: glob({
    pattern: ['docs/*.md', 'guide/*.md'],
    base: './content',
    generateId: ({ entry }) => entry.replace(/^.*\//, '').replace(/\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    group: z.string(),
  }),
});

export const collections = { docs };
