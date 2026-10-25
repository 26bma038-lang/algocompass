import type { Platform, QuestSpec, StoredQuest } from "@/data/types";

/**
 * Daily quests and XP. Pure: the data layer hands in today's mix and today's solves.
 *
 * Three quests a day, all drawn from the Mix of the Day:
 * - Codeforces: one problem in the mix's first sharpen topic, rated at least its mix problem.
 * - LeetCode: one problem in the topic you're learning.
 * - Consistency: any two problems, either platform.
 * - Sheet (v1.3, when you follow a sheet or the Beginner Path): one problem from it.
 */

export const QUEST_XP = { cf_topic: 30, lc_topic: 20, any_solves: 15, sheet: 20 } as const;
export const CONSISTENCY_TARGET = 2;

/** A mix slot, resolved enough to word a quest. */
export interface QuestMixItem {
  platform: Platform;
  problemId: string;
  topicId: string;
  /** CF rating of the mix problem (null for LeetCode or unrated). */
  rating: number | null;
}

/** One accepted problem today (first AC per problem; manual marks count too). */
export interface SolveEvent {
  /** "sheet": a sheet problem ticked by hand that isn't on LeetCode or Codeforces (problemId is its sheet key). */
  platform: Platform | "sheet";
  problemId: string;
  at: number;
  /** Unified topic ids the problem belongs to. */
  topics: readonly string[];
  rating: number | null;
}

export function generateQuests(mix: readonly QuestMixItem[], topicName: (id: string) => string): QuestSpec[] {
  const out: QuestSpec[] = [];
  const cf = mix.find((m) => m.platform === "cf");
  if (cf) {
    const rated = cf.rating !== null ? ` of difficulty ${cf.rating}+` : "";
    out.push({
      id: "cf_topic",
      kind: "cf_topic",
      title: `Solve 1 ${topicName(cf.topicId)} problem${rated} on Codeforces`,
      target: 1,
      topicId: cf.topicId,
      minRating: cf.rating,
      problemIds: mix.filter((m) => m.platform === "cf" && m.topicId === cf.topicId).map((m) => m.problemId),
      xp: QUEST_XP.cf_topic,
    });
  }
  const lc = mix.find((m) => m.platform === "lc");
  if (lc) {
    out.push({
      id: "lc_topic",
      kind: "lc_topic",
      title: `Solve 1 ${topicName(lc.topicId)} problem on LeetCode`,
      target: 1,
      topicId: lc.topicId,
      minRating: null,
      problemIds: mix.filter((m) => m.platform === "lc" && m.topicId === lc.topicId).map((m) => m.problemId),
      xp: QUEST_XP.lc_topic,
    });
  }
  out.push({
    id: "any_solves",
    kind: "any_solves",
    title: `Solve any ${CONSISTENCY_TARGET} problems today`,
    target: CONSISTENCY_TARGET,
    topicId: null,
    minRating: null,
    problemIds: [],
    xp: QUEST_XP.any_solves,
  });
  return out;
}

/** The sheet you follow, as a quest: one problem from it today. */
export function sheetQuest(sheet: { id: string; short: string; nextKey: string | null }): QuestSpec {
  return {
    id: "sheet",
    kind: "sheet",
    title: `Solve 1 problem from ${sheet.short}`,
    target: 1,
    topicId: null,
    minRating: null,
    problemIds: sheet.nextKey ? [sheet.nextKey] : [],
    sheetId: sheet.id,
    xp: QUEST_XP.sheet,
  };
}

/** A solve's sheet key: "lc:two-sum", "cf:4-A", or the key itself for a hand-ticked sheet problem. */
export const solveKey = (s: SolveEvent) => (s.platform === "sheet" ? s.problemId : `${s.platform}:${s.problemId}`);

/** Problem keys per sheet, for sheet quests. */
export type SheetMembers = (sheetId: string) => ReadonlySet<string> | undefined;

/** Does this solve move the quest forward? */
export function countsFor(q: QuestSpec, s: SolveEvent, sheets?: SheetMembers): boolean {
  switch (q.kind) {
    case "sheet": {
      const key = solveKey(s);
      if (q.problemIds.includes(key)) return true;
      return q.sheetId !== undefined && (sheets?.(q.sheetId)?.has(key) ?? false);
    }
    case "any_solves":
      return true;
    case "cf_topic":
      if (s.platform !== "cf") return false;
      if (q.problemIds.includes(s.problemId)) return true;
      return q.topicId !== null && s.topics.includes(q.topicId) && (q.minRating === null || (s.rating !== null && s.rating >= q.minRating));
    case "lc_topic":
      if (s.platform !== "lc") return false;
      return q.problemIds.includes(s.problemId) || (q.topicId !== null && s.topics.includes(q.topicId));
  }
}

export interface QuestState extends StoredQuest {
  progress: number;
  done: boolean;
}

/** Progress per quest from today's solves. A quest stored as completed stays done. */
export function evaluateQuests(quests: readonly StoredQuest[], solves: readonly SolveEvent[], sheets?: SheetMembers): QuestState[] {
  return quests.map((q) => {
    const ids = new Set(solves.filter((s) => countsFor(q, s, sheets)).map(solveKey));
    const done = q.completedAt !== null || ids.size >= q.target;
    return { ...q, progress: done ? q.target : Math.min(ids.size, q.target), done };
  });
}

/** Quests that are done by the data but not yet recorded: these get the reward moment and the notification. */
export function newlyCompleted(states: readonly QuestState[]): QuestState[] {
  return states.filter((q) => q.done && q.completedAt === null);
}
