import { getSupabaseBrowser } from './feedback-client';

export type SubscribeResult =
  | { ok: true }
  | { ok: false; error: 'unavailable' | 'invalid_email' | 'failed' };

export async function subscribeToDigest(email: string, locale: 'ja' | 'en'): Promise<SubscribeResult> {
  const supabase = getSupabaseBrowser();
  if (!supabase) return { ok: false, error: 'unavailable' };

  const trimmed = email.trim();
  if (!trimmed) return { ok: false, error: 'invalid_email' };

  const { data, error } = await supabase.rpc('subscribe_to_digest', {
    p_email: trimmed,
    p_locale: locale,
  });

  if (error) {
    console.warn('[subscribe]', error.message);
    return { ok: false, error: 'failed' };
  }

  const row = data as { ok?: boolean; error?: string } | null;
  if (!row?.ok) {
    if (row?.error === 'invalid_email') return { ok: false, error: 'invalid_email' };
    return { ok: false, error: 'failed' };
  }

  return { ok: true };
}
