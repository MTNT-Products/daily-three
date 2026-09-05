import { getLlmConfig, type LlmConfig } from '../llm-config.js';
import { DIGEST_TIMEZONE } from '../digest-schedule.js';
import { MAX_WEIGHTED_LENGTH, weightedLength } from './quality-gate.js';
import type { SocialArticle } from './types.js';

/** Headroom left for the model overshooting its character budget. */
const BUDGET_MARGIN = 12;

const SOCIAL_SYSTEM = `You write X (Twitter) posts for "Daily Three: Auto & Product Design", a Japanese
curation site that picks three car / product design stories every weekday.

Write ONE condensed take on the given article, in Japanese and in English.

Hard rules:
- Write ONLY what the given digest summary supports. Never add facts, figures, names or speculation.
- Do NOT copy sentences from the digest summary. Rephrase in your own words.
- No URLs, no @mentions, no hashtags, no emoji.
- Do not repeat the article title — the post already shows it.
- Audience is working designers: calm, concrete, no hype words ("衝撃", "ヤバい", "revolutionary", "game-changing").
- The Japanese and English versions must read as native writing, not translations of each other.
- Vary your opening and sentence structure from the recent posts listed by the user.

Output JSON only, no markdown fences:
{"ja": "...", "en": "..."}`;

export interface ComposeInput {
  jaArticle: SocialArticle;
  enArticle: SocialArticle;
  digestDate: string;
  recentBodies?: string[];
}

export interface ComposedBodies {
  ja: string;
  en: string;
}

function shortJaDate(digestDate: string): string {
  const d = new Date(`${digestDate}T12:00:00+09:00`);
  const parts = new Intl.DateTimeFormat('ja-JP', {
    timeZone: DIGEST_TIMEZONE,
    month: 'numeric',
    day: 'numeric',
    weekday: 'short',
  }).formatToParts(d);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? '';
  return `${get('month')}/${get('day')}(${get('weekday')})`;
}

export function buildJaText(article: SocialArticle, body: string, digestDate: string): string {
  return `【Daily Three】${shortJaDate(digestDate)}\n${article.title}\n\n${body}\n\n出典: ${article.source}`;
}

export function buildEnText(article: SocialArticle, body: string): string {
  return `${article.title}\n\n${body}\n\nSource: ${article.source}`;
}

export function buildReplyText(digestUrl: string, originalUrl: string): string {
  return `今日の3件 / Today's three → ${digestUrl}\n原文 / Original → ${originalUrl}`;
}

/**
 * Characters left for the generated body once the fixed frame is accounted for.
 * Japanese costs 2 weighted units per character, English roughly 1.
 */
export function bodyBudget(
  jaArticle: SocialArticle,
  enArticle: SocialArticle,
  digestDate: string,
): { ja: number; en: number } {
  const jaFrame = weightedLength(buildJaText(jaArticle, '', digestDate));
  const enFrame = weightedLength(buildEnText(enArticle, ''));
  const jaRoom = MAX_WEIGHTED_LENGTH - jaFrame - BUDGET_MARGIN;
  const enRoom = MAX_WEIGHTED_LENGTH - enFrame - BUDGET_MARGIN;
  return {
    ja: Math.max(30, Math.min(110, Math.floor(jaRoom / 2))),
    en: Math.max(60, Math.min(220, enRoom)),
  };
}

function buildUserContent(input: ComposeInput, budget: { ja: number; en: number }): string {
  const recent = input.recentBodies ?? [];
  const recentBlock =
    recent.length > 0
      ? `\n\nRecent posts (do not reuse their opening or structure):\n${recent
          .map((t) => `- ${t.replace(/\s+/g, ' ').trim()}`)
          .join('\n')}`
      : '';

  return `${JSON.stringify(
    {
      ja: { title: input.jaArticle.title, summary: input.jaArticle.summary },
      en: { title: input.enArticle.title, summary: input.enArticle.summary },
      source: input.jaArticle.source,
      limits: {
        ja: `${budget.ja} Japanese characters or fewer`,
        en: `${budget.en} characters or fewer`,
      },
    },
    null,
    2,
  )}${recentBlock}`;
}

function parseBodies(raw: string): ComposedBodies {
  const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, '').replace(/```$/, '');
  const parsed = JSON.parse(cleaned) as Partial<ComposedBodies>;
  if (!parsed.ja?.trim() || !parsed.en?.trim()) {
    throw new Error('Anthropic response missing ja or en body');
  }
  return { ja: parsed.ja.trim(), en: parsed.en.trim() };
}

/** Assembled posts that blow the X limit, with how far over they are. */
function overLimit(bodies: ComposedBodies, input: ComposeInput): string[] {
  const ja = weightedLength(buildJaText(input.jaArticle, bodies.ja, input.digestDate));
  const en = weightedLength(buildEnText(input.enArticle, bodies.en));
  const over: string[] = [];
  if (ja > MAX_WEIGHTED_LENGTH) over.push(`ja is ${ja - MAX_WEIGHTED_LENGTH} units too long`);
  if (en > MAX_WEIGHTED_LENGTH) over.push(`en is ${en - MAX_WEIGHTED_LENGTH} units too long`);
  return over;
}

/**
 * One Anthropic call per draft, plus one corrective retry when the model overshoots
 * its character budget (Haiku does, often enough to matter). Requires ANTHROPIC_API_KEY.
 */
export async function composeBodies(
  input: ComposeInput,
  config: LlmConfig = getLlmConfig(),
): Promise<ComposedBodies> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });
  const budget = bodyBudget(input.jaArticle, input.enArticle, input.digestDate);
  const messages: { role: 'user' | 'assistant'; content: string }[] = [
    { role: 'user', content: buildUserContent(input, budget) },
  ];

  let bodies: ComposedBodies | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: 1024,
      temperature: 0.8,
      system: SOCIAL_SYSTEM,
      messages,
    });

    const block = res.content.find((b) => b.type === 'text');
    const raw = block?.type === 'text' ? block.text : '';
    if (!raw) throw new Error('Anthropic returned empty response');

    bodies = parseBodies(raw);
    const over = overLimit(bodies, input);
    if (over.length === 0) return bodies;

    console.warn(`[social] Over budget (attempt ${attempt + 1}): ${over.join(', ')}`);
    messages.push(
      { role: 'assistant', content: raw },
      {
        role: 'user',
        content: `Too long for X: ${over.join(' and ')}. Rewrite both, keeping ja within ${budget.ja} Japanese characters and en within ${budget.en} characters. Same JSON shape.`,
      },
    );
  }

  return bodies as ComposedBodies;
}
