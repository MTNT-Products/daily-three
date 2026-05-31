/** Digest calendar follows site operator timezone (weekday evenings in Japan). */
export const DIGEST_TIMEZONE = 'Asia/Tokyo';

/** YYYY-MM-DD in digest timezone (for slug / display date). */
export function digestCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DIGEST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** 0 = Sunday … 6 = Saturday in digest timezone. */
export function digestWeekdayIndex(now = new Date()): number {
  const short = new Intl.DateTimeFormat('en-US', {
    timeZone: DIGEST_TIMEZONE,
    weekday: 'short',
  }).format(now);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? 0;
}

export function isDigestWeekday(now = new Date()): boolean {
  const d = digestWeekdayIndex(now);
  return d >= 1 && d <= 5;
}

/** Noon JST on the digest calendar day (stable slug regardless of CI delay). */
export function digestPublishDate(now = new Date()): Date {
  const ymd = digestCalendarDate(now);
  return new Date(`${ymd}T12:00:00+09:00`);
}
