import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import OpenAI from 'openai';
import type {
  DigestArticle,
  FeedbackEntry,
  RawArticle,
  ScoredArticle,
  SourcesFile,
} from './types.js';

export function ruleScore(articles: RawArticle[], config: SourcesFile, sourceWeights: Record<string, number>): ScoredArticle[] {
  const text = (a: RawArticle) => `${a.title} ${a.summary}`.toLowerCase();

  return articles
    .map((a) => {
      let score = (sourceWeights[a.sourceId] ?? 1) * 10;
      const t = text(a);

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

export function loadFeedbackWeights(): Record<string, number> {
  const path = join(process.cwd(), 'data', 'feedback.jsonl');
  const weights: Record<string, number> = {};
  if (!existsSync(path)) return weights;

  const lines = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const e = JSON.parse(line) as FeedbackEntry;
      const delta = e.verdict === 'good' ? 0.05 : -0.08;
      weights[e.sourceId] = (weights[e.sourceId] ?? 1) + delta;
    } catch {
      /* skip */
    }
  }
  return weights;
}

export function buildSourceWeights(sources: SourcesFile['sources'], feedback: Record<string, number>) {
  const w: Record<string, number> = {};
  for (const s of sources) {
    w[s.id] = Math.max(0.3, Math.min(2.5, s.weight * (feedback[s.id] ?? 1)));
  }
  return w;
}

export async function pickTop3WithLlm(
  candidates: ScoredArticle[],
  apiKey: string | undefined,
): Promise<{ lead: string; articles: DigestArticle[] }> {
  const top = candidates.slice(0, 20);
  if (top.length === 0) {
    return { lead: '本日は候補がありませんでした。', articles: [] };
  }

  if (!apiKey) {
    return fallbackPick(top);
  }

  const openai = new OpenAI({ apiKey });
  const payload = top.map((a, i) => ({
    index: i,
    title: a.title,
    summary: a.summary.slice(0, 280),
    source: a.sourceName,
    url: a.url,
    category: a.category,
    score: a.score,
  }));

  const res = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    temperature: 0.4,
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content: `You curate "Daily Three: Auto & Product Design" for an industrial product designer.
Pick exactly 3 articles. Prioritize: new model debuts, concept cars, CMF. Penalize: racing, celebrity.
Output JSON: { "lead": "2 sentences in Japanese, editorial tone", "picks": [ { "index": number, "titleJa": "...", "summaryJa": "3-5 lines Japanese with designer lens", "reason": "one line" } ] }
Exactly 3 picks. Flexible car vs product ratio by quality.`,
      },
      { role: 'user', content: JSON.stringify(payload) },
    ],
  });

  const raw = res.choices[0]?.message?.content;
  if (!raw) return fallbackPick(top);

  try {
    const parsed = JSON.parse(raw) as {
      lead: string;
      picks: { index: number; titleJa: string; summaryJa: string }[];
    };
    const articles: DigestArticle[] = parsed.picks.slice(0, 3).map((p) => {
      const src = top[p.index];
      return {
        title: p.titleJa,
        summary: p.summaryJa,
        source: src.sourceName,
        url: src.url,
        image: src.image,
        reason: undefined,
      };
    });
    return { lead: parsed.lead, articles };
  } catch {
    return fallbackPick(top);
  }
}

function fallbackPick(top: ScoredArticle[]): { lead: string; articles: DigestArticle[] } {
  const picks = top.slice(0, 3);
  return {
    lead: 'ルールベースで選定した本日の注目3件です。OPENAI_API_KEY を設定すると日本語の編集者風要約が有効になります。',
    articles: picks.map((a) => ({
      title: a.title,
      summary: a.summary || '（要約なし — 原文リンクからご確認ください）',
      source: a.sourceName,
      url: a.url,
      image: a.image,
    })),
  };
}
