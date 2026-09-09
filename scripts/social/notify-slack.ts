import type { GateIssue, SocialDraft } from './types.js';

const PICK_REASON_LABEL: Record<SocialDraft['pickReason'], string> = {
  feedback: 'Good が付いた記事',
  rotation: '曜日ローテーション',
  fallback: '繰り上げ（既出を回避）',
};

/** encodeURIComponent throws on half of a surrogate pair, and that used to kill the send. */
export function dropLoneSurrogates(text: string): string {
  return text.replace(
    /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/g,
    '',
  );
}

/** Prefilled X composer. The 2本目/3本目 are added with the composer's ＋ button. */
export function intentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(dropLoneSurrogates(text))}`;
}

/**
 * Slack rejects the whole message with `invalid_blocks` when image_url is not a valid
 * URI — publisher URLs with raw spaces (Auto Express) are the usual offender.
 * Percent-encode what can be encoded, drop what cannot.
 */
export function safeImageUrl(raw: string | undefined): string | undefined {
  const trimmed = raw?.trim();
  if (!trimmed) return undefined;

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return undefined;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return undefined;
  if (url.href.length > 3000) return undefined;
  return url.href;
}

function codeBlock(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

function section(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

function statusOf(issues: GateIssue[]): string {
  return issues.some((i) => i.level === 'error') ? '⚠️ 要修正' : '✅ そのまま投稿可';
}

export function buildSlackPayload(draft: SocialDraft, issues: GateIssue[]) {
  const status = statusOf(issues);

  const blocks: unknown[] = [
    {
      type: 'header',
      text: { type: 'plain_text', text: `Daily Three 下書き ${draft.digestDate}`, emoji: true },
    },
    {
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: `${status} ・ ${draft.source} ・ ${draft.articleIndex + 1}件目（${PICK_REASON_LABEL[draft.pickReason]}）`,
        },
      ],
    },
  ];

  const image = safeImageUrl(draft.image);
  if (image) {
    blocks.push({ type: 'image', image_url: image, alt_text: draft.source });
  }

  blocks.push(
    section(`*1本目（日本語）*\n${codeBlock(draft.jaText)}`),
    section(`*2本目（英語スレッド）*\n${codeBlock(draft.enText)}`),
    section(`*3本目（リプライ）*\n${codeBlock(draft.replyText)}`),
    section(
      `🐦 *<${intentUrl(draft.jaText)}|X の下書きを開く>* — 開いたら ＋ で2本目・3本目を足してスレッド投稿\n` +
        `📄 <${draft.digestUrl}|digest ページ> ・ 🔗 <${draft.articleUrl}|元記事>`,
    ),
  );

  if (issues.length > 0) {
    blocks.push({
      type: 'context',
      elements: [
        {
          type: 'mrkdwn',
          text: issues
            .map((i) => `${i.level === 'error' ? '🔴' : '🟡'} ${i.code}: ${i.message}`)
            .join('\n'),
        },
      ],
    });
  }

  return {
    text: `Daily Three 下書き ${draft.digestDate}（${status}）`,
    blocks,
  };
}

/** Last resort: no Block Kit at all, so nothing about formatting can reject it. */
export function buildPlainTextPayload(draft: SocialDraft, issues: GateIssue[]) {
  const lines = [
    `Daily Three 下書き ${draft.digestDate}（${statusOf(issues)}）`,
    `${draft.source} ・ ${draft.articleIndex + 1}件目（${PICK_REASON_LABEL[draft.pickReason]}）`,
    '',
    `1本目（日本語）\n${draft.jaText}`,
    '',
    `2本目（英語スレッド）\n${draft.enText}`,
    '',
    `3本目（リプライ）\n${draft.replyText}`,
    '',
    `X の下書き: ${intentUrl(draft.jaText)}`,
    `digest: ${draft.digestUrl}`,
    `元記事: ${draft.articleUrl}`,
  ];

  if (issues.length > 0) {
    lines.push('', ...issues.map((i) => `${i.level === 'error' ? '🔴' : '🟡'} ${i.code}: ${i.message}`));
  }

  return { text: lines.join('\n') };
}

const REQUEST_TIMEOUT_MS = 15_000;
const MAX_SEND_ATTEMPTS = 3;
const RETRY_DELAY_MS = 2_000;
const MAX_RETRY_DELAY_MS = 30_000;

type PostResult = { ok: boolean; status: number; body: string; retryAfterMs?: number };

/**
 * A 200 is not delivery: the Web API answers {"ok":false,"error":"channel_not_found"}
 * with a 200 and the notification is gone. Read the envelope before believing it.
 */
export function isDeliveredBody(body: string): boolean {
  const trimmed = body.trim();
  if (!trimmed.startsWith('{')) return true;
  try {
    return (JSON.parse(trimmed) as { ok?: boolean }).ok !== false;
  } catch {
    return true;
  }
}

function retryAfterMs(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header.trim());
  if (!Number.isFinite(seconds) || seconds < 0) return undefined;
  return Math.min(seconds * 1000, MAX_RETRY_DELAY_MS);
}

/** Status 0 means the request never completed: DNS, reset connection, timeout. */
function isTransient(result: PostResult): boolean {
  return result.status === 0 || result.status === 429 || result.status >= 500;
}

async function post(webhookUrl: string, payload: unknown): Promise<PostResult> {
  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    const body = await res.text();
    return {
      ok: res.ok && isDeliveredBody(body),
      status: res.status,
      body,
      retryAfterMs: retryAfterMs(res.headers.get('retry-after')),
    };
  } catch (e) {
    // Uncaught, this rejected out of the whole fallback chain, so neither the
    // image-less nor the plain-text retry was ever attempted.
    return { ok: false, status: 0, body: (e as Error).message };
  }
}

/**
 * Rate limits and outages pass with time; a malformed payload does not. Wait out the
 * former here, so the fallback chain is spent on the problems it can actually fix.
 */
async function postWithBackoff(
  webhookUrl: string,
  payload: unknown,
  label: string,
  sleep: (ms: number) => Promise<void>,
): Promise<PostResult> {
  let result: PostResult = { ok: false, status: 0, body: 'never sent' };

  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    result = await post(webhookUrl, payload);
    if (result.ok || !isTransient(result)) return result;
    if (attempt === MAX_SEND_ATTEMPTS) break;

    const wait = result.retryAfterMs ?? RETRY_DELAY_MS * attempt;
    console.warn(
      `[social] Slack ${label} attempt ${attempt}/${MAX_SEND_ATTEMPTS} failed (${result.status} ${result.body}); retrying in ${wait}ms`,
    );
    await sleep(wait);
  }

  return result;
}

/** Drop the image block — the one block whose content comes from an outside publisher. */
function withoutImage(payload: ReturnType<typeof buildSlackPayload>) {
  return {
    ...payload,
    blocks: payload.blocks.filter((b) => (b as { type?: string }).type !== 'image'),
  };
}

type Candidate = { label: string; build: () => unknown | null };

export async function notifySlack(
  draft: SocialDraft,
  issues: GateIssue[],
  webhookUrl = process.env.SLACK_WEBHOOK_URL,
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<void> {
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is required. Set it in .env or GitHub Secrets.');
  }
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));

  // The draft matters more than its decoration: never let one bad block, or one bad
  // moment on the network, swallow the notification. Step down until something lands.
  const candidates: Candidate[] = [
    { label: 'full message', build: () => buildSlackPayload(draft, issues) },
    {
      label: 'message without the image block',
      build: () => {
        const full = buildSlackPayload(draft, issues);
        const stripped = withoutImage(full);
        return stripped.blocks.length === full.blocks.length ? null : stripped;
      },
    },
    { label: 'plain text', build: () => buildPlainTextPayload(draft, issues) },
  ];

  let lastFailure = 'never attempted';

  for (const [i, candidate] of candidates.entries()) {
    let payload: unknown;
    try {
      payload = candidate.build();
    } catch (e) {
      lastFailure = `could not build the ${candidate.label}: ${(e as Error).message}`;
      console.warn(`[social] ${lastFailure}`);
      continue;
    }
    if (payload === null) continue;

    const result = await postWithBackoff(webhookUrl, payload, candidate.label, sleep);
    if (result.ok) {
      if (i > 0) console.warn(`[social] Sent the ${candidate.label}`);
      return;
    }
    lastFailure = `${result.status} ${result.body}`;
    console.warn(`[social] Slack rejected the ${candidate.label}: ${lastFailure}`);
  }

  throw new Error(`Slack webhook failed: ${lastFailure}`);
}

/**
 * Last line of defence. Everything before notifySlack — reading the digest, Supabase,
 * composing — used to fail into silence, and silence looks exactly like a quiet day.
 */
export async function notifySlackFailure(
  context: string,
  error: unknown,
  webhookUrl = process.env.SLACK_WEBHOOK_URL,
  options: { sleep?: (ms: number) => Promise<void> } = {},
): Promise<boolean> {
  if (!webhookUrl) return false;
  const sleep = options.sleep ?? ((ms: number) => new Promise((r) => setTimeout(r, ms)));
  const detail = error instanceof Error ? error.message : String(error);
  const payload = { text: `🔴 Daily Three ${context}が失敗しました
${detail.slice(0, 1500)}` };

  const result = await postWithBackoff(webhookUrl, payload, 'failure notice', sleep);
  if (!result.ok) {
    console.error(`[social] Could not report the failure to Slack: ${result.status} ${result.body}`);
  }
  return result.ok;
}
