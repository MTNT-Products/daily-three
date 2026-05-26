export const STORAGE_KEY = 'daily-three-feedback';

export interface StoredFeedback {
  verdict: 'good' | 'bad';
  url: string;
  sourceId: string;
  date: string;
}

export type FeedbackStore = Record<string, StoredFeedback>;

function isStoredFeedback(value: unknown): value is StoredFeedback {
  if (!value || typeof value !== 'object') return false;
  const v = value as StoredFeedback;
  return (
    (v.verdict === 'good' || v.verdict === 'bad') &&
    typeof v.url === 'string' &&
    typeof v.sourceId === 'string' &&
    typeof v.date === 'string'
  );
}

export function loadFeedback(): FeedbackStore {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Record<string, unknown>;
    const out: FeedbackStore = {};
    for (const [id, value] of Object.entries(raw)) {
      if (isStoredFeedback(value)) out[id] = value;
    }
    return out;
  } catch {
    return {};
  }
}

export function saveFeedback(data: FeedbackStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function exportFeedbackJsonl(): string {
  const entries = Object.values(loadFeedback());
  return entries
    .map((e) =>
      JSON.stringify({
        date: e.date,
        url: e.url,
        sourceId: e.sourceId,
        verdict: e.verdict,
      }),
    )
    .join('\n');
}

export function downloadFeedbackExport() {
  const jsonl = exportFeedbackJsonl();
  if (!jsonl) return 0;

  const blob = new Blob([`${jsonl}\n`], { type: 'application/x-ndjson' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `feedback-export-${new Date().toISOString().slice(0, 10)}.jsonl`;
  a.click();
  URL.revokeObjectURL(url);
  return jsonl.split('\n').length;
}
