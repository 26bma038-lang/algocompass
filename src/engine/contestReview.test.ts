import { describe, expect, it } from "vitest";
import type { ContestResult } from "@/data/types";
import { buildContestReviews } from "./contestReview";

const result = (over: Partial<ContestResult> = {}): ContestResult => ({
  contestId: "cf:1950",
  name: "Codeforces Round 937 (Div. 4)",
  startTime: 1000,
  durationSeconds: 7200,
  participated: true,
  rank: null,
  solved: 2,
  total: 5,
  problems: [
    { index: "C", name: "Clock", rating: 1200, solved: false },
    { index: "A", name: "Stair", rating: 800, solved: true },
    { index: "B", name: "Upscaling", rating: 800, solved: true },
    { index: "D", name: "Product", rating: 1400, solved: false },
    { index: "E", name: "Nearly", rating: 1600, solved: false },
  ],
  syncedAt: 1,
  ...over,
});

const tags = new Map<string, string[]>([
  ["1950-C", ["implementation", "math"]],
  ["1950-D", ["dp", "math"]],
  ["1950-E", ["greedy"]],
]);

describe("buildContestReviews", () => {
  it("lists problems by index, the rating change, and the topics of the unsolved ones from real tags", () => {
    const [r] = buildContestReviews({
      results: [result()],
      ratingHistory: [{ contestId: 1950, contestName: "Round 937", rank: 4021, oldRating: 1100, newRating: 1162, at: 9000 }],
      tags,
      solvedKeys: new Set(),
    });
    expect(r!.problems.map((p) => `${p.index}${p.solved ? "+" : "-"}`)).toEqual(["A+", "B+", "C-", "D-", "E-"]);
    expect(r!).toMatchObject({ delta: 62, newRating: 1162, rank: 4021, solvedCount: 2, name: "Round 937" });
    const math = r!.missedTopics.find((t) => t.id === "math");
    expect(math?.count).toBe(2);
    expect(r!.missedTopics[0]!.id).toBe("math");
  });

  it("fix next = the unsolved ones among the first solved + 2, minus those solved since", () => {
    const [r] = buildContestReviews({ results: [result()], ratingHistory: [], tags, solvedKeys: new Set(["cf:1950-C"]) });
    expect(r!.fixNext.map((p) => p.key)).toEqual(["cf:1950-D"]);
    expect(r!.problems.find((p) => p.index === "C")!.fixedLater).toBe(true);
    expect(r!.delta).toBeNull();
  });

  it("skips rounds you didn't take part in, newest first", () => {
    const list = buildContestReviews({
      results: [result({ contestId: "cf:1", participated: false }), result({ contestId: "cf:2", startTime: 5 }), result({ contestId: "cf:3", startTime: 50 })],
      ratingHistory: [],
      tags,
      solvedKeys: new Set(),
    });
    expect(list.map((r) => r.id)).toEqual(["cf:3", "cf:2"]);
  });

  it("adds no topic for a problem with no known tags", () => {
    const [r] = buildContestReviews({ results: [result()], ratingHistory: [], tags: new Map(), solvedKeys: new Set() });
    expect(r!.missedTopics).toEqual([]);
  });
});
