import { describe, expect, it } from "vitest";
import type { CfProblem, CfSubmission } from "@/data/types";
import { bandFrequency, whereIStand } from "./standing";
import {
  cfDifficultyWeight,
  computeTopicStrengths,
  decay,
  HALF_LIFE_DAYS,
  scoreFromEvidence,
  type StrengthInput,
} from "./strength";

const DAY = 86_400;
const NOW = 2_000_000_000;

let nextId = 1;
const ac = (tags: string[], rating: number | null, daysAgo = 0, verdict = "OK", key?: string): CfSubmission => {
  const id = nextId++;
  return {
    id,
    problemKey: key ?? `p${id}`,
    contestId: 1,
    problemIndex: "A",
    problemName: "P",
    problemRating: rating,
    tags,
    verdict,
    createdAt: NOW - daysAgo * DAY,
    language: "C++",
  };
};

const base = (over: Partial<StrengthInput> = {}): StrengthInput => ({
  now: NOW,
  cfRating: 1000,
  cfSubmissions: [],
  lcSolved: null,
  lcTagCounts: [],
  lcProblems: [],
  lcRecentAc: [],
  ...over,
});

const topic = (res: ReturnType<typeof computeTopicStrengths>, id: string) => res.find((t) => t.topicId === id)!;

describe("weights", () => {
  it("halves a solve's weight every 90 days", () => {
    expect(decay(0)).toBe(1);
    expect(decay(HALF_LIFE_DAYS * DAY)).toBeCloseTo(0.5);
    expect(decay(2 * HALF_LIFE_DAYS * DAY)).toBeCloseTo(0.25);
  });

  it("weights CF problems by rating relative to yours", () => {
    expect(cfDifficultyWeight(1000, 1000)).toBe(1);
    expect(cfDifficultyWeight(1300, 1000)).toBeCloseTo(2);
    expect(cfDifficultyWeight(700, 1000)).toBeCloseTo(0.5);
    expect(cfDifficultyWeight(3500, 1000)).toBe(4); // capped
    expect(cfDifficultyWeight(null, 1000)).toBeLessThan(1); // unrated ≈ slightly below you
  });

  it("maps evidence to a 0–100 score with a struggle penalty", () => {
    expect(scoreFromEvidence(0, null, 0)).toBe(0);
    expect(scoreFromEvidence(6, null, 0)).toBe(63);
    expect(scoreFromEvidence(1000, null, 0)).toBe(100);
    expect(scoreFromEvidence(6, 1, 10)).toBe(Math.round(63.21 * 0.7));
    expect(scoreFromEvidence(6, 1, 5)).toBeGreaterThan(scoreFromEvidence(6, 1, 10)); // less evidence, smaller penalty
  });
});

describe("computeTopicStrengths", () => {
  it("counts each CF problem once even with repeat ACs, and credits all its topics", () => {
    const res = computeTopicStrengths(
      base({ cfSubmissions: [ac(["dp", "greedy"], 1000, 1, "OK", "x"), ac(["dp", "greedy"], 1000, 0, "OK", "x")] }),
    );
    expect(topic(res, "dp").cfSolved).toBe(1);
    expect(topic(res, "greedy").cfSolved).toBe(1);
    expect(topic(res, "dp").lastPracticedAt).toBe(NOW - DAY); // first AC is the solve time
  });

  it("scores harder and more recent solves higher", () => {
    const hard = computeTopicStrengths(base({ cfSubmissions: [ac(["dp"], 1300)] }));
    const easy = computeTopicStrengths(base({ cfSubmissions: [ac(["dp"], 700)] }));
    const old = computeTopicStrengths(base({ cfSubmissions: [ac(["dp"], 1300, 180)] }));
    expect(topic(hard, "dp").score).toBeGreaterThan(topic(easy, "dp").score);
    expect(topic(hard, "dp").score).toBeGreaterThan(topic(old, "dp").score);
    expect(topic(old, "dp").evidence).toBeCloseTo(0.5, 1); // 2 × 0.25
  });

  it("tracks struggle rate from judged submissions, ignoring compile errors", () => {
    const res = computeTopicStrengths(
      base({
        cfSubmissions: [
          ac(["math"], 1000, 0, "WRONG_ANSWER", "m"),
          ac(["math"], 1000, 0, "TIME_LIMIT_EXCEEDED", "m"),
          ac(["math"], 1000, 0, "COMPILATION_ERROR", "m"),
          ac(["math"], 1000, 0, "OK", "m"),
        ],
      }),
    );
    expect(topic(res, "math").struggleRate).toBeCloseTo(2 / 3, 2);
    expect(topic(res, "math").cfJudged).toBe(3);
  });

  it("weights LC solves Easy 1 / Medium 2.5 / Hard 5 at half CF value", () => {
    const res = computeTopicStrengths(
      base({
        lcSolved: { easy: 1, medium: 1, hard: 1, all: 3 },
        lcProblems: [
          { slug: "e", difficulty: "Easy", tags: ["trie"] },
          { slug: "m", difficulty: "Medium", tags: ["heap-priority-queue"] },
          { slug: "h", difficulty: "Hard", tags: ["linked-list"] },
        ],
        lcRecentAc: [
          { id: "1", title: "", slug: "e", timestamp: NOW },
          { id: "2", title: "", slug: "m", timestamp: NOW },
          { id: "3", title: "", slug: "h", timestamp: NOW },
        ],
        lcTagCounts: [
          { slug: "trie", name: "Trie", level: "advanced", solved: 1 },
          { slug: "heap-priority-queue", name: "Heap", level: "intermediate", solved: 1 },
          { slug: "linked-list", name: "Linked List", level: "fundamental", solved: 1 },
        ],
      }),
    );
    expect(topic(res, "tries").evidence).toBeCloseTo(0.5);
    expect(topic(res, "heaps").evidence).toBeCloseTo(1.25);
    expect(topic(res, "linked-lists").evidence).toBeCloseTo(2.5);
    // Known problems are not double counted through tag counts.
    expect(topic(res, "tries").lcSolved).toBe(1);
  });

  it("credits undated LC tag counts once per topic using the remaining difficulty mix", () => {
    const res = computeTopicStrengths(
      base({
        lcSolved: { easy: 4, medium: 0, hard: 0, all: 4 },
        lcTagCounts: [
          { slug: "array", name: "Array", level: "fundamental", solved: 4 },
          { slug: "hash-table", name: "Hash Table", level: "intermediate", solved: 3 },
        ],
      }),
    );
    const t = topic(res, "arrays-hashing");
    expect(t.lcSolved).toBe(4); // max of the two tags, not 7
    expect(t.evidence).toBeCloseTo(4 * 1 * decay(180 * DAY) * 0.5, 2);
  });

  it("assigns statuses: Untouched, Locked, Weak, Developing, Strong, Mastered", () => {
    const many = (tags: string[], n: number, rating: number) => Array.from({ length: n }, () => ac(tags, rating));
    const res = computeTopicStrengths(
      base({
        cfRating: 1000,
        cfSubmissions: [
          ...many(["implementation"], 20, 1100), // lots, above rating → Mastered
          ...many(["math"], 6, 1000), // ~63 → Strong
          ...many(["greedy"], 2, 1000), // ~28 → Developing
          ac(["strings"], 800), // tiny → Weak
        ],
      }),
    );
    expect(topic(res, "implementation").status).toBe("Mastered");
    expect(topic(res, "math").status).toBe("Strong");
    expect(topic(res, "greedy").status).toBe("Developing");
    expect(topic(res, "strings").status).toBe("Weak");
    expect(topic(res, "brute-force").status).toBe("Untouched"); // prereq implementation is strong
    expect(topic(res, "dp").status).toBe("Locked"); // prereqs untouched
  });

  it("holds back Mastered without depth at your rating", () => {
    const res = computeTopicStrengths(
      base({ cfRating: 1500, cfSubmissions: Array.from({ length: 40 }, () => ac(["math"], 1400)) }),
    );
    expect(topic(res, "math").score).toBeGreaterThanOrEqual(75);
    expect(topic(res, "math").status).toBe("Strong");
  });

  it("returns every topic, in display order, with no data", () => {
    const res = computeTopicStrengths(base({ cfRating: null }));
    expect(res.every((t) => t.score === 0 && (t.status === "Untouched" || t.status === "Locked"))).toBe(true);
    expect(res[0]!.topicId).toBe("implementation");
  });
});

describe("whereIStand", () => {
  const problems: CfProblem[] = [
    ...Array.from({ length: 6 }, (_, i) => ({ key: `a${i}`, contestId: 1, index: "A", name: "", rating: 1000, tags: ["math"], solvedCount: 1 })),
    ...Array.from({ length: 3 }, (_, i) => ({ key: `b${i}`, contestId: 1, index: "B", name: "", rating: 1100, tags: ["dp"], solvedCount: 1 })),
    { key: "c", contestId: 1, index: "C", name: "", rating: 3000, tags: ["fft"], solvedCount: 1 }, // out of band
  ];

  it("computes topic frequency within your rating band", () => {
    const f = bandFrequency(problems, 1000);
    expect(f.get("math")).toBeCloseTo(6 / 9);
    expect(f.get("dp")).toBeCloseTo(3 / 9);
    expect(f.get("advanced-graphs")).toBe(0);
  });

  it("lists strengths, weaknesses and blind spots", () => {
    const res = computeTopicStrengths(
      base({
        cfSubmissions: [
          ...Array.from({ length: 8 }, () => ac(["implementation"], 1000)),
          ...Array.from({ length: 4 }, () => ac(["greedy"], 1000)),
          ac(["math"], 800),
          ac(["math"], 900, 0, "WRONG_ANSWER"),
        ],
      }),
    );
    const s = whereIStand(res, bandFrequency(problems, 1000));
    expect(s.strengths[0]!.topicId).toBe("implementation");
    expect(s.weaknesses[0]!.topicId).toBe("math"); // weak and most common at your rating
    expect(s.blindSpots.map((b) => b.topicId)).toEqual(["dp"]);
    expect(s.blindSpots[0]!.reason).toContain("33%");
  });
});
