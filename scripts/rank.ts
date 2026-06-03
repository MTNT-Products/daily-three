import type { DigestArticle, RawArticle, ScoredArticle, SourcesFile } from './types.js';
import { getLlmConfig, type LlmConfig } from './llm-config.js';
import { loadFeedbackWeightsMerged } from './feedback-supabase.js';
import { formatRecentForLlm, type RecentStory } from './recent-digests.js';

const CURATION_SYSTEM = `You curate "Daily Three: Auto & Product Design" for an industrial product designer.
Pick exactly 3 articles. Prioritize: new model debuts, concept cars, CMF. Penalize: racing, celebrity.
Output JSON only:
{
  "leadJa": "2 sentences in Japanese, editorial tone",
  "leadEn": "2 sentences in English, editorial tone (write as native English, not a translation of leadJa)",
  "picks": [
    {
      "index": number,
      "titleJa": "...",
      "summaryJa": "3-5 lines Japanese with designer lens",
      "titleEn": "...",
      "summaryEn": "3-5 lines English with designer lens (native English, not translated from summaryJa)",
      "reason": "one line"
    }
  ]
}
Exactly 3 picks. Flexible car vs product ratio by quality.
If the user message lists recently covered stories, do not pick the same news event again (including follow-ups or another outlet on the same product launch).`;

/** Job-listing titles often use "Designer – City" (legacy Form Trends-style feeds). */
export function jobListingTitlePenalty(title: string): number {
  if (/\bdesigner\s*[–-]\s*[A-Za-z]/i.test(title)) return 8;
  if (/\b(senior|junior|lead|principal|graduate)\s+.{0,48}\bdesigner\b/i.test(title) && !/\bconcept\b/i.test(title)) {
    return 8;
  }
  return 0;
}

export function ruleScore(articles: RawArticle[], config: SourcesFile, sourceWeights: Record<string, number>): ScoredArticle[] {
  const text = (a: RawArticle) => `${a.title} ${a.summary}`.toLowerCase();

  return articles
    .map((a) => {
      let score = (sourceWeights[a.sourceId] ?? 1) * 10;
      const t = text(a);

      score -= jobListingTitlePenalty(a.title);

      for (const kw of config.scoring.boost_keywords) {
        if (t.includes(kw.toLowerCase())) score += 3;
      }
      for (const kw of config.scoring.penalty_keywords) {
        if (t.includes(kw.toLowerCase())) score -= 8;
      }
      for (const kw of config.scoring.low_priority_keywords) {
        if (t.includes(kw.toLowerCase())) score -= 4;
      }

      const hours = (Date.now() - a.publishedAt.getTime()) / 3600000;
      if (hours < 12) score += 4;
      else if (hours < 24) score += 2;

      if (a.category === 'automotive') score += 2;

      return { ...a, score };
    })
    .sort((a, b) => b.score - a.score);
}

export async function loadFeedbackWeights(): Promise<Record<string, number>> {
  return loadFeedbackWeightsMerged();
}

export function buildSourceWeights(sources: SourcesFile['sources'], feedback: Record<string, number>) {
  const w: Record<string, number> = {};
  for (const s of sources) {
    w[s.id] = Math.max(0.3, Math.min(2.5, s.weight * (feedback[s.id] ?? 1)));
  }
  return w;
}

function buildPayload(top: ScoredArticle[]) {
  return top.map((a, i) => ({
    index: i,
    title: a.title,
    summary: a.summary.slice(0, 280),
    source: a.sourceName,
    url: a.url,
    category: a.category,
    score: a.score,
  }));
}

type LlmPick = {
  index: number;
  titleJa: string;
  summaryJa: string;
  titleEn: string;
  summaryEn: string;
};

type LlmJson = { leadJa: string; leadEn: string; picks: LlmPick[] };

export type DigestLocaleBundle = { lead: string; articles: DigestArticle[] };

export type BilingualDigest = { ja: DigestLocaleBundle; en: DigestLocaleBundle };

function mapPicks(top: ScoredArticle[], parsed: LlmJson, locale: 'ja' | 'en'): DigestLocaleBundle {
  const lead = locale === 'ja' ? parsed.leadJa : parsed.leadEn;
  const articles: DigestArticle[] = parsed.picks.slice(0, 3).map((p) => {
    const src = top[p.index];
    if (!src) throw new Error(`Invalid pick index: ${p.index}`);
    return {
      title: locale === 'ja' ? p.titleJa : p.titleEn,
      summary: locale === 'ja' ? p.summaryJa : p.summaryEn,
      source: src.sourceName,
      sourceId: src.sourceId,
      url: src.url,
      image: src.image,
    };
  });
  return { lead, articles };
}

function mapBilingualPicks(top: ScoredArticle[], parsed: LlmJson): BilingualDigest {
  return {
    ja: mapPicks(top, parsed, 'ja'),
    en: mapPicks(top, parsed, 'en'),
  };
}

function extractJson(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start >= 0 && end > start) return raw.slice(start, end + 1);
  return raw.trim();
}

function parseLlmJson(raw: string, top: ScoredArticle[]): BilingualDigest {
  const parsed = JSON.parse(extractJson(raw)) as LlmJson;
  if (!parsed.leadJa || !parsed.leadEn || !Array.isArray(parsed.picks)) {
    throw new Error('Anthropic response missing leadJa, leadEn, or picks');
  }
  for (const p of parsed.picks.slice(0, 3)) {
    if (!p.titleEn?.trim() || !p.summaryEn?.trim() || !p.titleJa?.trim() || !p.summaryJa?.trim()) {
      throw new Error('Anthropic pick missing bilingual title or summary');
    }
  }
  return mapBilingualPicks(top, parsed);
}

async function pickWithAnthropic(
  top: ScoredArticle[],
  config: LlmConfig,
  recent: RecentStory[],
): Promise<BilingualDigest> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const userContent =
    JSON.stringify(buildPayload(top)) + formatRecentForLlm(recent);
  const res = await client.messages.create({
    model: config.anthropicModel,
    max_tokens: 2048,
    temperature: 0.4,
    system: CURATION_SYSTEM + '\nRespond with JSON only, no markdown fences.',
    messages: [{ role: 'user', content: userContent }],
  });
  const block = res.content.find((b) => b.type === 'text');
  const raw = block?.type === 'text' ? block.text : '';
  if (!raw) throw new Error('Anthropic returned empty response');
  return parseLlmJson(raw, top);
}

/** Pick top 3 with ja+en summaries (one Anthropic call). Requires ANTHROPIC_API_KEY. */
export async function pickTop3Bilingual(
  candidates: ScoredArticle[],
  config: LlmConfig = getLlmConfig(),
  recent: RecentStory[] = [],
): Promise<BilingualDigest> {
  const top = candidates.slice(0, 20);
  if (top.length === 0) {
    return {
      ja: { lead: '本日は候補がありませんでした。', articles: [] },
      en: { lead: 'No candidates today.', articles: [] },
    };
  }
  return pickWithAnthropic(top, config, recent);
}

/** @deprecated Use pickTop3Bilingual */
export async function pickTop3(
  candidates: ScoredArticle[],
  config: LlmConfig = getLlmConfig(),
): Promise<DigestLocaleBundle> {
  const { ja } = await pickTop3Bilingual(candidates, config);
  return ja;
}
