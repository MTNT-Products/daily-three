import type { APIRoute } from 'astro';
import { getDigestsForLocale } from '../../lib/digest';
import { buildRssFeed } from '../../lib/rss';

export const prerender = true;

export const GET: APIRoute = async ({ site }) => {
  const digests = await getDigestsForLocale('ja');
  const xml = buildRssFeed({ locale: 'ja', digests, site });
  return new Response(xml, {
    headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' },
  });
};
