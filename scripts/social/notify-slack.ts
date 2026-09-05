import type { GateIssue, SocialDraft } from './types.js';

const PICK_REASON_LABEL: Record<SocialDraft['pickReason'], string> = {
  feedback: 'Good が付いた記事',
  rotation: '曜日ローテーション',
  fallback: '繰り上げ（既出を回避）',
};

/** Prefilled X composer. The 2本目/3本目 are added with the composer's ＋ button. */
export function intentUrl(text: string): string {
  return `https://x.com/intent/post?text=${encodeURIComponent(text)}`;
}

function codeBlock(text: string): string {
  return `\`\`\`\n${text}\n\`\`\``;
}

function section(text: string) {
  return { type: 'section', text: { type: 'mrkdwn', text } };
}

export function buildSlackPayload(draft: SocialDraft, issues: GateIssue[]) {
  const errors = issues.filter((i) => i.level === 'error');
  const status = errors.length > 0 ? '⚠️ 要修正' : '✅ そのまま投稿可';

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

  if (draft.image) {
    blocks.push({ type: 'image', image_url: draft.image, alt_text: draft.source });
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

export async function notifySlack(
  draft: SocialDraft,
  issues: GateIssue[],
  webhookUrl = process.env.SLACK_WEBHOOK_URL,
): Promise<void> {
  if (!webhookUrl) {
    throw new Error('SLACK_WEBHOOK_URL is required. Set it in .env or GitHub Secrets.');
  }

  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSlackPayload(draft, issues)),
  });

  if (!res.ok) {
    throw new Error(`Slack webhook failed: ${res.status} ${await res.text()}`);
  }
}
