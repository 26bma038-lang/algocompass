import fs from "node:fs";
import { describe, expect, it } from "vitest";
import type { LcDifficulty } from "@/data/types";
import { buildPool, difficultyRank, mustDo, namedProblem, normTitle, partTopics, topicsNamed, videoTopic, type ProblemPool } from "./mustDo";
import { pathAsSheet, type BeginnerPath } from "./path";
import type { Sheet, SheetProblem } from "./sheets";

const prob = (key: string, difficulty: LcDifficulty | null, topics: string[], extra: Partial<SheetProblem> = {}): SheetProblem => ({
  key,
  title: extra.title ?? key.replace(/^\w+:/, "").replace(/-/g, " "),
  difficulty,
  topics,
  ...(key.startsWith("lc:") ? { lc: key.slice(3) } : key.startsWith("cf:") ? { cf: key.slice(3) } : {}),
  ...extra,
});
const sheet = (id: string, problems: SheetProblem[]): Sheet => ({
  id,
  name: id,
  short: id,
  creator: "x",
  sourceUrl: "https://example.com",
  sectionLabel: "Section",
  fetched: "",
  status: "complete",
  notes: [],
  sections: [{ title: "All", problems }],
});
const keys = (rows: { problem: { key: string } }[]) => rows.map((r) => r.problem.key);
const none = () => false;

describe("difficultyRank", () => {
  it("orders Easy, Medium, Hard, with Codeforces ratings in bands and unknown last", () => {
    expect(difficultyRank({ difficulty: "Easy" })).toBe(1);
    expect(difficultyRank({ difficulty: "Hard" })).toBe(3);
    expect(difficultyRank({ difficulty: null, rating: 800 })).toBeLessThan(2);
    expect(difficultyRank({ difficulty: null, rating: 1400 })).toBeGreaterThan(2);
    expect(difficultyRank({ difficulty: null, rating: 1400 })).toBeLessThan(3);
    expect(difficultyRank({ difficulty: null, rating: 2000 })).toBeGreaterThan(3);
    expect(difficultyRank({ difficulty: null, rating: 800 })).toBeLessThan(difficultyRank({ difficulty: null, rating: 1000 }));
    expect(difficultyRank({ difficulty: null })).toBe(Infinity);
  });
});

describe("buildPool", () => {
  const a = sheet("a", [prob("lc:two-sum", "Easy", ["arrays-hashing"]), prob("gfg:x", null, ["dp"])]);
  const b = sheet("b", [prob("lc:two-sum", "Easy", ["two-pointers", "arrays-hashing"]), prob("tuf:y", "Medium", ["dp"], { difficultyFrom: "sheet" })]);
  const path = sheet("beginner-path", [prob("cf:4-A", null, ["implementation"], { rating: 800, title: "Watermelon" }), prob("lc:two-sum", "Easy", ["arrays-hashing"])]);
  const pool = buildPool([a, b, path], "beginner-path");

  it("merges a problem across sheets: the popular sheets that list it, every topic, the topics sheets file it under", () => {
    const twoSum = pool.problems.find((p) => p.key === "lc:two-sum")!;
    expect(twoSum.sheets).toEqual(["a", "b"]);
    expect(twoSum.inPath).toBe(true);
    expect(twoSum.topics).toEqual(["arrays-hashing", "two-pointers"]);
    expect(twoSum.leadTopics).toEqual(["arrays-hashing", "two-pointers"]);
    expect(pool.sheetCount).toBe(2);
  });

  it("keeps a Beginner Path problem with its Codeforces rating, on no popular sheet", () => {
    const w = pool.problems.find((p) => p.key === "cf:4-A")!;
    expect(w).toMatchObject({ sheets: [], inPath: true, rating: 800 });
  });

  it("indexes only LeetCode and Codeforces problems by title", () => {
    expect(pool.byTitle.get("two sum")?.key).toBe("lc:two-sum");
    expect(pool.byTitle.get("watermelon")?.key).toBe("cf:4-A");
    expect([...pool.byTitle.values()].some((p) => p.key.startsWith("gfg:"))).toBe(false);
  });
});

describe("mustDo", () => {
  // Topic "t": popularity decides what's in; difficulty decides the order shown.
  const a = sheet("a", [
    prob("lc:e1", "Easy", ["t"]),
    prob("lc:e2", "Easy", ["t"]),
    prob("lc:e3", "Easy", ["t"]),
    prob("lc:m1", "Medium", ["t"]),
    prob("lc:m2", "Medium", ["t"]),
    prob("lc:h1", "Hard", ["t"]),
    prob("gfg:u1", null, ["t"]),
    prob("lc:other", "Easy", ["other"]),
  ]);
  const b = sheet("b", [prob("lc:m1", "Medium", ["t"]), prob("lc:h1", "Hard", ["t"]), prob("gfg:u1", null, ["t"]), prob("lc:e3", "Easy", ["t"])]);
  const c = sheet("c", [prob("lc:h1", "Hard", ["t"]), prob("gfg:u1", null, ["t"])]);
  const pool = buildPool([a, b, c], "beginner-path");

  it("ranks by how many sheets list a problem, keeps two Easy ones, and shows them easy to hard with unknown difficulty last", () => {
    // h1 and u1 are on 3 sheets, m1 and e3 on 2. Two Easy (e3 then e1), then the best harder ones.
    expect(keys(mustDo(pool, "t", none))).toEqual(["lc:e3", "lc:e1", "lc:m1", "lc:h1", "gfg:u1"]);
  });

  it("only lists the topic's problems", () => {
    expect(keys(mustDo(pool, "t", none))).not.toContain("lc:other");
    expect(keys(mustDo(pool, "nothing", none))).toEqual([]);
  });

  it("skips solved problems, but keeps ones ticked on this screen", () => {
    const solved = new Set(["lc:e3", "lc:h1"]);
    expect(keys(mustDo(pool, "t", (k) => solved.has(k)))).toEqual(["lc:e1", "lc:e2", "lc:m1", "lc:m2", "gfg:u1"]);
    expect(keys(mustDo(pool, "t", (k) => solved.has(k), { keep: new Set(["lc:h1"]) }))).toContain("lc:h1");
  });

  it("keeps one Easy problem in a short list, and fills with Easy ones when there's nothing harder", () => {
    expect(keys(mustDo(pool, "t", none, { n: 3 }))).toEqual(["lc:e3", "lc:h1", "gfg:u1"]);
    const easyOnly = buildPool([sheet("a", [prob("lc:a", "Easy", ["t"]), prob("lc:b", "Easy", ["t"]), prob("lc:c", "Easy", ["t"])])], "p");
    expect(keys(mustDo(easyOnly, "t", none))).toEqual(["lc:a", "lc:b", "lc:c"]);
  });

  it("puts the problem the video solves first, solved or not, and leaves out excluded ones", () => {
    const named = pool.problems.find((p) => p.key === "lc:m2")!;
    const rows = mustDo(pool, "t", (k) => k === "lc:m2", { named });
    expect(rows[0]).toMatchObject({ problem: { key: "lc:m2" }, reason: "video" });
    expect(rows).toHaveLength(5);
    expect(keys(rows).filter((k) => k === "lc:m2")).toHaveLength(1);
    expect(keys(mustDo(pool, "t", none, { exclude: new Set(["lc:e3", "lc:e1"]) })).slice(0, 2)).toEqual(["lc:e2", "lc:m1"]);
  });

  it("says why: on popular sheets, or only in the Beginner Path", () => {
    const withPath = buildPool([a, sheet("beginner-path", [prob("cf:1-A", null, ["t"], { rating: 900 })])], "beginner-path");
    const rows = mustDo(withPath, "t", none, { n: 8 });
    expect(rows.find((r) => r.problem.key === "cf:1-A")?.reason).toBe("path");
    expect(rows.find((r) => r.problem.key === "lc:e1")?.reason).toBe("sheets");
  });

  it("prefers the topic's own easy problems to a harder one that a single section files there", () => {
    const p = buildPool(
      [
        sheet("a", [prob("lc:own1", "Easy", ["t"]), prob("lc:own2", "Easy", ["t"]), prob("lc:own3", "Easy", ["t"]), prob("lc:visitor", "Medium", ["t", "u"])]),
        sheet("b", [prob("lc:visitor", "Medium", ["u", "t"])]),
        sheet("c", [prob("lc:visitor", "Medium", ["u"])]),
      ],
      "x",
    );
    expect(keys(mustDo(p, "t", none, { n: 3 }))).toEqual(["lc:own1", "lc:own2", "lc:own3"]);
    // With room to spare, the visitor joins.
    expect(keys(mustDo(p, "t", none))).toEqual(["lc:own1", "lc:own2", "lc:own3", "lc:visitor"]);
  });

  it("drops LeetCode Premium problems below free ones on as many sheets", () => {
    const p = buildPool([sheet("a", [prob("lc:paid", "Easy", ["t"], { premium: true }), prob("lc:free", "Easy", ["t"])])], "x");
    expect(keys(mustDo(p, "t", none, { n: 1 }))).toEqual(["lc:free"]);
  });
});

// ---------- against the real data ----------

const load = (id: string) => JSON.parse(fs.readFileSync(`src/data/sheets/${id}.json`, "utf8")) as Sheet;
const realPath = JSON.parse(fs.readFileSync("src/data/path/beginner-path.json", "utf8")) as BeginnerPath;
const real: ProblemPool = buildPool(
  [...["striver-a2z", "striver-sde", "neetcode-150", "blind-75", "babbar-450"].map(load), pathAsSheet(realPath)],
  "beginner-path",
);
const named = (title: string) => namedProblem(title, real)?.key ?? null;

describe("namedProblem (real titles)", () => {
  it.each([
    ["Two Sum - Leetcode 1 - HashMap - Python", "lc:two-sum"],
    ["Sliding Window: Best Time to Buy and Sell Stock - Leetcode 121 - Python", "lc:best-time-to-buy-and-sell-stock"],
    ["BS-12. Koko Eating Bananas", "lc:koko-eating-bananas"],
    ["Lecture 80: Longest Common Prefix Problem || Tries || C++ Placement Series", "lc:longest-common-prefix"],
    ["G-31. Word Ladder - 2 | Optimised Approach for Leetcode", "lc:word-ladder-ii"],
    ["DP 53. Palindrome Partitioning - II | Front Partition 🔥", "lc:palindrome-partitioning-ii"],
    ["L4. Jump Game - I | Greedy Algorithm Playlist", "lc:jump-game"],
    ["Majority Element I | Brute-Better-Optimal | Moore's Voting Algorithm", "lc:majority-element"],
    ["Maximum Depth of Binary Tree - 3 Solutions - Leetcode 104 - Python", "lc:maximum-depth-of-binary-tree"],
    ["NUMBER OF ISLANDS - Leetcode 200 - Python", "lc:number-of-islands"],
    ["8 K Closest Points To Origin", "lc:k-closest-points-to-origin"],
    // The first part is the problem; the technique behind it isn't.
    ["DP 44. Largest Divisible Subset | Longest Increasing Subsequence", "lc:largest-divisible-subset"],
  ])("%s names %s", (title, key) => {
    expect(named(title)).toBe(key);
  });

  it.each([
    // A topic in a later part isn't the problem.
    "Lecture 44: EKO SPOJ Problem || Binary Search || DSA Series by Babbar",
    "Peak Index in Mountain Array | Binary Search | Leetcode 852",
    "BS-1. Binary Search Introduction | Real Life Example | Iterative and Recursive | Explained",
    // Variants and a channel's own numbering aren't the platform problem.
    "15  Coin change problem: Maximum number of ways",
    "Coin Change - Combinations - 1 Medium | Module : Recursion | In English | CPP | Video_24",
    "Permutations - 2 Medium | Module : Recursion | In English | Java | Video_2",
    "Permutations - Words - 2 Easy | Module : Recursion | In English | CPP | Video_15",
    // The title says Codeforces; LeetCode's Permutations isn't it.
    "Permutations || Codeforces",
    "Introduction to Graphs | Types of Graphs",
  ])("%s names nothing", (title) => {
    expect(named(title)).toBeNull();
  });

  it("normalizes titles to letters and digits", () => {
    expect(normTitle("Pow(x, n)")).toBe("pow x n");
    expect(normTitle("Pascal's Triangle")).toBe("pascals triangle");
  });
});

describe("the topic a video is about", () => {
  it("reads topics a title names, the specific ones first", () => {
    expect(topicsNamed("L45. Binary Search Tree | Introduction")[0]).toBe("trees");
    expect(topicsNamed("G-22. Kahn's Algorithm | Topological Sort Algorithm | BFS")[0]).toBe("graphs");
    expect(topicsNamed("Dijkstra's Algorithm - Using Priority Queue")[0]).toBe("shortest-paths");
    expect(topicsNamed("BS-1. Binary Search Introduction")).toEqual(["binary-search"]);
    expect(topicsNamed("Don't watch my A2Z DSA Course")).toEqual([]);
  });

  it("uses the one topic a video is filed under, else the title, the problem, the part before, the playlist's first topic", () => {
    expect(videoTopic("Anything", ["dp"])).toBe("dp");
    expect(videoTopic("G-35. Dijkstra's Algorithm", ["graphs", "shortest-paths", "dsu"])).toBe("shortest-paths");
    expect(videoTopic("BS-12. Koko Eating Bananas", [], namedProblem("BS-12. Koko Eating Bananas", real))).toBe("binary-search");
    expect(videoTopic("G-9. Flood Fill Algorithm | C++ | Java", [], null, "graphs")).toBe("graphs");
    expect(videoTopic("Course intro", ["graphs", "dsu"])).toBe("graphs");
    expect(videoTopic("Course intro", [])).toBeNull();
  });

  it("carries a course's topic forward over parts that name none", () => {
    const titles = ["Don't watch my course", "G-1. Introduction to Graph", "G-9. Flood Fill Algorithm", "DP 1. Introduction to Dynamic Programming"];
    expect(partTopics(titles, [], real)).toEqual([null, "graphs", "graphs", "dp"]);
  });
});

describe("real must-do lists", () => {
  it("binary search starts easy and every problem is on topic", () => {
    const rows = mustDo(real, "binary-search", none);
    expect(rows).toHaveLength(5);
    expect(rows[0]!.problem.difficulty).toBe("Easy");
    for (const r of rows) expect(r.problem.topics).toContain("binary-search");
    // The list never goes back down in difficulty.
    const ranks = rows.map((r) => difficultyRank(r.problem));
    expect([...ranks].sort((x, y) => x - y)).toEqual(ranks);
  });

  it("lists a topic's own problems before ones a single section files there", () => {
    // A2Z files Reverse Linked List under "Logic Building" once; it's a linked-list problem.
    const rl = real.problems.find((p) => p.key === "lc:reverse-linked-list")!;
    expect(rl.leadTopics[0]).toBe("linked-lists");
    expect(keys(mustDo(real, "implementation", none))).not.toContain("lc:reverse-linked-list");
    for (const r of mustDo(real, "implementation", none)) expect(r.problem.leadTopics[0]).toBe("implementation");
  });

  it("Two Sum is on four of the five popular sheets", () => {
    const twoSum = real.problems.find((p) => p.key === "lc:two-sum")!;
    expect(twoSum.sheets.length).toBeGreaterThanOrEqual(3);
    expect(real.sheetCount).toBe(5);
  });
});
