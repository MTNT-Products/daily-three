import { readFileSync } from 'node:fs';
import { parse } from 'yaml';
import { collectArticles, markSeen } from './collect.js';
import { buildSourceWeights, loadFeedbackWeights, pickTop3, ruleScore } from './rank.js';
import { getLlmConfig } from './llm-config.js';
import { publishDigest } from './publish.js';
import { enrichImages } from './ogp.js';
import { sendDigestEmail } from './email.js';
import type { SourcesFile } from './types.js';

const dryRun = process.argv.includes('--dry-run');

async function main() {
  const config = parse(readFileSync('sources.yaml', 'utf-8')) as SourcesFile;
  const feedback = loadFeedbackWeights();
  const sourceWeights = buildSourceWeights(config.sources, feedback);

  console.log('[digest] Collecting…');
  const raw = await collectArticles(config.sources);
  console.log(`[digest] ${raw.length} new candidates`);

  const scored = ruleScore(raw, config, sourceWeights);
  const llmConfig = getLlmConfig();
  const { lead, articles } = await pickTop3(scored, llmConfig);
  console.log(`[digest] Picker: anthropic (model: ${llmConfig.anthropicModel})`);

  if (articles.length === 0) {
    console.log('[digest] No articles to publish');
    return;
  }

  await enrichImages(articles);

  const now = new Date();
  const siteUrl = process.env.SITE_URL ?? 'https://example.com';

  if (dryRun) {
    console.log(JSON.stringify({ lead, articles }, null, 2));
    return;
  }

  const path = publishDigest(now, lead, articles);
  console.log('[digest] Wrote', path);

  markSeen(articles.map((a) => a.url));
  await sendDigestEmail(articles, lead, siteUrl, now.toISOString().slice(0, 10));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
