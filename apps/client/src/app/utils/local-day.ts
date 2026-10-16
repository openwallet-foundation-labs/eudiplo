/** A local calendar day as `YYYY-MM-DD`, the format of day filters in URLs. */
export function toDay(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight of a `YYYY-MM-DD` day, or null for anything else. */
export function fromDay(value: string | null): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  return match ? new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3])) : null;
}

/** Local midnights of the last `count` days, oldest first; the last one is today. */
export function lastDays(count: number, now = new Date()): Date[] {
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    day.setDate(day.getDate() - (count - 1 - index));
    return day;
  });
}

const HOUR_MS = 3_600_000;

/** Starts of the last `count` local hours, oldest first; the last one is the current hour. */
export function lastHours(count: number, now = new Date()): Date[] {
  // Steps of real hours, so the hour skipped when clocks move forward is not counted twice.
  const current = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
  return Array.from(
    { length: count },
    (_, index) => new Date(current.getTime() - (count - 1 - index) * HOUR_MS)
  );
}
