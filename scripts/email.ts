import { Resend } from 'resend';
import type { DigestArticle } from './types.js';
import { loadDigestSubscribers, type DigestSubscriber } from './subscribers-supabase.js';

function escape(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function buildDigestHtml(articles: DigestArticle[], lead: string, siteUrl: string) {
  const items = articles
    .map(
      (a, i) =>
        `<h2>${i + 1}. ${escape(a.title)}</h2><p>${escape(a.summary)}</p><p><a href="${a.url}">原文</a> · ${escape(a.source)}</p>`,
    )
    .join('');
  return `<p>${escape(lead)}</p>${items}<p><a href="${siteUrl}">サイトで読む</a></p>`;
}

export async function sendDigestEmails(params: {
  ja: { articles: DigestArticle[]; lead: string };
  en: { articles: DigestArticle[]; lead: string };
  siteUrlJa: string;
  siteUrlEn: string;
  dateLabel: string;
}) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? 'Daily Three <onboarding@resend.dev>';
  if (!apiKey) {
    console.log('[email] Skipped (RESEND_API_KEY not set)');
    return;
  }

  const resend = new Resend(apiKey);
  const adminTo = process.env.EMAIL_TO?.trim();

  if (adminTo) {
    const html = buildDigestHtml(params.ja.articles, params.ja.lead, params.siteUrlJa);
    await resend.emails.send({
      from,
      to: adminTo,
      subject: `Daily Three — ${params.dateLabel}`,
      html,
    });
    console.log('[email] Sent admin copy to', adminTo);
  } else {
    console.log('[email] Admin copy skipped (EMAIL_TO not set)');
  }

  const subscribers = await loadDigestSubscribers();
  if (subscribers.length === 0) {
    console.log('[email] No subscribers to notify');
    return;
  }

  let sent = 0;
  let failed = 0;
  for (const sub of subscribers) {
    const useEn = sub.locale === 'en' && params.en.articles.length === 3 && params.en.lead?.trim();
    const articles = useEn ? params.en.articles : params.ja.articles;
    const lead = useEn ? params.en.lead : params.ja.lead;
    const siteUrl = useEn ? params.siteUrlEn : params.siteUrlJa;
    const html = buildDigestHtml(articles, lead, siteUrl);

    const { error } = await resend.emails.send({
      from,
      to: sub.email,
      subject: `Daily Three — ${params.dateLabel}`,
      html: `${html}<p style="font-size:12px;color:#666">配信停止は GitHub Issues からご連絡ください / Unsubscribe via GitHub Issues.</p>`,
    });

    if (error) {
      failed += 1;
      console.warn('[email] Subscriber failed:', sub.email, error.message);
    } else {
      sent += 1;
    }
  }

  console.log(`[email] Digest sent to ${sent} subscriber(s)${failed ? `, ${failed} failed` : ''}`);
}

/** @deprecated Use sendDigestEmails */
export async function sendDigestEmail(
  articles: DigestArticle[],
  lead: string,
  siteUrl: string,
  dateLabel: string,
) {
  const siteBase = siteUrl.replace(/\/ja\/?$/, '');
  await sendDigestEmails({
    ja: { articles, lead },
    en: { articles: [], lead: '' },
    siteUrlJa: siteUrl,
    siteUrlEn: `${siteBase}/en/`,
    dateLabel,
  });
}
