import { describe, expect, it } from "vitest";
import type { CfSubmission, LcRecentAc } from "@/data/types";
import { buildShareWeek, shareFileName, weekRangeWords, type ShareWeekInput } from "./shareCard";

const NOW = Math.floor(new Date(2026, 10, 11, 12).getTime() / 1000); // Wednesday 11 Nov 2026
const DAY = 86_400;
const sub = (id: number, key: string, at: number, tags: string[], verdict = "OK"): CfSubmission => ({ id, problemKey: key, contestId: 1, problemIndex: "A", problemName: key, problemRating: 800, tags, verdict, createdAt: at, language: "C++" });
const ac = (slug: string, at: number): LcRecentAc => ({ id: slug, title: slug, slug, timestamp: at });
const user = { handle: "me", rating: 1450, maxRating: 1500, rank: "specialist", maxRank: "specialist", avatar: null, registeredAt: 0 };
const base: ShareWeekInput = { cfUser: null, ratingHistory: [], cfSubmissions: [], lcRecentAc: [], lcProblems: [], manualSolves: [], activity: [], now: NOW };

describe("buildShareWeek", () => {
  it("counts problems first solved this week and names the topic with the most", () => {
    const w = buildShareWeek({
      ...base,
      cfUser: user,
      cfSubmissions: [
        sub(1, "1-A", NOW - DAY, ["graphs"]),
        sub(2, "1-B", NOW - DAY, ["graphs", "dp"]),
        sub(3, "1-C", NOW - DAY, ["dp"], "WRONG_ANSWER"),
        sub(4, "1-D", NOW - DAY, ["math"]),
        sub(5, "1-D", NOW - 20 * DAY, ["math"]), // first solved long ago: not this week
      ],
      lcRecentAc: [ac("climbing-stairs", NOW - 2 * DAY), ac("old", NOW - 9 * DAY)],
      lcProblems: [{ slug: "climbing-stairs", difficulty: "Easy", tags: ["dynamic-programming"] }],
      ratingHistory: [{ contestId: 9, contestName: "R", rank: 1, oldRating: 1400, newRating: 1450, at: NOW - DAY }],
    });
    expect(w.solves).toEqual({ cf: 2, lc: 1, total: 3 });
    // Graphs 2, DP 2 (one Codeforces, one LeetCode): a tie goes to the earlier topic in the list.
    expect(w.topTopic).toEqual({ id: "graphs", solves: 2 });
    expect(w).toMatchObject({ handle: "me", rating: 1450, rank: "specialist", ratingWeek: { delta: 50, rounds: 1 } });
  });

  it("leaves out what it doesn't have: no Codeforces, no solves, no top topic", () => {
    const w = buildShareWeek(base);
    expect(w).toMatchObject({ handle: null, rating: null, rank: null, solves: { total: 0 }, streak: 0, topTopic: null, ratingWeek: { rounds: 0 } });
  });

  it("counts LeetCode manual marks and the streak", () => {
    const day = (n: number) => {
      const d = new Date((NOW - n * DAY) * 1000);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    };
    const w = buildShareWeek({
      ...base,
      manualSolves: [{ platform: "lc", problemId: "two-sum", title: "Two Sum", topicId: "arrays-hashing", solvedAt: NOW - 60 }],
      activity: [0, 1, 2].map((n) => ({ day: day(n), platform: "cf" as const, count: 1 })),
    });
    expect(w.solves.lc).toBe(1);
    expect(w.topTopic).toEqual({ id: "arrays-hashing", solves: 1 });
    expect(w.streak).toBe(3);
  });
});

describe("words", () => {
  it("names the week and the file by its Monday", () => {
    const monday = Math.floor(new Date(2026, 10, 9).getTime() / 1000);
    expect(weekRangeWords(monday)).toBe("9 – 15 Nov 2026");
    expect(weekRangeWords(Math.floor(new Date(2026, 11, 28).getTime() / 1000))).toBe("28 Dec 2026 – 3 Jan 2027");
    expect(weekRangeWords(Math.floor(new Date(2026, 10, 30).getTime() / 1000))).toBe("30 Nov – 6 Dec 2026");
    expect(shareFileName(monday)).toBe("algocompass-week-2026-11-09.png");
  });
});
