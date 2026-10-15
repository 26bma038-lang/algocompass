import { describe, expect, it } from "vitest";
import type { CfRatingChange, CfSubmission } from "@/data/types";
import { cfSolveXp, CONTEST_XP, LC_XP, levelForXp, summarizeXp, titleForLevel, UPSOLVE_BONUS, xpEvents, xpForLevel, type XpInput } from "./xp";

const t = (d: number, h = 12) => Math.floor(new Date(2026, 9, d, h).getTime() / 1000);
const sub = (id: number, key: string, at: number, verdict = "OK", rating: number | null = 1000): CfSubmission => ({
  id, problemKey: key, contestId: 1, problemIndex: "A", problemName: key, problemRating: rating, tags: [], verdict, createdAt: at, language: "C++",
});
const empty: XpInput = {
  cfSubmissions: [], ratingHistory: [], contestResults: [], lcRecentAc: [], lcProblems: [], lcSolved: null, lcContests: [],
  manualSolves: [], completedQuests: [], activeDays: [],
};
const total = (input: Partial<XpInput>) => xpEvents({ ...empty, ...input }).reduce((n, e) => n + e.xp, 0);

describe("cfSolveXp", () => {
  it("is 10 at your rating and doubles per +300", () => {
    expect(cfSolveXp(1000, 1000)).toBe(10);
    expect(cfSolveXp(1300, 1000)).toBe(20);
    expect(cfSolveXp(700, 1000)).toBe(5);
  });
  it("is capped at 40 and floored at 2", () => {
    expect(cfSolveXp(3500, 1000)).toBe(40);
    expect(cfSolveXp(800, 3000)).toBe(2);
  });
  it("uses the unrated baseline (800) before your first rated round, and rating − 100 for unrated problems", () => {
    expect(cfSolveXp(800, null)).toBe(10);
    expect(cfSolveXp(null, 1000)).toBe(cfSolveXp(900, 1000));
  });
});

describe("xpEvents", () => {
  const history: CfRatingChange[] = [{ contestId: 9, contestName: "R", rank: 1, oldRating: 0, newRating: 1000, at: t(5) }];

  it("scores each CF problem once, at your rating when you solved it", () => {
    const before = total({ cfSubmissions: [sub(1, "a", t(1), "OK", 1100)], ratingHistory: history });
    const after = total({ cfSubmissions: [sub(1, "a", t(10), "OK", 1100)], ratingHistory: history });
    // 1100 vs the 800 baseline = 20; vs 1000 = 13. The round itself adds 40 to both.
    expect(before - CONTEST_XP.cf).toBe(20);
    expect(after - CONTEST_XP.cf).toBe(13);
    expect(total({ cfSubmissions: [sub(1, "a", t(1)), sub(2, "a", t(2))] })).toBe(total({ cfSubmissions: [sub(1, "a", t(1))] }));
  });

  it("adds an upsolve bonus for an AC on a later day than a failed try, not for same-day fixes", () => {
    const sameDay = total({ cfSubmissions: [sub(1, "a", t(1, 10), "WRONG_ANSWER"), sub(2, "a", t(1, 11))] });
    const laterDay = total({ cfSubmissions: [sub(1, "a", t(1, 10), "WRONG_ANSWER"), sub(2, "a", t(3, 11))] });
    expect(laterDay - sameDay).toBe(UPSOLVE_BONUS);
    const queued = total({ cfSubmissions: [sub(2, "a", t(3))], upsolveQueue: new Set(["a"]) });
    expect(queued - total({ cfSubmissions: [sub(2, "a", t(3))] })).toBe(UPSOLVE_BONUS);
  });

  it("scores LeetCode by difficulty, counting hidden solves once from LeetCode's totals", () => {
    const xp = total({
      lcRecentAc: [{ id: "1", title: "", slug: "two-sum", timestamp: t(1) }],
      lcProblems: [{ slug: "two-sum", difficulty: "Easy", tags: [] }],
      lcSolved: { easy: 3, medium: 1, hard: 1, all: 5 },
    });
    // Dated Easy + the hidden 2 Easy, 1 Medium, 1 Hard.
    expect(xp).toBe(LC_XP.Easy * 3 + LC_XP.Medium + LC_XP.Hard);
  });

  it("counts manual marks with the curated difficulty", () => {
    const xp = total({ manualSolves: [{ platform: "lc", problemId: "x", title: "X", topicId: null, solvedAt: t(1) }], lcDifficulty: new Map([["x", "Hard"]]) });
    expect(xp).toBe(LC_XP.Hard);
  });

  it("gives contests, quests and streak days their XP", () => {
    expect(total({ lcContests: [{ title: "W", startTime: t(1), rating: 1500, ranking: 1, solved: 2, total: 4 }] })).toBe(CONTEST_XP.lc);
    expect(total({ completedQuests: [{ completedAt: t(1), xp: 30 }, { completedAt: t(1), xp: 15 }] })).toBe(45);
    // 3-day run: 5, 6, 7. Then a gap restarts at 5.
    expect(total({ activeDays: ["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-05"] })).toBe(5 + 6 + 7 + 5);
  });

  it("caps the streak bonus at +10", () => {
    const days = Array.from({ length: 15 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
    const events = xpEvents({ ...empty, activeDays: days });
    expect(Math.max(...events.map((e) => e.xp))).toBe(15);
  });
});

describe("level curve", () => {
  it("starts at level 1 with any XP and is unlit with none", () => {
    expect(levelForXp(0).level).toBeNull();
    expect(levelForXp(1)).toMatchObject({ level: 1, title: "Novice Coder" });
  });
  it("is fast early and slower later", () => {
    expect(xpForLevel(2)).toBe(25);
    expect(xpForLevel(10)).toBeLessThan(900);
    const gap = (l: number) => xpForLevel(l + 1) - xpForLevel(l);
    expect(gap(30)).toBeGreaterThan(gap(5) * 3);
  });
  it("reports progress inside the level", () => {
    const info = levelForXp(xpForLevel(10) + 10);
    expect(info.level).toBe(10);
    expect(info.intoLevel).toBe(10);
    expect(info.toNext).toBe(xpForLevel(11) - xpForLevel(10));
    expect(info.title).toBe("Pattern Hunter");
  });
  it("names levels every five", () => {
    expect(titleForLevel(4)).toBe("Novice Coder");
    expect(titleForLevel(5)).toBe("Loop Apprentice");
    expect(titleForLevel(22)).toBe("Algorithm Smith");
    expect(titleForLevel(99)).toBe("Legend of the Judge");
  });
});

describe("summarizeXp", () => {
  it("breaks down today's XP by source and ignores undated XP", () => {
    const s = summarizeXp(
      [
        { kind: "cf_solve", at: t(15, 10), xp: 10 },
        { kind: "cf_solve", at: t(15, 11), xp: 13 },
        { kind: "streak", at: t(15), xp: 6 },
        { kind: "lc_solve", at: null, xp: 50 },
        { kind: "quest", at: t(14), xp: 30 },
      ],
      t(15, 0),
      t(16, 0),
    );
    expect(s.totalXp).toBe(109);
    expect(s.today).toEqual([{ kind: "cf_solve", xp: 23 }, { kind: "streak", xp: 6 }]);
    expect(s.todayTotal).toBe(29);
  });
});
