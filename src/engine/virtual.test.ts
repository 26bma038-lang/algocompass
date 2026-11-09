import { describe, expect, it } from "vitest";
import type { CfProblem, CfSubmission } from "@/data/types";
import { clock, divisionOf, isRunning, minutesWords, virtualCandidates, virtualResult, type VirtualRow } from "./virtual";

const prob = (contestId: number, index: string, tags: string[] = []): CfProblem => ({ key: `${contestId}-${index}`, contestId, index, name: `P${index}`, rating: 1000, tags, solvedCount: null });
const four = (id: number) => ["A", "B", "C", "D"].map((i) => prob(id, i));

describe("divisionOf", () => {
  it("reads Div. 2 (Educational too), 3 and 4, and nothing else", () => {
    expect(divisionOf("Codeforces Round 937 (Div. 4)")).toBe("div4");
    expect(divisionOf("Educational Codeforces Round 160 (Rated for Div. 2)")).toBe("div2");
    expect(divisionOf("Codeforces Round 900 (Div. 3)")).toBe("div3");
    expect(divisionOf("Codeforces Round 901 (Div. 1 + Div. 2)")).toBeNull();
    expect(divisionOf("Codeforces Round 902 (Div. 1)")).toBeNull();
  });
});

describe("virtualCandidates", () => {
  const rounds = [
    { contestId: 1, name: "Codeforces Round 1 (Div. 3)", startTime: 100, durationSeconds: 7200 },
    { contestId: 2, name: "Codeforces Round 2 (Div. 3)", startTime: 200, durationSeconds: 7200 },
    { contestId: 3, name: "Codeforces Round 3 (Div. 2)", startTime: 300, durationSeconds: 7200 },
    { contestId: 4, name: "Codeforces Round 4 (Div. 3)", startTime: 400, durationSeconds: 7200 },
    { contestId: 5, name: "Codeforces Round 5 (Div. 3)", startTime: 1_000_000, durationSeconds: 7200 },
  ];
  it("keeps finished, untouched rounds of the division with a whole problem list, newest first", () => {
    const list = virtualCandidates({
      rounds,
      problems: [...four(1), ...four(2), ...four(3), prob(4, "A"), ...four(5)],
      attempted: new Set([2]),
      division: "div3",
      now: 50_000,
    });
    // 2 attempted, 3 another division, 4 only one problem known, 5 not over yet.
    expect(list.map((c) => c.contestId)).toEqual([1]);
    expect(list[0]!.problems.map((p) => p.index)).toEqual(["A", "B", "C", "D"]);
  });
});

describe("virtualResult", () => {
  const v: VirtualRow = {
    id: 1, contestId: 9, name: "Round 9", startedAt: 10_000, durationSeconds: 7200, endedAt: null,
    problems: [
      { index: "B", name: "PB", rating: 1100, tags: ["greedy"] },
      { index: "A", name: "PA", rating: 800, tags: ["math"] },
      { index: "C", name: "PC", rating: 1400, tags: ["dp", "greedy"] },
    ],
  };
  const sub = (id: number, index: string, at: number, verdict: string, contestId = 9): CfSubmission => ({ id, problemKey: `${contestId}-${index}`, contestId, problemIndex: index, problemName: index, problemRating: null, tags: [], verdict, createdAt: at, language: "C++" });

  it("times each solve from the start and since the one before, counts wrong tries, and lists missed topics", () => {
    const r = virtualResult(v, [
      sub(1, "A", 10_000 + 300, "OK"),
      sub(2, "B", 10_000 + 900, "WRONG_ANSWER"),
      sub(3, "B", 10_000 + 1000, "COMPILATION_ERROR"),
      sub(4, "B", 10_000 + 1500, "OK"),
      sub(5, "C", 10_000 + 2000, "TIME_LIMIT_EXCEEDED"),
      sub(6, "C", 10_000 + 9000, "OK"), // after the end
      sub(7, "A", 9_000, "OK"), // before the start
      sub(8, "C", 10_500, "OK", 10), // another contest
    ]);
    expect(r.problems.map((p) => [p.index, p.elapsed, p.took, p.wrongTries])).toEqual([
      ["A", 300, 300, 0],
      ["B", 1500, 1200, 1],
      ["C", null, null, 1],
    ]);
    expect(r.solved).toBe(2);
    expect(r.missedTopics.map((t) => t.id).sort()).toEqual(["dp", "greedy"]);
  });

  it("stops counting when you end it early", () => {
    const ended = { ...v, endedAt: 10_000 + 1000 };
    expect(virtualResult(ended, [sub(1, "A", 10_000 + 1200, "OK")]).solved).toBe(0);
    expect(isRunning(ended, 10_000 + 999)).toBe(true);
    expect(isRunning(ended, 10_000 + 1000)).toBe(false);
  });
});

describe("words", () => {
  it("formats clocks and minutes", () => {
    expect(clock(3909)).toBe("1:05:09");
    expect(clock(724)).toBe("12:04");
    expect(clock(-5)).toBe("0:00");
    expect(minutesWords(840)).toBe("14 min");
    expect(minutesWords(3900)).toBe("1 h 5 min");
  });
});
