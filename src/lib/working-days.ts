/** Weekday count used for the company tailgate cadence. Weekends are skipped. Holidays are not. */

const LIMIT = 10;

function pacificParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const read = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? "0");
  return { year: read("year"), month: read("month"), day: read("day") };
}

function utcNoon(year: number, month: number, day: number) {
  return Date.UTC(year, month - 1, day, 12, 0, 0);
}

/** Weekdays after `from` through `until`, using Pacific calendar dates. Same day is 0. */
export function workingDaysSince(from: Date, until: Date): number {
  const start = pacificParts(from);
  const end = pacificParts(until);
  let cursor = utcNoon(start.year, start.month, start.day);
  const last = utcNoon(end.year, end.month, end.day);
  if (last <= cursor) return 0;
  let count = 0;
  cursor += 86_400_000;
  while (cursor <= last) {
    const day = new Date(cursor).getUTCDay();
    if (day !== 0 && day !== 6) count += 1;
    cursor += 86_400_000;
  }
  return count;
}

export type TailgateCadence = "ON_TIME" | "REVIEW_DUE";

/** On time through 10 working days. No completed meeting is review due. */
export function tailgateCadence(lastAt: Date | null, now = new Date()): TailgateCadence {
  if (!lastAt) return "REVIEW_DUE";
  return workingDaysSince(lastAt, now) > LIMIT ? "REVIEW_DUE" : "ON_TIME";
}
