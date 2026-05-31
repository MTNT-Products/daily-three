import { PUBLIC_SUPABASE_ANON_KEY, PUBLIC_SUPABASE_URL } from 'astro:env/client';

/** True when the in-site subscribe form can call Supabase RPC. */
export function isSubscribeFormEnabled(): boolean {
  const url = PUBLIC_SUPABASE_URL?.trim();
  const key = PUBLIC_SUPABASE_ANON_KEY?.trim();
  return Boolean(url && key);
}
