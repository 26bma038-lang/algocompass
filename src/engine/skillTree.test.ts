import { describe, expect, it } from "vitest";
import type { CfSubmission } from "@/data/types";
import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import { buildSkillTree, isPromotion, lineageEdges, matchesFilter, matchesSearch, searchRank, statusSnapshot } from "./skillTree";
import type { Standing } from "./standing";
import { computeTopicStrengths, type TopicStrength } from "./strength";
import { topicProblems, verdictLabel } from "./topicProblems";
import { PREREQUISITES, TOPICS } from "./topics";

const NOW = 2_000_000_000;
let nextId = 1;
const sub = (key: string, tags: string[], verdict: string | null, at: number, rating: number | null = 900): CfSubmission => ({
  id: nextId++,
  problemKey: key,
  contestId: Number(key.split("-")[0]),
  problemIndex: key.split("-")[1]!,
  problemName: `Problem ${key}`,
  problemRating: rating,
  tags,
  verdict,
  createdAt: at,
  language: "C++",
});

const strengths = (subs: CfSubmission[] = []) =>
  computeTopicStrengths({ now: NOW, cfRating: 1000, cfSubmissions: subs, lcSolved: null, lcTagCounts: [], lcProblems: [], lcRecentAc: [] });

const noStanding: Standing = { strengths: [], weaknesses: [], blindSpots: [] };
const item = (t: TopicStrength) => ({ topicId: t.topicId, name: t.name, score: t.score, status: t.status, reason: "" });

describe("buildSkillTree", () => {
  it("has a node per topic and an edge per prerequisite", () => {
    const { nodes, edges } = buildSkillTree(strengths(), noStanding, null);
    expect(nodes).toHaveLength(TOPICS.length);
    const prereqCount = Object.values(PREREQUISITES).reduce((n, ps) => n + ps.length, 0);
    expect(edges).toHaveLength(prereqCount);
  });

  it("lights an edge once the parent reaches Developing", () => {
    const subs = Array.from({ length: 6 }, (_, i) => sub(`${i + 1}-A`, ["implementation"], "OK", NOW - 86_400, 1000));
    const { edges } = buildSkillTree(strengths(subs), noStanding, null);
    expect(edges.find((e) => e.id === "implementation->strings")?.lit).toBe(true);
    expect(edges.find((e) => e.id === "math->number-theory")?.lit).toBe(false);
  });

  it("flags work-on-next, blind spots and status changes since the last look", () => {
    const topics = strengths();
    const graphs = topics.find((t) => t.topicId === "graphs")!;
    const greedy = topics.find((t) => t.topicId === "greedy")!;
    const standing: Standing = { strengths: [], weaknesses: [item(greedy)], blindSpots: [item(graphs)] };
    const prev = { ...statusSnapshot(topics), implementation: "Locked" as const };
    const { nodes } = buildSkillTree(topics, standing, prev);
    const by = (id: string) => nodes.find((n) => n.id === id)!;
    expect(by("greedy").workOnNext).toBe(true);
    expect(by("graphs").blindSpot).toBe(true);
    expect(by("implementation").changedFrom).toBe("Locked");
    expect(by("math").changedFrom).toBeNull();
    // First look ever: nothing animates.
    expect(buildSkillTree(topics, standing, null).nodes.every((n) => n.changedFrom === null)).toBe(true);
  });
});

describe("filters and search", () => {
  const node = (status: TopicStrength["status"], blindSpot = false) => ({ id: "x", name: "X", score: 0, status, workOnNext: false, blindSpot, changedFrom: null });
  it("filters by status group", () => {
    expect(matchesFilter(node("Locked"), "unlocked")).toBe(false);
    expect(matchesFilter(node("Untouched"), "unlocked")).toBe(true);
    expect(matchesFilter(node("Developing"), "weak")).toBe(true);
    expect(matchesFilter(node("Strong"), "weak")).toBe(false);
    expect(matchesFilter(node("Untouched", true), "blind")).toBe(true);
  });
  it("finds topics by name or platform tag", () => {
    expect(matchesSearch({ id: "graphs", name: "Graph traversal" }, "graph")).toBe(true);
    expect(matchesSearch({ id: "graphs", name: "Graph traversal" }, "dfs")).toBe(true);
    expect(matchesSearch({ id: "two-pointers", name: "Two pointers & sliding window" }, "sliding-window")).toBe(true);
    expect(matchesSearch({ id: "math", name: "Math" }, "dfs")).toBe(false);
  });
  it("knows a promotion from a slip", () => {
    expect(isPromotion("Locked", "Untouched")).toBe(true);
    expect(isPromotion("Strong", "Developing")).toBe(false);
  });
});

describe("strength breakdown", () => {
  it("splits evidence into CF and LC parts that add up", () => {
    const topics = computeTopicStrengths({
      now: NOW,
      cfRating: 1000,
      cfSubmissions: [sub("1-A", ["strings"], "OK", NOW)],
      lcSolved: { easy: 1, medium: 0, hard: 0, all: 1 },
      lcTagCounts: [],
      lcProblems: [{ slug: "valid-anagram", difficulty: "Easy", tags: ["string"] }],
      lcRecentAc: [{ id: "1", title: "Valid Anagram", slug: "valid-anagram", timestamp: NOW }],
    });
    const s = topics.find((t) => t.topicId === "strings")!;
    expect(s.cfEvidence).toBeGreaterThan(0);
    expect(s.lcEvidence).toBeGreaterThan(0);
    expect(s.cfEvidence + s.lcEvidence).toBeCloseTo(s.evidence, 1);
  });
});

describe("topicProblems", () => {
  it("lists solved problems (with tries before AC) and open attempts", () => {
    const subs = [
      sub("10-A", ["math"], "WRONG_ANSWER", NOW - 300),
      sub("10-A", ["math"], "COMPILATION_ERROR", NOW - 250),
      sub("10-A", ["math"], "OK", NOW - 200),
      sub("11-B", ["math", "greedy"], "TIME_LIMIT_EXCEEDED", NOW - 100),
      sub("11-B", ["math", "greedy"], "WRONG_ANSWER", NOW - 50),
      sub("12-C", ["math"], "COMPILATION_ERROR", NOW - 10),
      sub("13-D", ["strings"], "OK", NOW),
    ];
    const res = topicProblems("math", {
      cfSubmissions: subs,
      lcRecentAc: [
        { id: "1", title: "Add Digits", slug: "add-digits", timestamp: NOW - 5 },
        { id: "2", title: "Two Sum", slug: "two-sum", timestamp: NOW - 4 },
      ],
      lcProblems: [
        { slug: "add-digits", difficulty: "Easy", tags: ["math"] },
        { slug: "two-sum", difficulty: "Easy", tags: ["array"] },
      ],
    });
    expect(res.cfSolved.map((p) => [p.key, p.triesBeforeAc])).toEqual([["10-A", 1]]);
    expect(res.cfAttempted).toMatchObject([{ key: "11-B", attempts: 2, lastVerdict: "WRONG_ANSWER" }]);
    expect(res.lcSolved.map((p) => p.slug)).toEqual(["add-digits"]);
  });

  it("builds problem links and readable verdicts", () => {
    expect(cfProblemUrl(2000, "B1")).toBe("https://codeforces.com/contest/2000/problem/B1");
    expect(cfProblemUrl(104000, "A")).toBe("https://codeforces.com/gym/104000/problem/A");
    expect(cfProblemUrl(null, "A")).toBeNull();
    expect(lcProblemUrl("two-sum")).toBe("https://leetcode.com/problems/two-sum/");
    expect(verdictLabel("WRONG_ANSWER")).toBe("Wrong answer");
    expect(verdictLabel("PARTIAL")).toBe("Partial");
  });
});

describe("lineage and search ranking", () => {
  it("collects every edge above and below a topic", () => {
    const { edges } = buildSkillTree(strengths(), noStanding, null);
    const lin = lineageEdges("greedy", edges);
    expect(lin.has("sorting->greedy")).toBe(true);
    expect(lin.has("arrays-hashing->sorting")).toBe(true); // grand-prerequisite
    expect(lin.has("greedy->constructive")).toBe(true);
    expect(lin.has("math->number-theory")).toBe(false);
  });
  it("ranks name hits above tag hits", () => {
    expect(searchRank({ id: "graphs", name: "Graph traversal" }, "graph")).toBe(3);
    expect(searchRank({ id: "advanced-graphs", name: "Flows, matchings & advanced graphs" }, "graph")).toBe(3);
    expect(searchRank({ id: "dp", name: "Dynamic programming" }, "gram")).toBe(2);
    expect(searchRank({ id: "graphs", name: "Graph traversal" }, "dfs")).toBe(1);
    expect(searchRank({ id: "math", name: "Math" }, "dfs")).toBe(0);
  });
});
