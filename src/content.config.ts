import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const digest = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/digest' }),
  schema: z.object({
    title: z.string(),
    date: z.coerce.date(),
    lead: z.string(),
    articles: z.array(
      z.object({
        title: z.string(),
        summary: z.string(),
        source: z.string(),
        sourceId: z.string(),
        url: z.string().url(),
        image: z.string().url().optional(),
      }),
    ),
  }),
});

export const collections = { digest };
