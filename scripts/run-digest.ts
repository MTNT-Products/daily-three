import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { collectArticles, markSeen } from './collect.js';
import { buildSourceWeights, loadFeedbackWeights, pickTop3Bilingual, ruleScore } from './rank.js';
import { applyRecentTopicPenalty, loadRecentStories } from './recent-digests.js';
import { filterDuplicateStories } from './story-dedup.js';
import { getLlmConfig } from './llm-config.js';
import { publishDigest } from './publish.js';
import { enrichImages } from './ogp.js';
import { sendDigestEmail } from './email.js';
import type { SourcesFile } from './types.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const config = parse(readFileSync('sources.yaml', 'utf-8')) as SourcesFile;
  const feedback = await loadFeedbackWeights();
  const sourceWeights = buildSourceWeights(config.sources, feedback);

  console.log('[digest] Collecting…');
  const raw = await collectArticles(config.sources);
  console.log(`[digest] ${raw.length} new candidates`);

  const recent = loadRecentStories(7);
  if (recent.length > 0) {
    console.log(`[digest] ${recent.length} recent story(ies) for duplicate avoidance`);
  }

  const penalized = applyRecentTopicPenalty(ruleScore(raw, config, sourceWeights), recent);
  const scored = filterDuplicateStories(penalized, recent);
  console.log(`[digest] ${scored.length} candidates after duplicate filter`);
  const llmConfig = getLlmConfig();
  const { ja, en } = await pickTop3Bilingual(scored, llmConfig, recent);
  console.log(`[digest] Picker: anthropic bilingual (model: ${llmConfig.anthropicModel})`);

  if (ja.articles.length === 0) {
    console.log('[digest] No articles to publish');
    return;
  }

  await enrichImages(ja.articles);
  for (let i = 0; i < en.articles.length; i++) {
    en.articles[i].image = ja.articles[i]?.image;
    en.articles[i].images = ja.articles[i]?.images;
    en.articles[i].video = ja.articles[i]?.video;
  }
  for (const a of ja.articles) {
    const n = a.images?.length ?? (a.image ? 1 : 0);
    console.log(`[digest] media ${a.sourceId}: ${n} image(s)`);
  }

  const now = new Date();
  const siteBase = process.env.SITE_URL ?? 'https://example.com';
  const siteUrlJa = `${siteBase.replace(/\/$/, '')}/ja/`;

  if (dryRun) {
    console.log(JSON.stringify({ ja, en }, null, 2));
    return;
  }

  const pathJa = publishDigest(now, 'ja', ja.lead, ja.articles);
  console.log('[digest] Wrote', pathJa);

  if (en.articles.length === 3 && en.lead?.trim()) {
    try {
      const pathEn = publishDigest(now, 'en', en.lead, en.articles);
      console.log('[digest] Wrote', pathEn);
    } catch (e) {
      console.warn('[digest] English publish skipped:', e);
    }
  } else {
    console.warn('[digest] English publish skipped (incomplete en content)');
  }

  markSeen(ja.articles.map((a) => a.url));
  await sendDigestEmail(ja.articles, ja.lead, siteUrlJa, now.toISOString().slice(0, 10));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
