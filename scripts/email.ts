import { Resend } from 'resend';
import type { DigestArticle } from './types.js';

export async function sendDigestEmail(
  articles: DigestArticle[],
  lead: string,
  siteUrl: string,
  dateLabel: string,
) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.EMAIL_TO;
  const from = process.env.EMAIL_FROM ?? 'Daily Three <onboarding@resend.dev>';

  if (!apiKey || !to) {
    console.log('[email] Skipped (RESEND_API_KEY or EMAIL_TO not set)');
    return;
  }

  const resend = new Resend(apiKey);
  const items = articles
    .map(
      (a, i) =>
        `<h2>${i + 1}. ${escape(a.title)}</h2><p>${escape(a.summary)}</p><p><a href="${a.url}">原文</a> · ${escape(a.source)}</p>`,
    )
    .join('');

  await resend.emails.send({
    from,
    to,
    subject: `Daily Three — ${dateLabel}`,
    html: `<p>${escape(lead)}</p>${items}<p><a href="${siteUrl}">サイトで読む</a></p>`,
  });
  console.log('[email] Sent to', to);
}

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
