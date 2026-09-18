import { getLlmConfig, type LlmConfig } from '../llm-config.js';
import { extractJson } from '../llm-json.js';
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

/** Bodies after retries, with whether code had to trim to the X limit. */
export interface ComposeResult extends ComposedBodies {
  trimmedJa: boolean;
  trimmedEn: boolean;
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

export function parseBodies(raw: string): ComposedBodies {
  const parsed = JSON.parse(extractJson(raw)) as Partial<ComposedBodies>;
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

const SENTENCE_END = new Set(['。', '！', '？']);
const LATIN_SENTENCE_END = new Set(['.', '!', '?']);
const CLAUSE_END = new Set(['、', '，', ';', '；']);

function isDigit(ch: string | undefined): boolean {
  return ch !== undefined && /\d/.test(ch);
}

function isSpace(ch: string | undefined): boolean {
  return ch !== undefined && /\s/.test(ch);
}

function takeFollowingSpace(chars: string[], from: number): number {
  let end = from;
  while (end < chars.length && isSpace(chars[end])) end++;
  return end;
}

/** Split on 。！？ and on .!? only when they end a sentence (not 2.5 or U.S.x). */
export function splitSentences(text: string): string[] {
  const chars = [...text];
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (SENTENCE_END.has(ch)) {
      const end = takeFollowingSpace(chars, i + 1);
      parts.push(chars.slice(start, end).join(''));
      start = end;
      i = end - 1;
      continue;
    }
    if (!LATIN_SENTENCE_END.has(ch)) continue;
    const prev = chars[i - 1];
    const next = chars[i + 1];
    if (ch === '.' && isDigit(prev) && isDigit(next)) continue;
    if (next !== undefined && !isSpace(next)) continue;
    const end = takeFollowingSpace(chars, i + 1);
    parts.push(chars.slice(start, end).join(''));
    start = end;
    i = end - 1;
  }
  if (start < chars.length) parts.push(chars.slice(start).join(''));
  return parts.filter((p) => p.trim().length > 0);
}

/** Split on 、 and on comma/semicolon that look like clause breaks (not 1,000). */
export function splitClauses(text: string): string[] {
  const chars = [...text];
  const parts: string[] = [];
  let start = 0;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (CLAUSE_END.has(ch)) {
      const end = takeFollowingSpace(chars, i + 1);
      parts.push(chars.slice(start, end).join(''));
      start = end;
      i = end - 1;
      continue;
    }
    if (ch !== ',') continue;
    const next = chars[i + 1];
    if (next !== undefined && !isSpace(next)) continue;
    const end = takeFollowingSpace(chars, i + 1);
    parts.push(chars.slice(start, end).join(''));
    start = end;
    i = end - 1;
  }
  if (start < chars.length) parts.push(chars.slice(start).join(''));
  return parts.filter((p) => p.trim().length > 0);
}

function stripTrailingPause(text: string): string {
  return text.replace(/[\s、，,;；]+$/u, '');
}

function asIncomplete(text: string): string {
  const stripped = stripTrailingPause(text);
  if (!stripped) return '…';
  if (/[。！？.!?]$/.test(stripped)) return stripped;
  return `${stripped}…`;
}

function keepPrefixUnits(
  units: string[],
  maxWeighted: number,
  incomplete: boolean,
): string | null {
  if (units.length < 2) return null;
  for (let n = units.length - 1; n >= 1; n--) {
    const joined = units.slice(0, n).join('');
    const candidate = incomplete ? asIncomplete(joined) : joined.replace(/\s+$/u, '');
    if (candidate && weightedLength(candidate) <= maxWeighted) return candidate;
  }
  return null;
}

function trimChars(text: string, maxWeighted: number): string {
  const chars = [...text];
  for (let end = chars.length; end > 0; end--) {
    const prefix = stripTrailingPause(chars.slice(0, end).join(''));
    if (!prefix) continue;
    if (/[。！？.!?]$/.test(prefix) && weightedLength(prefix) <= maxWeighted) return prefix;
    const withEllipsis = `${prefix}…`;
    if (weightedLength(withEllipsis) <= maxWeighted) return withEllipsis;
  }
  for (let end = chars.length; end > 0; end--) {
    const prefix = chars.slice(0, end).join('').trim();
    if (prefix && weightedLength(prefix) <= maxWeighted) return prefix;
  }
  return weightedLength('…') <= maxWeighted ? '…' : '';
}

/**
 * Shrink `text` to at most `maxWeighted` X units.
 * Prefer dropping trailing sentences, then clauses, then characters + ….
 */
export function fitToWeighted(text: string, maxWeighted: number): string {
  const raw = text.trim();
  if (maxWeighted <= 0) return '';
  if (weightedLength(raw) <= maxWeighted) return raw;

  const bySentence = keepPrefixUnits(splitSentences(raw), maxWeighted, false);
  if (bySentence !== null) return bySentence;

  const byClause = keepPrefixUnits(splitClauses(raw), maxWeighted, true);
  if (byClause !== null) return byClause;

  return trimChars(raw, maxWeighted);
}

function bodyRoom(assemble: (body: string) => string): number {
  return MAX_WEIGHTED_LENGTH - weightedLength(assemble(''));
}

/** Trim ja/en so the assembled posts fit X's 280. No-op when they already do. */
export function fitBodies(bodies: ComposedBodies, input: ComposeInput): ComposeResult {
  const ja = fitToWeighted(bodies.ja, bodyRoom((body) => buildJaText(input.jaArticle, body, input.digestDate)));
  const en = fitToWeighted(bodies.en, bodyRoom((body) => buildEnText(input.enArticle, body)));
  return {
    ja,
    en,
    trimmedJa: ja !== bodies.ja,
    trimmedEn: en !== bodies.en,
  };
}

/** Same ceiling the digest picker uses; 1024 truncated the JSON and lost the notification. */
const BASE_MAX_TOKENS = 4096;
const CEILING_MAX_TOKENS = 8192;
const MAX_COMPOSE_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2000;

export type BodyMessage = { role: 'user' | 'assistant'; content: string };
export type BodyReply = { text: string; stopReason: string | null };
export type BodyCall = (
  messages: BodyMessage[],
  options?: { maxTokens?: number },
) => Promise<BodyReply>;

async function anthropicBodyCall(config: LlmConfig): Promise<BodyCall> {
  const { default: Anthropic } = await import('@anthropic-ai/sdk');
  const client = new Anthropic({ apiKey: config.anthropicApiKey });

  return async (messages, options) => {
    const res = await client.messages.create({
      model: config.anthropicModel,
      max_tokens: options?.maxTokens ?? BASE_MAX_TOKENS,
      temperature: 0.8,
      system: SOCIAL_SYSTEM,
      messages,
    });
    const block = res.content.find((b) => b.type === 'text');
    return { text: block?.type === 'text' ? block.text : '', stopReason: res.stop_reason };
  };
}

/**
 * Ask again when the model returns something unusable or overshoots its character budget.
 * Length is retried first, then trimmed in code so Slack never gets a post over 280.
 * A single unparseable reply used to end the run before Slack was ever contacted, so the
 * draft simply never arrived and nothing said why.
 */
export async function composeWithRetry(
  input: ComposeInput,
  call: BodyCall,
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<ComposeResult> {
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const budget = bodyBudget(input.jaArticle, input.enArticle, input.digestDate);
  const messages: BodyMessage[] = [{ role: 'user', content: buildUserContent(input, budget) }];

  let lastError = new Error('Anthropic compose never ran');
  let lastBodies: ComposedBodies | null = null;
  let maxTokens = BASE_MAX_TOKENS;

  for (let attempt = 1; attempt <= MAX_COMPOSE_ATTEMPTS; attempt++) {
    let reply: BodyReply;
    try {
      reply = await call(messages, { maxTokens });
    } catch (e) {
      lastError = e as Error;
      console.warn(
        `[social] attempt ${attempt}/${MAX_COMPOSE_ATTEMPTS} call failed: ${lastError.message}`,
      );
      if (attempt === MAX_COMPOSE_ATTEMPTS) break;
      await sleep(RETRY_DELAY_MS * attempt);
      continue;
    }

    const truncated = reply.stopReason === 'max_tokens';
    let bodies: ComposedBodies;
    try {
      if (!reply.text) throw new Error('Anthropic returned empty response');
      bodies = parseBodies(reply.text);
    } catch (e) {
      const why = truncated
        ? `${(e as Error).message} (response was cut off at max_tokens)`
        : (e as Error).message;
      lastError = new Error(why);
      console.warn(`[social] attempt ${attempt}/${MAX_COMPOSE_ATTEMPTS} unusable: ${why}`);
      console.warn(`[social] raw response (first 400 chars): ${reply.text.slice(0, 400)}`);
      if (attempt === MAX_COMPOSE_ATTEMPTS) break;
      if (truncated && maxTokens < CEILING_MAX_TOKENS) {
        maxTokens = Math.min(CEILING_MAX_TOKENS, maxTokens * 2);
        console.warn(`[social] raising max_tokens to ${maxTokens} for the retry`);
      }
      messages.push(
        { role: 'assistant', content: reply.text || '(empty response)' },
        {
          role: 'user',
          content: `That response was unusable: ${why}. Send the whole JSON object again, exactly {"ja": "...", "en": "..."}, both fields non-empty. JSON only.`,
        },
      );
      continue;
    }

    lastBodies = bodies;
    const over = overLimit(bodies, input);
    if (over.length === 0) return { ...bodies, trimmedJa: false, trimmedEn: false };

    console.warn(`[social] Over budget (attempt ${attempt}): ${over.join(', ')}`);
    if (attempt === MAX_COMPOSE_ATTEMPTS) break;
    messages.push(
      { role: 'assistant', content: reply.text },
      {
        role: 'user',
        content: `Too long for X: ${over.join(' and ')}. Rewrite both, keeping ja within ${budget.ja} Japanese characters and en within ${budget.en} characters. Same JSON shape.`,
      },
    );
  }

  // Length is an output invariant: retry first, then trim in code. Only give up when
  // no attempt produced usable bodies at all.
  if (lastBodies) {
    const fitted = fitBodies(lastBodies, input);
    if (fitted.trimmedJa || fitted.trimmedEn) {
      console.warn(
        `[social] Trimmed to X limit:${fitted.trimmedJa ? ' ja' : ''}${fitted.trimmedEn ? ' en' : ''}`,
      );
    }
    return fitted;
  }
  throw lastError;
}

/** One draft's ja+en bodies. Requires ANTHROPIC_API_KEY. */
export async function composeBodies(
  input: ComposeInput,
  config: LlmConfig = getLlmConfig(),
): Promise<ComposeResult> {
  return composeWithRetry(input, await anthropicBodyCall(config));
}
