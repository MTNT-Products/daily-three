import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type Verdict = 'good' | 'bad';

export interface MyVote {
  url: string;
  verdict: Verdict;
  sourceId: string;
}

let supabaseSingleton: SupabaseClient | null | undefined;

export function getSupabaseBrowser(): SupabaseClient | null {
  if (supabaseSingleton !== undefined) return supabaseSingleton;

  const url = PUBLIC_SUPABASE_URL;
  const key = PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    supabaseSingleton = null;
    return null;
  }

  supabaseSingleton = createClient(url, key);
  return supabaseSingleton;
}

function formatAuthError(error: { message?: string; status?: number }): string {
  const msg = error.message ?? '認証に失敗しました';
  if (/anonymous sign-ins are disabled/i.test(msg)) {
    return '匿名ログインが無効です。Supabase → Authentication → Providers で Anonymous sign-ins を ON にしてください。';
  }
  return msg;
}

export async function ensureAnonymousSession(supabase: SupabaseClient): Promise<string> {
  const { data: sessionData } = await supabase.auth.getSession();
  if (sessionData.session?.user.id) return sessionData.session.user.id;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw new Error(formatAuthError(error));
  if (!data.user) throw new Error('Anonymous sign-in failed');
  return data.user.id;
}

export async function fetchMyVotes(urls: string[]): Promise<Record<string, Verdict>> {
  const supabase = getSupabaseBrowser();
  if (!supabase || urls.length === 0) return {};

  await ensureAnonymousSession(supabase);
  const { data, error } = await supabase.from('feedback').select('url, verdict').in('url', urls);

  if (error) throw error;

  const out: Record<string, Verdict> = {};
  for (const row of data ?? []) {
    if (row.verdict === 'good' || row.verdict === 'bad') out[row.url] = row.verdict;
  }
  return out;
}

export async function upsertVote(params: {
  url: string;
  sourceId: string;
  verdict: Verdict;
}): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error('Supabase is not configured');

  const userId = await ensureAnonymousSession(supabase);
  const { error } = await supabase.from('feedback').upsert(
    {
      url: params.url,
      user_id: userId,
      source_id: params.sourceId,
      verdict: params.verdict,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'url,user_id' },
  );

  if (error) throw error;
}

export async function deleteVote(url: string): Promise<void> {
  const supabase = getSupabaseBrowser();
  if (!supabase) throw new Error('Supabase is not configured');

  await ensureAnonymousSession(supabase);
  const { error } = await supabase.from('feedback').delete().eq('url', url);
  if (error) throw error;
}
