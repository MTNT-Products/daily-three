import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { collectArticles, markSeen } from './collect.js';
import { buildSourceWeights, loadFeedbackWeights, pickTop3Bilingual, ruleScore } from './rank.js';
import { applyRecentTopicPenalty, loadRecentStories } from './recent-digests.js';
import { filterDuplicateStories } from './story-dedup.js';
import { getLlmConfig } from './llm-config.js';
import {
  digestEditionCalendarDate,
  digestPublishDate,
  isDigestWeekday,
} from './digest-schedule.js';
import { publishDigest } from './publish.js';
import { enrichImages } from './ogp.js';
import type { SourcesFile } from './types.js';

const dryRun = process.argv.includes('--dry-run');
const forceRun = process.argv.includes('--force');

async function main() {
  const config = parse(readFileSync('sources.yaml', 'utf-8')) as SourcesFile;
  const feedback = await loadFeedbackWeights();
  const sourceWeights = buildSourceWeights(config.sources, feedback);

  console.log('[digest] Collecting…');
  const raw = await collectArticles(config.sources, config.collection);
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
  const missingImages = ja.articles.filter((a) => !a.image);
  for (const a of ja.articles) {
    const n = a.images?.length ?? (a.image ? 1 : 0);
    console.log(`[digest] media ${a.sourceId}: ${n} image(s)${a.image ? '' : ' — MISSING'}`);
  }
  if (missingImages.length > 0) {
    const titles = missingImages.map((a) => a.title).join('; ');
    throw new Error(
      `[digest] ${missingImages.length} article(s) have no reachable hero image after enrichment: ${titles}`,
    );
  }

  const now = new Date();
  if (!dryRun && !forceRun && !isDigestWeekday(now)) {
    console.log('[digest] Skipping: weekend in Asia/Tokyo (pass --force to override)');
    return;
  }

  const edition = digestEditionCalendarDate(now);
  const publishDate = digestPublishDate(now);
  console.log(`[digest] Edition date (JST): ${edition}`);

  if (dryRun) {
    console.log(JSON.stringify({ ja, en }, null, 2));
    return;
  }

  const pathJa = publishDigest(publishDate, 'ja', ja.lead, ja.articles);
  console.log('[digest] Wrote', pathJa);

  if (en.articles.length === 3 && en.lead?.trim()) {
    try {
      const pathEn = publishDigest(publishDate, 'en', en.lead, en.articles);
      console.log('[digest] Wrote', pathEn);
    } catch (e) {
      console.warn('[digest] English publish skipped:', e);
    }
  } else {
    console.warn('[digest] English publish skipped (incomplete en content)');
  }

  markSeen(ja.articles.map((a) => a.url));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
