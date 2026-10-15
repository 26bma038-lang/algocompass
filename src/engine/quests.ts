import type { Platform, QuestSpec, StoredQuest } from "@/data/types";

/**
 * Daily quests and XP. Pure: the data layer hands in today's mix and today's solves.
 *
 * Three quests a day, all drawn from the Mix of the Day:
 * - Codeforces: one problem in the mix's first sharpen topic, rated at least its mix problem.
 * - LeetCode: one problem in the topic you're learning.
 * - Consistency: any two problems, either platform.
 */

export const QUEST_XP = { cf_topic: 30, lc_topic: 20, any_solves: 15 } as const;
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
  platform: Platform;
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
    const rated = cf.rating !== null ? ` rated ${cf.rating}+` : "";
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

/** Does this solve move the quest forward? */
export function countsFor(q: QuestSpec, s: SolveEvent): boolean {
  switch (q.kind) {
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
export function evaluateQuests(quests: readonly StoredQuest[], solves: readonly SolveEvent[]): QuestState[] {
  return quests.map((q) => {
    const ids = new Set(solves.filter((s) => countsFor(q, s)).map((s) => `${s.platform}:${s.problemId}`));
    const done = q.completedAt !== null || ids.size >= q.target;
    return { ...q, progress: done ? q.target : Math.min(ids.size, q.target), done };
  });
}

/** Quests that are done by the data but not yet recorded: these get the reward moment and the notification. */
export function newlyCompleted(states: readonly QuestState[]): QuestState[] {
  return states.filter((q) => q.done && q.completedAt === null);
}

// ---------- XP and levels ----------

/** XP needed to go from `level` to `level + 1`: 100, 150, 200, … */
export const xpToNext = (level: number) => 100 + 50 * (level - 1);

export interface LevelInfo {
  /** Null until any XP is earned (the level badge stays unlit). */
  level: number | null;
  totalXp: number;
  intoLevel: number;
  toNext: number;
  /** 0–1 toward the next level. */
  progress: number;
}

export function levelForXp(totalXp: number): LevelInfo {
  if (totalXp <= 0) return { level: null, totalXp: 0, intoLevel: 0, toNext: xpToNext(1), progress: 0 };
  let level = 1;
  let rest = totalXp;
  while (rest >= xpToNext(level)) {
    rest -= xpToNext(level);
    level++;
  }
  const toNext = xpToNext(level);
  return { level, totalXp, intoLevel: rest, toNext, progress: rest / toNext };
}
