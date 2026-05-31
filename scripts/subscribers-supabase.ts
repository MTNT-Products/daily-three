import { createClient } from '@supabase/supabase-js';

export type DigestSubscriber = {
  email: string;
  locale: 'ja' | 'en';
};

/** Active digest subscribers (service role only). */
export async function loadDigestSubscribers(): Promise<DigestSubscriber[]> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return [];

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase
    .from('email_subscribers')
    .select('email, locale')
    .is('unsubscribed_at', null);

  if (error) {
    console.warn('[subscribers] Supabase read failed:', error.message);
    return [];
  }

  return (data ?? []).map((row) => ({
    email: row.email as string,
    locale: row.locale === 'en' ? 'en' : 'ja',
  }));
}
