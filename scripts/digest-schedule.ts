/** Digest calendar follows site operator timezone (weekday evenings in Japan). */
export const DIGEST_TIMEZONE = 'Asia/Tokyo';

/** YYYY-MM-DD in digest timezone (wall-clock calendar day). */
export function digestCalendarDate(now = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DIGEST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

type JstParts = { year: number; month: number; day: number; hour: number };

function jstParts(now: Date): JstParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: DIGEST_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: 'numeric',
    hour12: false,
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((p) => p.type === type)?.value ?? 0);
  return { year: get('year'), month: get('month'), day: get('day'), hour: get('hour') };
}

function ymdString(year: number, month: number, day: number): string {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

function previousCalendarDay(year: number, month: number, day: number) {
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() - 1);
  return { year: utc.getUTCFullYear(), month: utc.getUTCMonth() + 1, day: utc.getUTCDate() };
}

/**
 * Edition slug for the weekday evening digest.
 * Runs before noon JST count as the previous calendar day (covers GitHub schedule delay past midnight).
 */
export function digestEditionCalendarDate(now = new Date()): string {
  const { year, month, day, hour } = jstParts(now);
  if (hour < 12) {
    const prev = previousCalendarDay(year, month, day);
    return ymdString(prev.year, prev.month, prev.day);
  }
  return ymdString(year, month, day);
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

/** Noon JST on the digest edition day (stable when CI runs after midnight JST). */
export function digestPublishDate(now = new Date()): Date {
  const ymd = digestEditionCalendarDate(now);
  return new Date(`${ymd}T12:00:00+09:00`);
}
