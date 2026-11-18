import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

/**
 * Документация. Файлы content/docs/*.md создаёт yarn sync:engine из README и
 * справочника компонентов движка — источник правды остаётся в репозитории HTMLPPTX.
 */
const docs = defineCollection({
  loader: glob({ pattern: '*.md', base: './content/docs' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number(),
    group: z.string(),
  }),
});

export const collections = { docs };
