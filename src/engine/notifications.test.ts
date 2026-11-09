import { describe, expect, it } from "vitest";
import type { Contest } from "@/data/types";
import { buildSchedule, dailyReminderText, dueReminders, type ReminderPrefs } from "./notifications";

const at = (h: number, m = 0, day = 15) => Math.floor(new Date(2026, 9, day, h, m).getTime() / 1000);
const PREFS: ReminderPrefs = { contests: true, streak: true, streakTime: "20:00" };
const fmt = () => "8:05 pm";

const round = (id: string, start: number, platform: Contest["platform"] = "cf"): Contest => ({
  id,
  platform,
  name: `Round ${id}`,
  startTime: start,
  durationSeconds: 7200,
  phase: "upcoming",
  url: "u",
});

describe("contest reminders", () => {
  const contests = [round("cf:1", at(20, 5)), round("cf:2", at(22)), round("lc:w", at(8, 0, 18), "lc")];

  it("schedules 1 hour and 10 minutes before attended contests only", () => {
    const s = buildSchedule({ now: at(12), contests, attending: new Set(["cf:1", "lc:w"]), prefs: PREFS, streak: null, formatTime: fmt });
    expect(s.map((r) => r.key)).toEqual(["contest:cf:1:60", "contest:cf:1:10", "contest:lc:w:60", "contest:lc:w:10"]);
    const [hour, ten] = s;
    expect(hour).toMatchObject({ at: at(19, 5), expiresAt: at(19, 15), title: "Codeforces contest in 1 hour", body: "Round cf:1 starts at 8:05 pm." });
    expect(ten).toMatchObject({ at: at(19, 55), expiresAt: at(20, 5), title: "Codeforces contest in 10 minutes" });
    expect(s[2]!.title).toBe("LeetCode contest in 1 hour");
  });

  it("drops a lead that is no longer true (opened 30 minutes before: only the 10-minute one)", () => {
    const s = buildSchedule({ now: at(19, 35), contests, attending: new Set(["cf:1"]), prefs: PREFS, streak: null });
    expect(s.map((r) => r.key)).toEqual(["contest:cf:1:10"]);
  });

  it("skips contests that already started, and everything when the toggle is off", () => {
    expect(buildSchedule({ now: at(20, 6), contests, attending: new Set(["cf:1"]), prefs: PREFS, streak: null })).toEqual([]);
    expect(buildSchedule({ now: at(12), contests, attending: new Set(["cf:1"]), prefs: { ...PREFS, contests: false }, streak: null })).toEqual([]);
  });
});

describe("streak reminder", () => {
  const base = { contests: [], attending: new Set<string>(), prefs: PREFS };

  it("fires at the evening time when a streak is running and nothing is solved today", () => {
    const [r] = buildSchedule({ ...base, now: at(9), streak: { current: 6, activeToday: false } });
    expect(r).toMatchObject({ key: "streak:2026-10-15", at: at(20), expiresAt: at(0, 0, 16), title: "Streak at risk" });
    expect(r!.body).toContain("6-day streak");
  });

  it("follows the time set in Settings", () => {
    const [r] = buildSchedule({ ...base, prefs: { ...PREFS, streakTime: "21:30" }, now: at(9), streak: { current: 2, activeToday: false } });
    expect(r!.at).toBe(at(21, 30));
  });

  it("stays quiet with no streak, after a solve today, or when turned off", () => {
    expect(buildSchedule({ ...base, now: at(9), streak: { current: 0, activeToday: false } })).toEqual([]);
    expect(buildSchedule({ ...base, now: at(9), streak: { current: 6, activeToday: true } })).toEqual([]);
    expect(buildSchedule({ ...base, now: at(9), streak: null })).toEqual([]);
    expect(buildSchedule({ ...base, prefs: { ...PREFS, streak: false }, now: at(9), streak: { current: 6, activeToday: false } })).toEqual([]);
  });

  it("still fires when the app opens after the reminder time, until midnight", () => {
    const s = buildSchedule({ ...base, now: at(22), streak: { current: 3, activeToday: false } });
    expect(dueReminders(s, at(22), new Set()).map((r) => r.key)).toEqual(["streak:2026-10-15"]);
  });
});

describe("dueReminders", () => {
  const s = buildSchedule({ now: at(12), contests: [round("cf:1", at(20, 5))], attending: new Set(["cf:1"]), prefs: PREFS, streak: { current: 4, activeToday: false } });

  it("returns what's inside its window and not fired yet", () => {
    expect(dueReminders(s, at(19), new Set())).toEqual([]);
    expect(dueReminders(s, at(19, 6), new Set()).map((r) => r.key)).toEqual(["contest:cf:1:60"]);
    expect(dueReminders(s, at(19, 56), new Set()).map((r) => r.key)).toEqual(["contest:cf:1:10"]);
    expect(dueReminders(s, at(20, 1), new Set(["contest:cf:1:10"])).map((r) => r.key)).toEqual(["streak:2026-10-15"]);
  });

  it("never fires a reminder twice", () => {
    expect(dueReminders(s, at(19, 6), new Set(["contest:cf:1:60"]))).toEqual([]);
  });
});

describe("daily reminder (v1.7)", () => {
  const base = { contests: [], attending: new Set<string>(), streak: null };
  const prefs: ReminderPrefs = { ...PREFS, daily: true, dailyTime: "18:00" };
  const daily = dailyReminderText({ kind: "problem", title: "Two Sum", site: "LeetCode" });

  it("names today's exact next problem at the set time", () => {
    const [r] = buildSchedule({ ...base, now: at(9), prefs, daily });
    expect(r).toMatchObject({ key: "daily:2026-10-15", at: at(18), expiresAt: at(21), title: "Today's next problem", body: "Two Sum on LeetCode." });
  });

  it("names a due review when that is the next thing", () => {
    const text = dailyReminderText({ kind: "review", title: "Koko Eating Bananas", site: "LeetCode", solvedAgo: "Solved 8 days ago" });
    expect(text.title).toBe("Time to review");
    expect(text.body).toContain("Koko Eating Bananas");
    expect(text.body).toContain("Solved 8 days ago");
  });

  it("sends nothing when goals are done (no text), when off, or when not computed", () => {
    expect(buildSchedule({ ...base, now: at(9), prefs, daily: null })).toEqual([]);
    expect(buildSchedule({ ...base, now: at(9), prefs })).toEqual([]);
    expect(buildSchedule({ ...base, now: at(9), prefs: { ...prefs, daily: false }, daily })).toEqual([]);
    expect(buildSchedule({ ...base, now: at(9), prefs: PREFS, daily })).toEqual([]);
  });

  it("is still sent when the app opens a little late, dropped once the grace is over, and never past midnight", () => {
    expect(buildSchedule({ ...base, now: at(19, 30), prefs, daily })).toHaveLength(1);
    expect(buildSchedule({ ...base, now: at(21, 1), prefs, daily })).toEqual([]);
    const late = buildSchedule({ ...base, now: at(22), prefs: { ...prefs, dailyTime: "23:00" }, daily });
    expect(late[0]!.expiresAt).toBe(at(0, 0, 16));
  });

  it("fires as due only inside its window, once", () => {
    const s = buildSchedule({ ...base, now: at(9), prefs, daily });
    expect(dueReminders(s, at(17, 59), new Set())).toEqual([]);
    expect(dueReminders(s, at(18, 1), new Set())).toHaveLength(1);
    expect(dueReminders(s, at(18, 1), new Set(["daily:2026-10-15"]))).toEqual([]);
  });
});
