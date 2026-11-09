import { describe, expect, it } from "vitest";
import type { CfSubmission, LcRecentAc } from "@/data/types";
import { cleanHandle, personStats, weekSolvesWords } from "./friends";

const NOW = Math.floor(new Date(2026, 10, 11, 12).getTime() / 1000); // Wednesday
const DAY = 86_400;
const sub = (id: number, key: string, at: number, verdict = "OK"): CfSubmission => ({ id, problemKey: key, contestId: 1, problemIndex: "A", problemName: key, problemRating: 800, tags: [], verdict, createdAt: at, language: "C++" });
const ac = (slug: string, at: number): LcRecentAc => ({ id: slug, title: slug, slug, timestamp: at });
const user = { handle: "friend", rating: 1450, maxRating: 1500, rank: "specialist", maxRank: "specialist", avatar: null, registeredAt: 0 };
const profile = { username: "lcfriend", ranking: 1, solved: { easy: 50, medium: 20, hard: 2, all: 72 }, totals: { easy: 1, medium: 1, hard: 1, all: 3 } };

describe("personStats", () => {
  it("counts problems first solved this week, not re-solves, and the LeetCode ones on top", () => {
    const s = personStats({
      cf: { user, submissions: [sub(1, "1-A", NOW - DAY), sub(2, "1-B", NOW - DAY, "WRONG_ANSWER"), sub(3, "1-C", NOW - DAY), sub(4, "1-C", NOW - 20 * DAY)], complete: false },
      lc: { profile, recent: [ac("two-sum", NOW - 2 * DAY), ac("two-sum", NOW - 2 * DAY + 5), ac("old", NOW - 9 * DAY)] },
      activity: [],
      now: NOW,
    });
    expect(s.cf).toMatchObject({ rating: 1450, solvesThisWeek: 1, partial: false });
    expect(s.lc).toMatchObject({ solved: 72, solvesThisWeek: 1, capped: false });
    expect(weekSolvesWords(s)).toEqual({ total: 2, plus: false });
  });

  it("marks a count that may be short: submissions that don't reach Monday, or 20 LeetCode solves all this week", () => {
    const s = personStats({
      cf: { user, submissions: [sub(1, "1-A", NOW - DAY)], complete: false },
      lc: { profile, recent: Array.from({ length: 20 }, (_, i) => ac(`p${i}`, NOW - i * 60)) },
      activity: [],
      now: NOW,
    });
    expect(s.cf!.partial).toBe(true);
    expect(s.lc!.capped).toBe(true);
    expect(weekSolvesWords(s)).toEqual({ total: 21, plus: true });
    expect(personStats({ cf: { user, submissions: [sub(1, "1-A", NOW - DAY)], complete: true }, lc: null, activity: [], now: NOW }).cf!.partial).toBe(false);
  });

  it("counts the streak from activity, like your own", () => {
    const d = (n: number) => {
      const x = new Date(NOW * 1000 - n * DAY * 1000);
      return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, "0")}-${String(x.getDate()).padStart(2, "0")}`;
    };
    const s = personStats({ cf: null, lc: null, activity: [d(1), d(2), d(4)].map((day) => ({ day, platform: "cf" as const, count: 1 })), now: NOW });
    expect(s).toMatchObject({ streak: 2, activeToday: false });
    expect(weekSolvesWords(s)).toBeNull();
  });
});

describe("cleanHandle", () => {
  it("trims, drops an @ and reads a pasted profile link", () => {
    expect(cleanHandle("  tourist ")).toBe("tourist");
    expect(cleanHandle("@tourist")).toBe("tourist");
    expect(cleanHandle("https://codeforces.com/profile/tourist")).toBe("tourist");
    expect(cleanHandle("https://leetcode.com/u/someone/")).toBe("someone");
  });
});
