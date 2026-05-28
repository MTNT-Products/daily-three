import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import type { FeedbackEntry } from './types.js';

/** Aggregate all visitor votes by source_id for digest ranking (service role only). */
export async function loadFeedbackWeightsFromSupabase(): Promise<Record<string, number>> {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return {};

  const supabase = createClient(url, key, { auth: { persistSession: false } });
  const { data, error } = await supabase.from('feedback').select('source_id, verdict');

  if (error) {
    console.warn('[feedback] Supabase read failed:', error.message);
    return {};
  }

  const weights: Record<string, number> = {};
  for (const row of data ?? []) {
    const delta = row.verdict === 'good' ? 0.05 : -0.08;
    weights[row.source_id] = (weights[row.source_id] ?? 1) + delta;
  }
  return weights;
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
