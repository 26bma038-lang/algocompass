import { describe, expect, it } from "vitest";
import type { CfProblem, CfSubmission, RecFeedback } from "@/data/types";
import {
  LEARN_SOLVES_TO_SHARPEN,
  MIX_SIZE,
  OFFSET_LIMITS,
  baseLcLevel,
  createRecommender,
  feedbackOffset,
  roundToStep,
  topicMode,
  whySentence,
  type CuratedLcProblem,
  type RecommenderInput,
} from "./recommender";
import { computeTopicStrengths, type TopicStrength } from "./strength";

const NOW = 2_000_000_000;
const DAY = 86_400;
const RECENT = NOW - 100 * DAY;
const OLD = NOW - 4 * 365 * DAY;

/** Every topic, untouched, then patched per topic. Unpatched topics are "Untouched"/"Locked" at 0. */
function topics(patch: Record<string, Partial<TopicStrength>> = {}): TopicStrength[] {
  const base = computeTopicStrengths({ now: NOW, cfRating: 1008, cfSubmissions: [], lcSolved: null, lcTagCounts: [], lcProblems: [], lcRecentAc: [] });
  return base.map((t) => ({ ...t, ...(t.status === "Locked" && patch[t.topicId] ? { status: "Untouched" as const } : {}), ...patch[t.topicId] }));
}

const practiced = (score: number, daysAgo: number, extra: Partial<TopicStrength> = {}): Partial<TopicStrength> => ({
  score,
  status: score >= 50 ? "Strong" : score >= 25 ? "Developing" : "Weak",
  solvedCount: 3,
  cfSolved: 3,
  lastPracticedAt: NOW - daysAgo * DAY,
  ...extra,
});

let pid = 1;
const problem = (contestId: number, index: string, rating: number | null, tags: string[], solvedCount = 1000): CfProblem => ({
  key: `${contestId}-${index}`,
  contestId,
  index,
  name: `P${pid++}`,
  rating,
  tags,
  solvedCount,
});

let sid = 1;
const sub = (key: string, verdict: string, tags: string[] = ["sortings"], rating: number | null = 1100, at = NOW - DAY): CfSubmission => ({
  id: sid++,
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

const lc = (slug: string, topic: string, difficulty: CuratedLcProblem["difficulty"], order: number, topicsList: string[] = [topic]): CuratedLcProblem => ({
  slug,
  title: slug,
  difficulty,
  topic,
  topics: topicsList,
  list: "neetcode150",
  order,
});

const fb = (problemId: string, topicId: string, kind: RecFeedback["kind"], platform: RecFeedback["platform"] = "cf"): RecFeedback => ({
  platform,
  problemId,
  topicId,
  kind,
  createdAt: NOW,
});

function input(over: Partial<RecommenderInput> = {}): RecommenderInput {
  return {
    now: NOW,
    cfRating: 1008,
    topics: topics(),
    frequency: new Map(),
    cfProblems: [],
    cfSubmissions: [],
    contestTimes: new Map(),
    lcCurated: [],
    lcSolved: new Set(),
    feedback: [],
    ...over,
  };
}

describe("helpers", () => {
  it("rounds ratings to Codeforces' 100-steps", () => {
    expect(roundToStep(1008)).toBe(1000);
    expect(roundToStep(1050)).toBe(1100);
    expect(roundToStep(1149)).toBe(1100);
  });

  it("moves a topic from Learn to Sharpen after enough solves", () => {
    expect(topicMode({ lcSolved: 0, cfSolved: 0 }, true, true)).toBe("learn");
    expect(topicMode({ lcSolved: LEARN_SOLVES_TO_SHARPEN - 1, cfSolved: 0 }, true, true)).toBe("learn");
    expect(topicMode({ lcSolved: LEARN_SOLVES_TO_SHARPEN, cfSolved: 0 }, true, true)).toBe("sharpen");
    // Already practiced on Codeforces: nothing left to learn first.
    expect(topicMode({ lcSolved: 0, cfSolved: LEARN_SOLVES_TO_SHARPEN }, true, true)).toBe("sharpen");
    // No LeetCode path (constructive): straight to Sharpen. No CF tag (linked lists): always Learn.
    expect(topicMode({ lcSolved: 0, cfSolved: 0 }, false, true)).toBe("sharpen");
    expect(topicMode({ lcSolved: 20, cfSolved: 0 }, true, false)).toBe("learn");
  });

  it("starts Easy while Weak and moves up with strength", () => {
    expect(baseLcLevel(0)).toBe(0);
    expect(baseLcLevel(24)).toBe(0);
    expect(baseLcLevel(30)).toBe(1);
    expect(baseLcLevel(60)).toBe(2);
    expect(baseLcLevel(80)).toBe(3);
  });

  it("sums feedback per topic and platform, clamped", () => {
    const f = [fb("1-A", "sorting", "too_easy"), fb("2-A", "sorting", "too_easy"), fb("3-A", "sorting", "too_hard"), fb("x", "sorting", "too_easy", "lc"), fb("4-A", "dp", "too_easy")];
    expect(feedbackOffset(f, "sorting", "cf")).toBe(100);
    expect(feedbackOffset(f, "sorting", "lc")).toBe(100);
    expect(feedbackOffset([], "sorting", "cf")).toBe(0);
    const many = Array.from({ length: 20 }, (_, i) => fb(`${i}-A`, "dp", "too_easy"));
    expect(feedbackOffset(many, "dp", "cf")).toBe(OFFSET_LIMITS.max);
    const hard = Array.from({ length: 20 }, (_, i) => fb(`${i}-A`, "dp", "too_hard"));
    expect(feedbackOffset(hard, "dp", "cf")).toBe(OFFSET_LIMITS.min);
  });

  it("writes a one-sentence why", () => {
    const t = topics({ sorting: practiced(32, 40) }).find((x) => x.topicId === "sorting")!;
    expect(whySentence(t, 0.15, 40)).toBe("Sorting appears in 15% of problems at your rating and you haven't practiced it in 40 days.");
    const fresh = topics().find((x) => x.topicId === "two-pointers")!;
    expect(whySentence(fresh, 0.06, null)).toBe("Two pointers & sliding window appears in 6% of problems at your rating and you haven't solved one yet.");
    const struggling = { ...t, struggleRate: 0.45, cfJudged: 11 };
    expect(whySentence(struggling, 0.1, 3)).toContain("45% of your Codeforces submissions there aren't accepted");
    expect(whySentence(t, 0.1, 3)).toBe("Sorting appears in 10% of problems at your rating and it's only at 32/100.");
    expect(whySentence({ ...t, score: 60 }, 0.1, 3)).toBe("Sorting appears in 10% of problems at your rating and it isn't Mastered yet (60/100).");
  });
});

describe("Next Topic", () => {
  const freq = new Map([
    ["sorting", 0.15],
    ["greedy", 0.15],
    ["constructive", 0.21],
    ["math", 0.4],
    ["graphs", 0.3],
    ["dp", 0.2],
  ]);

  it("prefers a weak topic over a merely common one", () => {
    const r = createRecommender(
      input({
        frequency: new Map([
          ["greedy", 0.42],
          ["sorting", 0.15],
        ]),
        topics: topics({ greedy: practiced(55, 11), sorting: practiced(32, 51) }),
      }),
    );
    expect(r.nextTopic?.topicId).toBe("sorting");
  });

  it("is the weakest unlocked topic, weighted by frequency and staleness", () => {
    const r = createRecommender(
      input({
        frequency: freq,
        topics: topics({
          sorting: practiced(32, 40),
          greedy: practiced(32, 2), // same score and share, practiced recently
          constructive: practiced(37, 10),
          math: practiced(80, 1, { status: "Mastered" }), // mastered: never next
          dp: practiced(22, 5),
        }),
      }),
    );
    // graphs is Locked (no solves, prerequisites weak) and never a candidate.
    expect(r.ranked.map((p) => p.topicId)).not.toContain("graphs");
    expect(r.ranked.map((p) => p.topicId)).not.toContain("math");
    const sorting = r.plans.get("sorting")!;
    const greedy = r.plans.get("greedy")!;
    expect(sorting.priority).toBeGreaterThan(greedy.priority);
    expect(r.nextTopic?.topicId).toBe(r.ranked[0]?.topicId);
    expect(r.nextTopic?.why).toMatch(/appears in \d+% of problems at your rating/);
  });

  it("skips topics that never show up at your rating", () => {
    const r = createRecommender(input({ frequency: new Map([["sorting", 0.1]]), topics: topics({ sorting: practiced(30, 5), heaps: practiced(5, 50) }) }));
    expect(r.ranked.map((p) => p.topicId)).toEqual(["sorting"]);
  });

  it("is null before any data", () => {
    expect(createRecommender(input()).nextTopic).toBeNull();
  });
});

describe("Sharpen (Codeforces)", () => {
  const sortTopics = topics({ sorting: practiced(30, 10, { cfSolved: 6 }) });
  const base = (over: Partial<RecommenderInput> = {}) =>
    createRecommender(
      input({
        topics: sortTopics,
        frequency: new Map([["sorting", 0.15]]),
        contestTimes: new Map([
          [2000, RECENT],
          [1000, OLD],
        ]),
        ...over,
      }),
    );

  it("stays in [rating, rating + 200] on CF's 100-steps and the topic's tags", () => {
    const problems = [
      problem(2000, "A", 900, ["sortings"]),
      problem(2000, "B", 1000, ["sortings"]),
      problem(2000, "C", 1100, ["sortings"]),
      problem(2000, "D", 1200, ["sortings"]),
      problem(2000, "E", 1300, ["sortings"]),
      problem(2000, "F", 1100, ["dp"]),
    ];
    const recs = base({ cfProblems: problems }).sharpen("sorting");
    expect(recs.map((r) => r.id).sort()).toEqual(["2000-B", "2000-C", "2000-D"]);
    expect(recs.every((r) => r.rating >= 1000 && r.rating <= 1200)).toBe(true);
  });

  it("aims just above you, prefers recent contests, then focused and popular problems", () => {
    const problems = [
      problem(1000, "A", 1100, ["sortings"], 50_000), // old
      problem(2000, "A", 1000, ["sortings"]),
      problem(2000, "B", 1100, ["sortings", "greedy", "math"]),
      problem(2000, "C", 1100, ["sortings"], 500),
      problem(2000, "D", 1100, ["sortings"], 9_000),
    ];
    const ids = base({ cfProblems: problems }).sharpen("sorting").map((r) => r.id);
    expect(ids).toEqual(["2000-D", "2000-C", "2000-B", "2000-A", "1000-A"]);
    expect(base({ cfProblems: problems }).sharpen("sorting")[0]?.recent).toBe(true);
  });

  it("leaves out solved, attempted (Upsolve), dismissed, gym, unrated and *special problems", () => {
    const problems = [
      problem(2000, "A", 1100, ["sortings"]),
      problem(2000, "B", 1100, ["sortings"]),
      problem(2000, "C", 1100, ["sortings"]),
      problem(2000, "D", 1100, ["sortings"]),
      problem(2000, "E", 1100, ["sortings", "*special"]),
      problem(100_500, "A", 1100, ["sortings"]),
      problem(2000, "F", null, ["sortings"]),
      problem(2000, "G", 1100, ["sortings"]),
    ];
    const r = base({
      cfProblems: problems,
      cfSubmissions: [sub("2000-A", "OK"), sub("2000-B", "WRONG_ANSWER"), sub("2000-D", "COMPILATION_ERROR")],
      feedback: [fb("2000-C", "sorting", "skip")],
    });
    // 2000-D only had a compile error: not a real attempt, still recommended.
    expect(r.sharpen("sorting").map((p) => p.id)).toEqual(["2000-D", "2000-G"]);
  });

  it("drops a problem once you solve it (after the next sync)", () => {
    const problems = [problem(2000, "A", 1100, ["sortings"]), problem(2000, "B", 1100, ["sortings"])];
    expect(base({ cfProblems: problems }).sharpen("sorting").map((p) => p.id)).toContain("2000-A");
    expect(base({ cfProblems: problems, cfSubmissions: [sub("2000-A", "OK")] }).sharpen("sorting").map((p) => p.id)).toEqual(["2000-B"]);
  });

  it("shifts the window ±100 per Too easy / Too hard", () => {
    expect(base().plans.get("sorting")!.window).toEqual({ lo: 1000, hi: 1200, offset: 0 });
    const easier = base({ feedback: [fb("x-A", "sorting", "too_hard")] }).plans.get("sorting")!.window;
    expect(easier).toEqual({ lo: 900, hi: 1100, offset: -100 });
    const harder = base({ feedback: [fb("x-A", "sorting", "too_easy"), fb("y-A", "sorting", "too_easy")] }).plans.get("sorting")!.window;
    expect(harder).toEqual({ lo: 1200, hi: 1400, offset: 200 });
    // Never below the lowest CF rating.
    const floor = base({ cfRating: 820, feedback: [fb("x-A", "sorting", "too_hard"), fb("y-A", "sorting", "too_hard")] }).plans.get("sorting")!.window;
    expect(floor.lo).toBe(800);
  });

  it("has nothing for topics Codeforces doesn't tag", () => {
    expect(base({ cfProblems: [problem(2000, "A", 1100, ["sortings"])] }).sharpen("linked-lists")).toEqual([]);
    expect(base().plans.get("linked-lists")!.canSharpen).toBe(false);
  });
});

describe("Learn (LeetCode)", () => {
  const path = [
    lc("e1", "two-pointers", "Easy", 1),
    lc("e2", "two-pointers", "Easy", 2),
    lc("e3", "two-pointers", "Easy", 3),
    lc("m1", "two-pointers", "Medium", 4),
    lc("m2", "two-pointers", "Medium", 5),
    lc("m3", "two-pointers", "Medium", 6),
    lc("h1", "two-pointers", "Hard", 7),
    lc("x1", "arrays-hashing", "Easy", 1, ["arrays-hashing", "two-pointers"]), // cross-listed
  ];
  const at = (score: number, over: Partial<RecommenderInput> = {}) =>
    createRecommender(input({ lcCurated: path, topics: topics({ "two-pointers": practiced(score, 5, { cfSolved: 0, lcSolved: 1 }) }), ...over }));
  const ids = (score: number, over: Partial<RecommenderInput> = {}) => at(score, over).learn("two-pointers").map((p) => p.id);

  it("gives Easy problems first while the topic is Weak", () => {
    expect(ids(10)).toEqual(["e1", "e2", "e3", "m1", "m2", "m3", "h1", "x1"]);
  });

  it("mixes in Mediums as the topic gets stronger", () => {
    expect(ids(30)).toEqual(["e1", "m1", "e2", "m2", "e3", "m3", "h1", "x1"]);
    expect(ids(60)).toEqual(["m1", "m2", "h1", "m3", "e1", "e2", "e3", "x1"]);
  });

  it("puts the topic's own path before cross-listed problems", () => {
    const recs = at(10).learn("two-pointers");
    expect(recs[recs.length - 1]).toMatchObject({ id: "x1", onPath: false });
    expect(recs[0]).toMatchObject({ id: "e1", onPath: true, order: 1 });
  });

  it("leaves out solved and dismissed problems", () => {
    const over = { lcSolved: new Set(["e1"]), feedback: [fb("e2", "two-pointers", "skip", "lc")] };
    expect(ids(10, over).slice(0, 2)).toEqual(["e3", "m1"]);
  });

  it("moves up a level per Too easy on LeetCode", () => {
    const over = { feedback: [fb("e1", "two-pointers", "too_easy", "lc")] };
    expect(at(10, over).plans.get("two-pointers")!.lcLevel).toBe(1);
    expect(ids(10, over).slice(0, 2)).toEqual(["e2", "m1"]);
  });
});

describe("Upsolve", () => {
  it("lists tried-and-never-accepted problems, easiest first", () => {
    const r = createRecommender(
      input({
        cfSubmissions: [
          sub("10-A", "WRONG_ANSWER", ["math"], 1200),
          sub("10-A", "TIME_LIMIT_EXCEEDED", ["math"], 1200, NOW - 10),
          sub("11-B", "WRONG_ANSWER", ["greedy"], 900),
          sub("12-C", "WRONG_ANSWER", ["greedy"], null),
          sub("13-D", "WRONG_ANSWER", ["dp"], 800),
          sub("13-D", "OK", ["dp"], 800),
          sub("14-E", "COMPILATION_ERROR", ["dp"], 800),
        ],
      }),
    );
    const up = r.upsolve();
    expect(up.map((u) => u.id)).toEqual(["11-B", "10-A", "12-C"]);
    expect(up[1]).toMatchObject({ attempts: 2, lastVerdict: "TIME_LIMIT_EXCEEDED", topics: ["math"] });
  });
});

describe("Mix of the Day", () => {
  const cfProblems = [
    ...["A", "B", "C"].map((i) => problem(2000, i, 1100, ["sortings"])),
    ...["A", "B", "C"].map((i) => problem(2001, i, 1100, ["greedy"])),
    ...["A", "B", "C"].map((i) => problem(2002, i, 1100, ["constructive algorithms"])),
  ];
  const lcCurated = [lc("tp1", "two-pointers", "Easy", 1), lc("tp2", "two-pointers", "Easy", 2), lc("tp3", "two-pointers", "Medium", 3), lc("s1", "sorting", "Easy", 1)];
  const make = (over: Partial<RecommenderInput> = {}) =>
    createRecommender(
      input({
        cfProblems,
        lcCurated,
        contestTimes: new Map([
          [2000, RECENT],
          [2001, RECENT],
          [2002, RECENT],
        ]),
        frequency: new Map([
          ["constructive", 0.21],
          ["sorting", 0.15],
          ["greedy", 0.12],
          ["two-pointers", 0.3],
        ]),
        topics: topics({
          constructive: practiced(37, 20, { cfSolved: 10 }),
          sorting: practiced(32, 40, { cfSolved: 6 }),
          greedy: practiced(55, 5, { cfSolved: 18 }),
          "two-pointers": { lastPracticedAt: null },
        }),
        ...over,
      }),
    );

  it("is 3 Codeforces problems from the weakest topics and 2 LeetCode problems for Next Topic", () => {
    const r = make();
    expect(r.nextTopic?.topicId).toBe("two-pointers");
    const mix = r.generateMix();
    expect(mix.filter((m) => m.platform === "cf")).toHaveLength(MIX_SIZE.cf);
    expect(mix.filter((m) => m.platform === "lc")).toEqual([
      { platform: "lc", problemId: "tp1", topicId: "two-pointers" },
      { platform: "lc", problemId: "tp2", topicId: "two-pointers" },
    ]);
    // One Codeforces problem per topic, weakest first.
    // Two pointers leads but is still in Learn mode, so the CF slots go to the three weakest sharpening topics.
    expect(mix.filter((m) => m.platform === "cf").map((m) => m.topicId)).toEqual(["sorting", "constructive", "greedy"]);
  });

  it("gives Codeforces slots to topics you've already learned", () => {
    const withTp = [...cfProblems, problem(2003, "A", 1100, ["two pointers"])];
    const mix = make({ cfProblems: withTp, contestTimes: new Map([[2000, RECENT], [2001, RECENT], [2002, RECENT], [2003, RECENT]]) }).generateMix();
    expect(mix.some((m) => m.problemId === "2003-A")).toBe(false);
  });

  it("is stable for the same data and different on a reshuffle", () => {
    const a = make().generateMix();
    expect(make().generateMix()).toEqual(a);
    const b = make().generateMix(new Set(a.map((m) => m.problemId)));
    expect(b.some((m) => a.some((x) => x.problemId === m.problemId))).toBe(false);
  });

  it("teaches on LeetCode the first topic still in Learn mode when Next Topic is already sharpening", () => {
    const r = make({ frequency: new Map([["sorting", 0.5], ["two-pointers", 0.01], ["constructive", 0.2], ["greedy", 0.1]]) });
    expect(r.nextTopic?.topicId).toBe("sorting");
    expect(r.nextTopic?.mode).toBe("sharpen");
    expect(r.generateMix().filter((m) => m.platform === "lc").map((m) => m.topicId)).toEqual(["two-pointers", "two-pointers"]);
  });

  it("keeps solved items as done and swaps out ones you gave feedback on", () => {
    const mix = make().generateMix();
    const [first, second] = mix;
    const later = make({
      cfSubmissions: [sub(first!.problemId, "OK")],
      feedback: [fb(second!.problemId, second!.topicId, "too_hard")],
    });
    const { items, changed } = later.refreshMix(mix);
    expect(changed).toBe(true);
    expect(items[0]).toMatchObject({ problemId: first!.problemId, done: true });
    expect(items[1]!.problemId).not.toBe(second!.problemId);
    expect(items[1]!.topicId).toBe(second!.topicId); // same topic first
    expect(items).toHaveLength(mix.length);
    expect(items.every((i) => i.rec !== null)).toBe(true);
    // Nothing to do on a clean mix.
    expect(make().refreshMix(mix).changed).toBe(false);
  });
});
