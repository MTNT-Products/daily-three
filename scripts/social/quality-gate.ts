import type { GateIssue, SocialArticle } from './types.js';

/** X counts a URL as 23 units regardless of its real length. */
export const URL_WEIGHT = 23;
export const MAX_WEIGHTED_LENGTH = 280;
export const DUPLICATE_THRESHOLD = 0.6;

const URL_PATTERN = /https?:\/\/\S+/g;
const HAS_URL = /https?:\/\//;

/**
 * X's weighted character count: Latin, punctuation and general symbols cost 1,
 * everything else (CJK, kana, emoji) costs 2. Limit is 280 weighted units.
 */
export function weightedLength(text: string): number {
  const withoutUrls = text.replace(URL_PATTERN, '');
  const urlCount = text.match(URL_PATTERN)?.length ?? 0;

  let total = urlCount * URL_WEIGHT;
  for (const char of withoutUrls) {
    const cp = char.codePointAt(0) ?? 0;
    const cheap =
      cp <= 0x10ff ||
      (cp >= 0x2000 && cp <= 0x200d) ||
      (cp >= 0x2010 && cp <= 0x201f) ||
      (cp >= 0x2032 && cp <= 0x2037);
    total += cheap ? 1 : 2;
  }
  return total;
}

function trigrams(text: string): Set<string> {
  const normalized = text.replace(/\s+/g, '');
  const out = new Set<string>();
  for (let i = 0; i + 3 <= normalized.length; i++) {
    out.add(normalized.slice(i, i + 3));
  }
  return out;
}

/** Dice coefficient over character trigrams (0 = unrelated, 1 = identical). */
export function similarity(a: string, b: string): number {
  const setA = trigrams(a);
  const setB = trigrams(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let shared = 0;
  for (const gram of setA) {
    if (setB.has(gram)) shared++;
  }
  return (2 * shared) / (setA.size + setB.size);
}

/** Length of the longest run of characters appearing verbatim in both strings. */
export function longestCommonRun(a: string, b: string): number {
  const x = a.replace(/\s+/g, '');
  const y = b.replace(/\s+/g, '');
  if (!x || !y) return 0;

  let best = 0;
  let previous = new Uint16Array(y.length + 1);
  for (let i = 1; i <= x.length; i++) {
    const current = new Uint16Array(y.length + 1);
    for (let j = 1; j <= y.length; j++) {
      if (x[i - 1] !== y[j - 1]) continue;
      current[j] = previous[j - 1] + 1;
      if (current[j] > best) best = current[j];
    }
    previous = current;
  }
  return best;
}

/** Capitalised only because they start a sentence — not names worth fact-checking. */
const ENGLISH_LEAD_WORDS = new Set(
  [
    'the', 'this', 'that', 'these', 'those', 'and', 'but', 'for', 'with', 'without',
    'what', 'when', 'where', 'while', 'how', 'why', 'its', 'their', 'there', 'here',
    'now', 'new', 'not', 'one', 'two', 'three', 'you', 'your', 'our', 'they', 'his',
    'her', 'design', 'designers', 'source', 'both', 'even', 'more', 'most', 'less',
    'each', 'every', 'another', 'once', 'only', 'still', 'rather', 'instead',
  ],
);

/** Everyday design-writing loanwords — not the invented proper nouns we are hunting for. */
const KATAKANA_COMMON_WORDS = new Set([
  'デザイン', 'デザイナー', 'プロセス', 'プロダクト', 'コンセプト', 'アプローチ', 'ディテール',
  'バランス', 'ユーザー', 'シリーズ', 'モデル', 'スタイル', 'イメージ', 'テーマ', 'ポイント',
  'レベル', 'サイズ', 'カラー', 'パターン', 'システム', 'メーカー', 'ブランド', 'マテリアル',
  'テクノロジー', 'シンプル', 'ミニマル', 'クオリティ', 'フォルム', 'スケール', 'ストーリー',
  'メッセージ', 'トレンド', 'ニュース', 'インテリア', 'エクステリア', 'サステナブル', 'エンジニア',
]);

/** All caps (JLR), internal caps (FreeBuds) or a digit (260kW) — a name even at a sentence start. */
function looksLikeAName(word: string): boolean {
  return !/[a-z]/.test(word) || /[a-z][A-Z]/.test(word) || /\d/.test(word);
}

/**
 * Katakana runs, proper-noun-ish Latin words and numbers — the terms worth fact-checking.
 *
 * A capitalised English word at the start of a sentence carries no information — "Single",
 * "Unified" and "The" are capitalised by position, not because they name anything. Those are
 * skipped unless their shape marks them as a name anyway.
 */
export function significantTerms(text: string): string[] {
  const katakana = (text.match(/[ァ-ヶー]{3,}/g) ?? []).filter(
    (w) => !KATAKANA_COMMON_WORDS.has(w),
  );

  const latin: string[] = [];
  const latinPattern = /[A-Z][A-Za-z0-9.-]{2,}/g;
  for (const m of text.matchAll(latinPattern)) {
    const word = m[0];
    if (ENGLISH_LEAD_WORDS.has(word.toLowerCase())) continue;
    const before = text.slice(0, m.index).trimEnd();
    const sentenceInitial = before === '' || /[.!?:;]$/.test(before);
    if (sentenceInitial && !looksLikeAName(word)) continue;
    latin.push(word);
  }

  const numbers = text.match(/\d+(?:[.,]\d+)?/g) ?? [];
  return [...new Set([...katakana, ...latin, ...numbers])];
}

function normalizeForLookup(text: string): string {
  return text.toLowerCase().replace(/\s+/g, '');
}

export interface GateInput {
  /** Assembled posts — checked for length and stray URLs. */
  jaText: string;
  enText: string;
  replyText: string;
  /** The model-written part only — checked for duplication and invented facts. */
  jaBody: string;
  enBody: string;
  jaArticle: SocialArticle;
  enArticle: SocialArticle;
  /** Previous drafts' bodies, for the duplicate check. */
  recentBodies?: string[];
}

/**
 * Every check is advisory: issues are reported, never thrown.
 * `error` means fix before posting; `warn` means eyeball it.
 */
export function checkDraft(input: GateInput): GateIssue[] {
  const issues: GateIssue[] = [];
  const recent = input.recentBodies ?? [];

  for (const [label, text] of [
    ['ja', input.jaText],
    ['en', input.enText],
    ['reply', input.replyText],
  ] as const) {
    const length = weightedLength(text);
    if (length > MAX_WEIGHTED_LENGTH) {
      issues.push({
        level: 'error',
        code: `length-${label}`,
        message: `${label} が ${length}/${MAX_WEIGHTED_LENGTH} weighted units で超過`,
      });
    }
  }

  for (const [label, text] of [
    ['ja', input.jaText],
    ['en', input.enText],
  ] as const) {
    if (HAS_URL.test(text)) {
      issues.push({
        level: 'error',
        code: `url-in-${label}`,
        message: `${label} 本文に URL が入っている（リンクはリプライに置く）`,
      });
    }
  }

  if (!HAS_URL.test(input.replyText)) {
    issues.push({ level: 'error', code: 'reply-no-url', message: 'リプライに URL がない' });
  }

  for (const past of recent) {
    const score = similarity(input.jaBody, past);
    if (score >= DUPLICATE_THRESHOLD) {
      issues.push({
        level: 'error',
        code: 'duplicate',
        message: `過去の投稿と類似度 ${score.toFixed(2)}（X の重複制限に触れる恐れ）`,
      });
      break;
    }
  }

  const jaSource = normalizeForLookup(`${input.jaArticle.title} ${input.jaArticle.summary}`);
  const enSource = normalizeForLookup(`${input.enArticle.title} ${input.enArticle.summary}`);
  const bothSources = `${jaSource} ${enSource}`;

  for (const [label, text] of [
    ['ja', input.jaBody],
    ['en', input.enBody],
  ] as const) {
    const unsourced = significantTerms(text).filter(
      (term) => !bothSources.includes(normalizeForLookup(term)),
    );
    if (unsourced.length > 0) {
      issues.push({
        level: 'warn',
        code: `unsourced-${label}`,
        message: `digest に無い語: ${unsourced.join(', ')}`,
      });
    }
  }

  const jaRun = longestCommonRun(input.jaBody, `${input.jaArticle.title}${input.jaArticle.summary}`);
  if (jaRun > 30) {
    issues.push({
      level: 'warn',
      code: 'verbatim-ja',
      message: `digest から ${jaRun} 文字が連続一致（言い換えを検討）`,
    });
  }

  const enRun = longestCommonRun(input.enBody, `${input.enArticle.title}${input.enArticle.summary}`);
  if (enRun > 60) {
    issues.push({
      level: 'warn',
      code: 'verbatim-en',
      message: `digest から ${enRun} 文字が連続一致（言い換えを検討）`,
    });
  }

  return issues;
}

export function hasBlockingIssue(issues: GateIssue[]): boolean {
  return issues.some((i) => i.level === 'error');
}
