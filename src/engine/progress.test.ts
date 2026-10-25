import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { STATUS_WORDS, plainTopicName } from "@/lib/glossary";
import type { AchievementState } from "./achievements";
import { weekStart } from "./goals";
import { pathState, type BeginnerPath } from "./path";
import { badgesToShow, pathTopics, topicRows, weekDays } from "./progress";
import type { TopicStrength } from "./strength";

const PATH = JSON.parse(fs.readFileSync("src/data/path/beginner-path.json", "utf8")) as BeginnerPath;

const topic = (topicId: string, score: number, solvedCount: number, status: TopicStrength["status"]): TopicStrength => ({
  topicId,
  name: topicId,
  score,
  status,
  evidence: 0,
  cfEvidence: 0,
  lcEvidence: 0,
  solvedCount,
  cfSolved: solvedCount,
  lcSolved: 0,
  maxCfRatingSolved: solvedCount ? 1100 : null,
  lastPracticedAt: null,
  struggleRate: null,
  cfJudged: 0,
});

describe("Progress → Topics, a list first (v1.4)", () => {
  const topics = [topic("implementation", 40, 9, "Developing"), topic("graphs", 0, 0, "Untouched"), topic("greedy", 8, 2, "Weak"), topic("math", 80, 20, "Strong")];

  it("puts the topics you've tried weakest first, then the ones you haven't", () => {
    expect(topicRows(topics, null).map((r) => r.topicId)).toEqual(["greedy", "implementation", "math", "graphs"]);
  });

  it("uses plain names and plain status words", () => {
    const rows = topicRows(topics, null, plainTopicName);
    expect(rows.find((r) => r.topicId === "implementation")!.name).toBe("Coding basics (implementation)");
    expect(STATUS_WORDS[rows[1]!.status]).toBe("Getting there");
    expect(STATUS_WORDS.Untouched).toBe("Not tried yet");
  });

  it("explains each row: Where you stand's reason when there is one, else what's solved", () => {
    const standing = { strengths: [], weaknesses: [{ topicId: "greedy", name: "Greedy", score: 8, status: "Weak" as const, reason: "Appears in 30% of problems at your rating." }], blindSpots: [] };
    const rows = topicRows(topics, standing);
    expect(rows[0]!.why).toBe("Appears in 30% of problems at your rating.");
    expect(rows.find((r) => r.topicId === "math")!.why).toBe("20 solved, up to Codeforces difficulty 1100.");
    expect(rows.find((r) => r.topicId === "graphs")!.why).toBe("Nothing solved here yet.");
  });
});

describe("a beginner's Topics before any update: the path's topics", () => {
  it("lists each path topic once, in step order, done / learning now / started / later", () => {
    const first = PATH.steps[0]!;
    const solved = new Set(first.problems.filter((p) => p.required).map((p) => p.key));
    const st = pathState(PATH, (k) => solved.has(k), new Set([first.videos.en.find((v) => v.role === "main")!.id]), new Map());
    const rows = pathTopics(PATH, st);
    expect(rows.map((r) => r.topicId).slice(0, 3)).toEqual(["implementation", "math", "arrays-hashing"]);
    expect(new Set(rows.map((r) => r.topicId)).size).toBe(rows.length);
    expect(rows.find((r) => r.topicId === "implementation")!.state).toBe("done");
    expect(rows.find((r) => r.topicId === "arrays-hashing")!.state).toBe("current");
    expect(rows.find((r) => r.topicId === "dp")!.state).toBe("later");
  });
});

describe("Your week and Badges", () => {
  it("marks the days of this week that had any practice, Monday first", () => {
    const monday = weekStart(new Date(2026, 9, 21)); // Wed 21 Oct 2026 → Mon 19 Oct
    const at = (day: number, hour: number) => new Date(2026, 9, 19 + day, hour).getTime() / 1000;
    expect(weekDays(monday, [at(0, 9), at(2, 23), at(2, 1), at(7, 1)])).toEqual([true, false, true, false, false, false, false]);
  });

  it("shows the latest earned badges, then the closest to earning to fill three", () => {
    const a = (id: string, unlocked: boolean, at: number | null, value = 0, target = 1): AchievementState => ({ id, unlocked, at, progress: { value, target, label: "" } });
    expect(badgesToShow([a("x", true, 5), a("y", false, null), a("z", true, 9)]).list.map((b) => b.id)).toEqual(["z", "x", "y"]);
    const none = badgesToShow([a("p", false, null, 1, 10), a("q", false, null, 5, 10), a("r", false, null, 0, 3), a("s", false, null, 2, 4)]);
    expect(none.earned).toBe(0);
    expect(none.list.map((b) => b.id)).toEqual(["q", "s", "p"]);
  });
});
