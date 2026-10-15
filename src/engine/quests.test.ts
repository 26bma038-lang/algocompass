import { describe, expect, it } from "vitest";
import type { StoredQuest } from "@/data/types";
import { weekCounts, weekEnd, weekStart } from "./goals";
import { CONSISTENCY_TARGET, evaluateQuests, generateQuests, levelForXp, newlyCompleted, QUEST_XP, xpToNext, type QuestMixItem, type SolveEvent } from "./quests";

const names: Record<string, string> = { sorting: "Sorting", greedy: "Greedy", "two-pointers": "Two pointers" };
const name = (id: string) => names[id] ?? id;

const MIX: QuestMixItem[] = [
  { platform: "cf", problemId: "2126-C", topicId: "sorting", rating: 1100 },
  { platform: "cf", problemId: "2000-B", topicId: "greedy", rating: 1100 },
  { platform: "cf", problemId: "1999-A", topicId: "sorting", rating: 1000 },
  { platform: "lc", problemId: "valid-palindrome", topicId: "two-pointers", rating: null },
  { platform: "lc", problemId: "remove-duplicates-from-sorted-array", topicId: "two-pointers", rating: null },
];

const stored = (specs = generateQuests(MIX, name)): StoredQuest[] => specs.map((q) => ({ ...q, completedAt: null }));
const cf = (problemId: string, topics: string[], rating: number | null, at = 100): SolveEvent => ({ platform: "cf", problemId, topics, rating, at });
const lc = (problemId: string, topics: string[], at = 100): SolveEvent => ({ platform: "lc", problemId, topics, rating: null, at });

describe("generateQuests", () => {
  it("makes one CF, one LC and one consistency quest from the mix", () => {
    const q = generateQuests(MIX, name);
    expect(q.map((x) => x.id)).toEqual(["cf_topic", "lc_topic", "any_solves"]);
    expect(q[0]!.title).toBe("Solve 1 Sorting problem rated 1100+ on Codeforces");
    expect(q[0]!.problemIds).toEqual(["2126-C", "1999-A"]);
    expect(q[1]!.title).toBe("Solve 1 Two pointers problem on LeetCode");
    expect(q[2]!.title).toBe(`Solve any ${CONSISTENCY_TARGET} problems today`);
    expect(q.map((x) => x.xp)).toEqual([QUEST_XP.cf_topic, QUEST_XP.lc_topic, QUEST_XP.any_solves]);
  });

  it("leaves out a platform the mix has nothing for, keeping consistency", () => {
    expect(generateQuests(MIX.filter((m) => m.platform === "lc"), name).map((q) => q.id)).toEqual(["lc_topic", "any_solves"]);
    expect(generateQuests([], name).map((q) => q.id)).toEqual(["any_solves"]);
  });

  it("drops the rating clause for an unrated mix problem", () => {
    const [q] = generateQuests([{ platform: "cf", problemId: "x", topicId: "sorting", rating: null }], name);
    expect(q!.title).toBe("Solve 1 Sorting problem on Codeforces");
    expect(q!.minRating).toBeNull();
  });
});

describe("evaluateQuests", () => {
  it("starts at zero", () => {
    const s = evaluateQuests(stored(), []);
    expect(s.map((q) => [q.progress, q.done])).toEqual([[0, false], [0, false], [0, false]]);
  });

  it("completes the CF quest on any topic solve at or above the rating", () => {
    const s = evaluateQuests(stored(), [cf("1500-A", ["sorting", "math"], 1100)]);
    expect(s[0]!.done).toBe(true);
    expect(s[2]!.progress).toBe(1);
  });

  it("doesn't count an easier or off-topic CF solve, or an unrated one", () => {
    const s = evaluateQuests(stored(), [cf("a", ["sorting"], 1000), cf("b", ["greedy"], 1300), cf("c", ["sorting"], null)]);
    expect(s[0]!.done).toBe(false);
    expect(s[2]!.done).toBe(true); // still three problems today
  });

  it("always counts the quest's own mix problem, even below the threshold", () => {
    expect(evaluateQuests(stored(), [cf("1999-A", [], 1000)])[0]!.done).toBe(true);
  });

  it("completes the LC quest by topic or by a mix problem, and never from a CF solve", () => {
    expect(evaluateQuests(stored(), [lc("3sum", ["two-pointers"])])[1]!.done).toBe(true);
    expect(evaluateQuests(stored(), [lc("valid-palindrome", [])])[1]!.done).toBe(true);
    expect(evaluateQuests(stored(), [cf("x", ["two-pointers"], 1500)])[1]!.done).toBe(false);
  });

  it("counts distinct problems for consistency (a re-submit isn't a second problem)", () => {
    const s = evaluateQuests(stored(), [cf("a", [], 800), cf("a", [], 800)]);
    expect(s[2]!.progress).toBe(1);
    expect(evaluateQuests(stored(), [cf("a", [], 800), lc("b", [])])[2]!.done).toBe(true);
  });

  it("keeps a recorded quest done even if the solve disappears (e.g. an undone manual mark)", () => {
    const q = stored().map((x) => (x.id === "lc_topic" ? { ...x, completedAt: 50 } : x));
    const s = evaluateQuests(q, []);
    expect(s[1]!.done).toBe(true);
    expect(s[1]!.progress).toBe(1);
  });
});

describe("newlyCompleted", () => {
  it("returns only quests done by the data and not yet recorded", () => {
    const q = stored().map((x) => (x.id === "any_solves" ? { ...x, completedAt: 10 } : x));
    const fresh = newlyCompleted(evaluateQuests(q, [cf("1500-A", ["sorting"], 1200), lc("z", ["two-pointers"])]));
    expect(fresh.map((x) => x.id)).toEqual(["cf_topic", "lc_topic"]);
  });

  it("is empty once completions are recorded (the reward plays once)", () => {
    const s = evaluateQuests(stored(), [cf("1500-A", ["sorting"], 1200)]);
    const recorded = s.map((x) => (x.done ? { ...x, completedAt: 99 } : x));
    expect(newlyCompleted(evaluateQuests(recorded, [cf("1500-A", ["sorting"], 1200)]))).toEqual([]);
  });
});

describe("levels", () => {
  it("is unlit with no XP", () => {
    expect(levelForXp(0).level).toBeNull();
  });
  it("climbs 100, 150, 200 â€¦ XP per level", () => {
    expect(xpToNext(1)).toBe(100);
    expect(levelForXp(15)).toMatchObject({ level: 1, intoLevel: 15, toNext: 100 });
    expect(levelForXp(100)).toMatchObject({ level: 2, intoLevel: 0, toNext: 150 });
    expect(levelForXp(260)).toMatchObject({ level: 3, intoLevel: 10, toNext: 200 });
  });
});

describe("weekly goals", () => {
  // Wednesday 2026-10-14, local time.
  const wed = new Date(2026, 9, 14, 15, 0);
  const from = weekStart(wed);
  const to = weekEnd(from);
  const t = (d: number, h = 12) => Math.floor(new Date(2026, 9, d, h).getTime() / 1000);

  it("weeks run Monday 00:00 to the next Monday", () => {
    expect(new Date(from * 1000)).toEqual(new Date(2026, 9, 12));
    expect(new Date(to * 1000)).toEqual(new Date(2026, 9, 19));
  });

  it("counts first solves this week, LC manual marks deduped, and contests on both platforms", () => {
    const sub = (id: number, key: string, at: number, verdict = "OK") => ({
      id, problemKey: key, contestId: 1, problemIndex: "A", problemName: key, problemRating: 800, tags: [], verdict, createdAt: at, language: "C++",
    });
    const counts = weekCounts(
      {
        cfSubmissions: [sub(1, "1-A", t(13)), sub(2, "1-A", t(14)), sub(3, "2-B", t(5)), sub(4, "2-B", t(13)), sub(5, "3-C", t(14), "WRONG_ANSWER")],
        lcRecentAc: [{ id: "x", title: "X", slug: "x", timestamp: t(14) }],
        manualSolves: [
          { platform: "lc", problemId: "x", title: "X", topicId: null, solvedAt: t(15) },
          { platform: "lc", problemId: "y", title: "Y", topicId: null, solvedAt: t(15) },
        ],
        ratingHistory: [{ contestId: 10, contestName: "R", rank: 1, oldRating: 1000, newRating: 1010, at: t(13, 23) }],
        contestResults: [
          { contestId: "cf:10", name: "R", startTime: t(13, 17), durationSeconds: 7200, participated: true, rank: 1, solved: 2, total: 6, problems: [], syncedAt: 0 },
          { contestId: "cf:11", name: "S", startTime: t(14, 17), durationSeconds: 7200, participated: false, rank: null, solved: null, total: null, problems: [], syncedAt: 0 },
        ],
        lcContests: [{ title: "Weekly", startTime: t(18, 8), rating: 1500, ranking: 1, solved: 2, total: 4 }],
      },
      from,
      to,
    );
    // 1-A is new this week; 2-B was first solved last week; 3-C isn't solved.
    expect(counts).toEqual({ cfProblems: 1, lcProblems: 2, contests: 2 });
  });
});

describe("contests", async () => {
  const { contestDivision, contestsToCheck, upsolvePicks, registerUrl } = await import("./contests");
  it("labels divisions from the round name", () => {
    expect(contestDivision({ platform: "cf", name: "Codeforces Round 1060 (Div. 2)" })).toBe("Div. 2");
    expect(contestDivision({ platform: "cf", name: "Codeforces Round 1000 (Div. 1 + Div. 2)" })).toBe("Div. 1 + 2");
    expect(contestDivision({ platform: "cf", name: "Educational Codeforces Round 195 (Rated for Div. 2)" })).toBe("Educational · Div. 2");
    expect(contestDivision({ platform: "cf", name: "Codeforces Global Round 30" })).toBe("Global");
    expect(contestDivision({ platform: "lc", name: "Biweekly Contest 168" })).toBe("Biweekly");
    expect(contestDivision({ platform: "lc", name: "Weekly Contest 524" })).toBe("Weekly");
  });
  it("registers on CF's registration page", () => {
    expect(registerUrl({ id: "cf:2160", platform: "cf", url: "https://codeforces.com/contests/2160" })).toBe("https://codeforces.com/contestRegistration/2160");
  });
  it("upsolves the next two past what you solved, and nothing for a round you skipped", () => {
    const problems = ["A", "B1", "B2", "C", "D"].map((index) => ({ key: index, contestId: 1, index, name: index, rating: null, tags: [], solvedCount: null }));
    expect(upsolvePicks({ contestId: 1, problems, me: { rank: 1, participantType: "CONTESTANT", solvedIndices: ["A"] } }).map((p) => p.index)).toEqual(["B1", "B2"]);
    expect(upsolvePicks({ contestId: 1, problems, me: null })).toEqual([]);
  });
  it("finds rounds you submitted in during the contest window, ignoring practice later", () => {
    const sub = (contestId: number, createdAt: number) => ({ id: createdAt, problemKey: `${contestId}-A`, contestId, problemIndex: "A", problemName: "A", problemRating: null, tags: [], verdict: "OK", createdAt, language: "C++" });
    const windows = new Map([
      [5, { startTime: 1000, durationSeconds: 7200 }],
      [6, { startTime: 1000, durationSeconds: 7200 }],
    ]);
    const todo = contestsToCheck({ now: 100_000, contests: [], windows, ratingHistory: [], attending: new Set(), submissions: [sub(5, 2000), sub(6, 50_000)], known: new Set() });
    expect(todo.map((t) => t.contestId)).toEqual([5]);
  });
});

describe("weekly review", async () => {
  const { improvedTopics, ratingAt, ratingChange } = await import("./review");
  const ts = (topicId: string, score: number) => ({ topicId, name: topicId, score }) as never;
  it("lists topics that rose, biggest gain first", () => {
    expect(improvedTopics([ts("a", 10), ts("b", 30), ts("c", 50)], [ts("a", 25), ts("b", 32), ts("c", 40)]).map((t) => t.topicId)).toEqual(["a", "b"]);
  });
  it("sums rating changes rated inside the week", () => {
    const h = [
      { contestId: 1, contestName: "", rank: 1, oldRating: 900, newRating: 950, at: 10 },
      { contestId: 2, contestName: "", rank: 1, oldRating: 950, newRating: 930, at: 20 },
      { contestId: 3, contestName: "", rank: 1, oldRating: 930, newRating: 990, at: 30 },
    ];
    expect(ratingChange(h, 15, 40)).toEqual({ delta: 40, rounds: 2 });
    expect(ratingAt(h, 15)).toBe(950);
    expect(ratingAt(h, 5)).toBeNull();
  });
});
