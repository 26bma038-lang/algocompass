import { describe, expect, it } from "vitest";
import type { CfSubmission } from "@/data/types";
import { ACHIEVEMENTS, evaluateAchievements, firstUpsolveAt, type AchievementInput } from "./achievements";

const t = (d: number, h = 12, m = 0) => Math.floor(new Date(2026, 9, d, h, m).getTime() / 1000);
const sub = (id: number, key: string, at: number, verdict = "OK", rating: number | null = 1000): CfSubmission => ({
  id, problemKey: key, contestId: 1, problemIndex: "A", problemName: key, problemRating: rating, tags: [], verdict, createdAt: at, language: "C++",
});
const empty: AchievementInput = {
  cfSubmissions: [], ratingHistory: [], contestResults: [], cfMaxRating: null, lcRecentAc: [], lcProblems: [], lcSolved: null,
  lcContests: [], manualSolves: [], questDays: [], activeDays: [], topics: null, blindSpots: null,
};
const run = (input: Partial<AchievementInput>) => new Map(evaluateAchievements({ ...empty, ...input }).map((s) => [s.id, s]));
const days = (from: number, n: number) => Array.from({ length: n }, (_, i) => `2026-10-${String(from + i).padStart(2, "0")}`);

describe("catalogue", () => {
  it("has about 30 achievements across all five categories, with unique ids", () => {
    expect(ACHIEVEMENTS.length).toBeGreaterThanOrEqual(30);
    expect(new Set(ACHIEVEMENTS.map((a) => a.id)).size).toBe(ACHIEVEMENTS.length);
    expect(new Set(ACHIEVEMENTS.map((a) => a.category))).toEqual(new Set(["Consistency", "Codeforces", "LeetCode", "Topics", "Fun"]));
  });
  it("starts with nothing unlocked", () => {
    expect([...run({}).values()].filter((s) => s.unlocked)).toEqual([]);
  });
});

describe("streaks", () => {
  it("dates a streak by the day the run reached it, and shows best-run progress", () => {
    const s = run({ activeDays: [...days(1, 3), ...days(10, 8)] });
    expect(s.get("streak_3")!.unlocked).toBe(true);
    expect(s.get("streak_3")!.at).toBe(t(3));
    expect(s.get("streak_7")!.at).toBe(t(16));
    expect(s.get("streak_30")!.progress).toEqual({ value: 8, target: 30, label: "Best streak" });
  });
});

describe("Codeforces", () => {
  const history = [
    { contestId: 1, contestName: "R1", rank: 1, oldRating: 0, newRating: 1150, at: t(2) },
    { contestId: 2, contestName: "R2", rank: 1, oldRating: 1150, newRating: 1180, at: t(5) },
    { contestId: 3, contestName: "R3", rank: 1, oldRating: 1180, newRating: 1230, at: t(9) },
  ];
  it("counts rounds and dates promotions and big climbs", () => {
    const s = run({ ratingHistory: history });
    expect(s.get("cf_first_contest")!.at).toBe(t(2));
    expect(s.get("cf_contests_10")!.progress).toMatchObject({ value: 3, target: 10 });
    expect(s.get("cf_pupil")!.at).toBe(t(9));
    expect(s.get("cf_specialist")!.progress).toMatchObject({ value: 1230, target: 1400 });
    expect(s.get("cf_plus_50")!.at).toBe(t(2)); // +1150 in the first round
  });
  it("finds the first solve above your rating at the time", () => {
    const s = run({ ratingHistory: history, cfSubmissions: [sub(1, "a", t(3), "OK", 1100), sub(2, "b", t(6), "OK", 1200)] });
    expect(s.get("cf_above_rating")!.at).toBe(t(6));
  });
  it("finds upsolves: accepted on a later day than a failed try", () => {
    expect(firstUpsolveAt([sub(1, "a", t(1, 10), "WRONG_ANSWER"), sub(2, "a", t(1, 11))])).toBeNull();
    expect(firstUpsolveAt([sub(1, "a", t(1, 10), "WRONG_ANSWER"), sub(2, "a", t(4, 11))])).toBe(t(4, 11));
  });
});

describe("LeetCode", () => {
  it("dates a first Medium from a dated solve, or counts it undated from LeetCode's totals", () => {
    const dated = run({
      lcRecentAc: [{ id: "1", title: "", slug: "m", timestamp: t(7) }],
      lcProblems: [{ slug: "m", difficulty: "Medium", tags: [] }],
      lcSolved: { easy: 0, medium: 1, hard: 0, all: 1 },
    });
    expect(dated.get("lc_first_medium")).toMatchObject({ unlocked: true, at: t(7) });
    const undated = run({ lcSolved: { easy: 10, medium: 3, hard: 0, all: 13 } });
    expect(undated.get("lc_first_medium")).toMatchObject({ unlocked: true, at: null });
    expect(undated.get("lc_first_hard")!.unlocked).toBe(false);
    expect(undated.get("lc_50")!.progress).toMatchObject({ value: 13, target: 50 });
  });
});

describe("topics", () => {
  const topic = (status: string) => ({ topicId: status, name: status, score: 0, status }) as never;
  it("reads statuses and blind spots", () => {
    const s = run({ topics: [topic("Strong"), topic("Weak"), topic("Locked")], blindSpots: 2 });
    expect(s.get("topic_strong")!.unlocked).toBe(true);
    expect(s.get("topic_mastered")!.unlocked).toBe(false);
    expect(s.get("topics_unlocked_10")!.progress).toMatchObject({ value: 2, target: 10 });
    expect(s.get("blind_spots_tried")!.progress?.label).toBe("2 left");
    expect(run({ topics: [], blindSpots: 0 }).get("blind_spots_tried")!.unlocked).toBe(true);
  });
});

describe("fun", () => {
  it("night owl, early bird, five in a day, weekend and comeback", () => {
    const s = run({
      cfSubmissions: [
        sub(1, "a", t(1, 1, 30)), // Thu 00:30 am → night owl
        sub(2, "b", t(3, 6)), // Sat 6 am → early bird
        sub(3, "c", t(4, 9)), // Sun → weekend with Saturday
        ...["d", "e", "f", "g", "h"].map((k, i) => sub(10 + i, k, t(20, 10 + i))), // 16 days later, 5 in a day
      ],
    });
    expect(s.get("night_owl")!.at).toBe(t(1, 1, 30));
    expect(s.get("early_bird")!.at).toBe(t(3, 6));
    expect(s.get("weekend_warrior")!.at).toBe(t(4, 9));
    expect(s.get("comeback")!.at).toBe(t(20, 10));
    expect(s.get("five_in_day")!.at).toBe(t(20, 14));
  });
});

describe("quests", () => {
  it("first quest and perfect weeks (every quest, every day, Monday to Sunday)", () => {
    const week = days(12, 7).map((day) => ({ day, total: 3, done: 3, lastAt: t(Number(day.slice(8)), 20) }));
    const s = run({ questDays: week });
    expect(s.get("first_quest")!.at).toBe(t(12, 20));
    expect(s.get("perfect_weeks_4")!.progress).toMatchObject({ value: 1, target: 4 });
    const broken = run({ questDays: week.map((d, i) => (i === 3 ? { ...d, done: 2 } : d)) });
    expect(broken.get("perfect_weeks_4")!.progress).toMatchObject({ value: 0 });
  });
});
