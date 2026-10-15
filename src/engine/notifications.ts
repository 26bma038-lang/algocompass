import type { Contest } from "@/data/types";

/**
 * Reminder scheduling. Pure: builds the list the Rust scheduler fires from (src-tauri/src/lib.rs),
 * which keeps working while the window sits hidden in the tray. Every reminder has a window
 * [at, expiresAt): a reminder that can't fire in time is dropped, never sent late with a wrong
 * claim ("in 1 hour" ten minutes before the start).
 */

export interface Reminder {
  key: string;
  at: number;
  expiresAt: number;
  title: string;
  body: string;
}

export interface ReminderPrefs {
  contests: boolean;
  streak: boolean;
  /** Local "HH:MM". */
  streakTime: string;
}

export interface ScheduleInput {
  /** Epoch seconds. */
  now: number;
  contests: readonly Contest[];
  /** "I'll attend" contest ids. */
  attending: ReadonlySet<string>;
  prefs: ReminderPrefs;
  /** Null before any data: no streak reminder. */
  streak: { current: number; activeToday: boolean } | null;
  /** Formats a start time for the body ("8:05 pm"). Injected so tests stay locale-free. */
  formatTime?: (epochSeconds: number) => string;
}

/**
 * Leads before an attended contest: 1 hour, then 10 minutes. Each is only true for a short while,
 * so it may fire up to GRACE late (a 1-hour reminder 30 minutes before would be a lie).
 */
export const CONTEST_LEADS = [
  { minutes: 60, label: "in 1 hour" },
  { minutes: 10, label: "in 10 minutes" },
] as const;
export const CONTEST_GRACE_SECONDS = 10 * 60;

const defaultTime = (t: number) => new Date(t * 1000).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });

/** Local midnight of the day containing `t`, plus `minutes`. */
function localDayAt(t: number, minutes: number, dayOffset = 0): number {
  const d = new Date(t * 1000);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + dayOffset, 0, minutes).getTime() / 1000);
}

export function parseHhmm(hhmm: string): number {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm);
  if (!m) return 20 * 60;
  return Math.min(23, Number(m[1])) * 60 + Math.min(59, Number(m[2]));
}

/** Local YYYY-MM-DD for a key. */
function dayKey(t: number): string {
  const d = new Date(t * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function buildSchedule(input: ScheduleInput): Reminder[] {
  const fmt = input.formatTime ?? defaultTime;
  const out: Reminder[] = [];

  if (input.prefs.contests) {
    for (const c of input.contests) {
      if (!input.attending.has(c.id) || c.startTime <= input.now) continue;
      const site = c.platform === "cf" ? "Codeforces" : "LeetCode";
      for (const lead of CONTEST_LEADS) {
        const at = c.startTime - lead.minutes * 60;
        const expiresAt = Math.min(at + CONTEST_GRACE_SECONDS, c.startTime);
        if (expiresAt <= input.now) continue;
        out.push({
          key: `contest:${c.id}:${lead.minutes}`,
          at,
          expiresAt,
          title: `${site} contest ${lead.label}`,
          body: `${c.name} starts at ${fmt(c.startTime)}.`,
        });
      }
    }
  }

  const s = input.streak;
  if (input.prefs.streak && s && s.current > 0 && !s.activeToday) {
    const at = localDayAt(input.now, parseHhmm(input.prefs.streakTime));
    const midnight = localDayAt(input.now, 0, 1);
    if (midnight > input.now) {
      out.push({
        key: `streak:${dayKey(input.now)}`,
        at,
        expiresAt: midnight,
        title: "Streak at risk",
        body: `Solve one problem before midnight to keep your ${s.current}-day streak.`,
      });
    }
  }

  return out.sort((a, b) => a.at - b.at);
}

/** What should fire right now (mirrors the Rust scheduler's check). */
export function dueReminders(schedule: readonly Reminder[], now: number, fired: ReadonlySet<string>): Reminder[] {
  return schedule.filter((r) => !fired.has(r.key) && r.at <= now && now < r.expiresAt);
}

/** The streak reminder's time today, so the app can sync just before it and not nag on stale data. */
export function streakCheckAt(now: number, prefs: ReminderPrefs): number {
  return localDayAt(now, parseHhmm(prefs.streakTime));
}
