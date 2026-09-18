import { loadGoodCountsByUrl } from '../feedback-supabase.js';
import { buildEnText, buildJaText, buildReplyText, composeBodies } from './compose.js';
import { digestUrl, latestDigestDate, pickArticle, readDigest } from './load-digest.js';
import { notifySlack, notifySlackFailure } from './notify-slack.js';
import { checkDraft, hasBlockingIssue } from './quality-gate.js';
import {
  hasDraftFor,
  loadSocialLog,
  postedUrls,
  recentBodies,
  saveSocialLog,
} from './social-log.js';
import type { GateIssue, SocialDraft } from './types.js';

const DEFAULT_SITE_URL = 'https://MTNT-Products.github.io/daily-three';

const dryRun = process.argv.includes('--dry-run');
const force = process.argv.includes('--force');
const dateArg = process.argv.find((a) => a.startsWith('--date='))?.slice('--date='.length);

async function main() {
  if (process.env.SOCIAL_ENABLED === 'false') {
    console.log('[social] Skipping: SOCIAL_ENABLED is false');
    return;
  }

  const digestDate = dateArg ?? latestDigestDate();
  if (!digestDate) {
    throw new Error('[social] No digest found under src/content/digest/ja');
  }

  const ja = readDigest('ja', digestDate);
  if (!ja) throw new Error(`[social] No ja digest for ${digestDate}`);
  const en = readDigest('en', digestDate);

  const log = loadSocialLog();
  if (!force && hasDraftFor(log, digestDate)) {
    console.log(`[social] Skipping: ${digestDate} already drafted (pass --force to redo)`);
    return;
  }

  const urls = ja.articles.map((a) => a.url);
  const goodCounts = await loadGoodCountsByUrl(urls);
  const pick = pickArticle({
    digestDate,
    urls,
    goodCounts,
    postedUrls: postedUrls(log),
  });

  const jaArticle = ja.articles[pick.index];
  const enArticle = en?.articles[pick.index] ?? jaArticle;
  const past = recentBodies(log);
  console.log(
    `[social] ${digestDate} → ${pick.index + 1}件目 (${pick.reason}): ${jaArticle.title}`,
  );

  const bodies = await composeBodies({ jaArticle, enArticle, digestDate, recentBodies: past });

  const siteUrl = process.env.SITE_URL?.trim() || DEFAULT_SITE_URL;
  const draft: SocialDraft = {
    digestDate,
    articleIndex: pick.index,
    articleUrl: jaArticle.url,
    digestUrl: digestUrl(digestDate, siteUrl),
    source: jaArticle.source,
    pickReason: pick.reason,
    image: jaArticle.image,
    jaBody: bodies.ja,
    enBody: bodies.en,
    jaText: buildJaText(jaArticle, bodies.ja, digestDate),
    enText: buildEnText(enArticle, bodies.en),
    replyText: buildReplyText(digestUrl(digestDate, siteUrl), jaArticle.url),
  };

  const issues: GateIssue[] = checkDraft({
    jaText: draft.jaText,
    enText: draft.enText,
    replyText: draft.replyText,
    jaBody: draft.jaBody,
    enBody: draft.enBody,
    jaArticle,
    enArticle,
    recentBodies: past,
  });

  if (bodies.trimmedJa) {
    issues.push({
      level: 'warn',
      code: 'trimmed-ja',
      message: '日本語本文を文末から切り詰めて 280 以内に収めた',
    });
  }
  if (bodies.trimmedEn) {
    issues.push({
      level: 'warn',
      code: 'trimmed-en',
      message: '英語本文を文末から切り詰めて 280 以内に収めた',
    });
  }

  if (!en) {
    issues.push({
      level: 'warn',
      code: 'missing-en-digest',
      message: `${digestDate} の英語 digest が無いため、英語は日本語 summary から生成`,
    });
  } else if (!en.articles[pick.index]) {
    // The en digest exists but is short of this pick, so enArticle silently fell back
    // to the Japanese one and the English post carries a Japanese headline.
    issues.push({
      level: 'warn',
      code: 'missing-en-article',
      message: `${digestDate} の英語 digest に ${pick.index + 1} 件目が無いため、英語は日本語 summary から生成`,
    });
  }

  for (const issue of issues) {
    console.log(`[social] ${issue.level}: ${issue.code} — ${issue.message}`);
  }

  if (dryRun) {
    console.log(JSON.stringify({ draft, issues }, null, 2));
    return;
  }

  await notifySlack(draft, issues);
  console.log(`[social] Sent to Slack (${hasBlockingIssue(issues) ? '要修正' : '投稿可'})`);

  log.push({
    draftedAt: new Date().toISOString(),
    digestDate,
    articleIndex: pick.index,
    articleUrl: jaArticle.url,
    pickReason: pick.reason,
    jaBody: draft.jaBody,
    enBody: draft.enBody,
    jaText: draft.jaText,
    enText: draft.enText,
    issues,
  });
  console.log('[social] Wrote', saveSocialLog(log));
}

main().catch(async (e) => {
  console.error(e);
  try {
    await notifySlackFailure('の X 下書き生成', e);
  } catch (notifyError) {
    console.error('[social] Failure notice failed too:', notifyError);
  }
  process.exit(1);
});
