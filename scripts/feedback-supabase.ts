import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { FeedbackEntry } from './types.js';

/** Supabase caps a single select at 1000 rows and says nothing about the rest. */
const PAGE_SIZE = 1000;

/**
 * Ranking weights are a nicety; a malformed SUPABASE_URL makes createClient throw
 * synchronously, and that used to end the run before a single feed was read.
 */
function connect(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) return null;
  try {
    return createClient(url, key, { auth: { persistSession: false } });
  } catch (e) {
    console.warn('[feedback] Supabase client could not be created:', (e as Error).message);
    return null;
  }
}

/** Aggregate all visitor votes by source_id for digest ranking (service role only). */
export async function loadFeedbackWeightsFromSupabase(): Promise<Record<string, number>> {
  const supabase = connect();
  if (!supabase) return {};

  const rows: { source_id: string; verdict: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('feedback')
      .select('source_id, verdict')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn('[feedback] Supabase read failed:', error.message);
      return {};
    }
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  const weights: Record<string, number> = {};
  for (const row of rows) {
    const delta = row.verdict === 'good' ? 0.05 : -0.08;
    weights[row.source_id] = (weights[row.source_id] ?? 1) + delta;
  }
  return weights;
}

/** Good votes per article URL — used to choose which of the three to feature on X. */
export async function loadGoodCountsByUrl(urls: string[]): Promise<Record<string, number>> {
  if (urls.length === 0) return {};
  const supabase = connect();
  if (!supabase) return {};

  const rows: { url: string }[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const { data, error } = await supabase
      .from('feedback')
      .select('url, verdict')
      .in('url', urls)
      .eq('verdict', 'good')
      .range(from, from + PAGE_SIZE - 1);
    if (error) {
      console.warn('[feedback] Supabase good-count read failed:', error.message);
      return {};
    }
    rows.push(...(data ?? []));
    if ((data?.length ?? 0) < PAGE_SIZE) break;
  }

  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.url] = (counts[row.url] ?? 0) + 1;
  }
  return counts;
}

/** Fallback when Supabase is not configured in CI. */
export function loadFeedbackWeightsFromJsonl(): Record<string, number> {
  const path = join(process.cwd(), 'data', 'feedback.jsonl');
  const weights: Record<string, number> = {};
  if (!existsSync(path)) return weights;

  const lines = readFileSync(path, 'utf-8').trim().split('\n').filter(Boolean);
  for (const line of lines) {
    try {
      const e = JSON.parse(line) as FeedbackEntry;
      const delta = e.verdict === 'good' ? 0.05 : -0.08;
      weights[e.sourceId] = (weights[e.sourceId] ?? 1) + delta;
    } catch {
      /* skip */
    }
  }
  return weights;
}

export async function loadFeedbackWeightsMerged(): Promise<Record<string, number>> {
  const fromDb = await loadFeedbackWeightsFromSupabase();
  if (Object.keys(fromDb).length > 0) return fromDb;
  return loadFeedbackWeightsFromJsonl();
}
