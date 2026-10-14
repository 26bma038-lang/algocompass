import type { DailyActivity } from "@/data/types";

export interface DayTotals {
  day: string; // YYYY-MM-DD
  cf: number;
  lc: number;
  total: number;
}

/** Local YYYY-MM-DD for a Date. */
export function dayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function addDays(d: Date, n: number): Date {
  const out = new Date(d);
  out.setDate(out.getDate() + n);
  return out;
}

/** Merges per-platform rows into one total per day. */
export function mergeActivity(rows: readonly DailyActivity[]): Map<string, DayTotals> {
  const map = new Map<string, DayTotals>();
  for (const r of rows) {
    const cur = map.get(r.day) ?? { day: r.day, cf: 0, lc: 0, total: 0 };
    cur[r.platform] += r.count;
    cur.total += r.count;
    map.set(r.day, cur);
  }
  return map;
}

export interface Streak {
  /** Consecutive active days ending today, or ending yesterday if today isn't done yet. */
  current: number;
  longest: number;
  activeToday: boolean;
  todayCount: number;
}

/** A day counts when either platform has activity on it. */
export function computeStreak(days: ReadonlyMap<string, DayTotals>, today: Date): Streak {
  const active = (d: Date) => (days.get(dayKey(d))?.total ?? 0) > 0;
  const activeToday = active(today);
  let cursor = activeToday ? today : addDays(today, -1);
  let current = 0;
  while (active(cursor)) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let longest = 0;
  let run = 0;
  let prev: string | null = null;
  for (const key of [...days.keys()].filter((k) => days.get(k)!.total > 0).sort()) {
    const expected: string | null = prev ? dayKey(addDays(new Date(`${prev}T12:00:00`), 1)) : null;
    run = expected === key ? run + 1 : 1;
    longest = Math.max(longest, run);
    prev = key;
  }

  return { current, longest: Math.max(longest, current), activeToday, todayCount: days.get(dayKey(today))?.total ?? 0 };
}

export interface HeatCell extends DayTotals {
  date: Date;
  future: boolean;
}

/**
 * Week columns (Monday first) covering the last `weeks` weeks up to today,
 * for the activity heatmap. Days after today are flagged `future`.
 */
export function heatmapWeeks(days: ReadonlyMap<string, DayTotals>, today: Date, weeks = 26): HeatCell[][] {
  const mondayOffset = (today.getDay() + 6) % 7; // 0 = Monday
  const start = addDays(today, -mondayOffset - (weeks - 1) * 7);
  const out: HeatCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const col: HeatCell[] = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const key = dayKey(date);
      const t = days.get(key) ?? { day: key, cf: 0, lc: 0, total: 0 };
      col.push({ ...t, date, future: date > today });
    }
    out.push(col);
  }
  return out;
}

/** Quantize a count into 0–4 intensity steps (0 = none), scaled to the user's own busiest days. */
export function intensity(count: number, max: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  if (max <= 1) return 4;
  const r = count / max;
  return r > 0.75 ? 4 : r > 0.5 ? 3 : r > 0.25 ? 2 : 1;
}
