import type { AchievementState } from "./achievements";
import type { BeginnerPath, PathState } from "./path";
import type { Standing } from "./standing";
import type { TopicStatus, TopicStrength } from "./strength";

/**
 * Progress (v1.4 step 2b): the Topics list, a beginner's path topics, the week's dots and the badges
 * to show. Pure: the data layer hands in the topic report, the path and what was earned.
 */

export interface TopicRow {
  topicId: string;
  name: string;
  status: TopicStatus;
  score: number;
  tried: boolean;
  /** One plain line on why it sits where it does. */
  why: string;
}

/**
 * Every topic, weakest first: the ones you've tried by strength (lowest first), then the ones you
 * haven't, in catalog order. The "why" is the Where-you-stand reason when there is one, else what
 * you've solved.
 */
export function topicRows(topics: readonly TopicStrength[], standing: Standing | null, plainName: (id: string, name: string) => string = (_, n) => n): TopicRow[] {
  const reasons = new Map<string, string>();
  for (const g of [standing?.strengths, standing?.weaknesses, standing?.blindSpots]) for (const i of g ?? []) reasons.set(i.topicId, i.reason);
  const rows = topics.map((t): TopicRow => {
    const tried = t.solvedCount > 0;
    const solved = `${t.solvedCount} solved${t.maxCfRatingSolved ? `, up to Codeforces difficulty ${t.maxCfRatingSolved}` : ""}.`;
    return { topicId: t.topicId, name: plainName(t.topicId, t.name), status: t.status, score: t.score, tried, why: reasons.get(t.topicId) ?? (tried ? solved : "Nothing solved here yet.") };
  });
  const pos = new Map(topics.map((t, i) => [t.topicId, i]));
  return rows.sort((a, b) => Number(b.tried) - Number(a.tried) || (a.tried ? a.score - b.score : 0) || pos.get(a.topicId)! - pos.get(b.topicId)!);
}

export interface PathTopicRow {
  topicId: string;
  /** "done": every step teaching it is done; "current": the step you're on teaches it; "started": one of its steps is done, another is ahead; "later": not reached. */
  state: "done" | "current" | "started" | "later";
  /** The steps that teach it (0-based), in order. */
  steps: number[];
}

/**
 * A beginner's Topics before any solve history (v1.4: never "after the first update"): the topics
 * the Beginner Path teaches, in step order, each done, being learned now, or later.
 */
export function pathTopics(path: BeginnerPath, state: Pick<PathState, "steps">): PathTopicRow[] {
  const byTopic = new Map<string, number[]>();
  path.steps.forEach((s, i) => s.topics.forEach((t) => byTopic.set(t, [...(byTopic.get(t) ?? []), i])));
  return [...byTopic].map(([topicId, steps]) => {
    const states = steps.map((i) => state.steps[i]?.state ?? "locked");
    const st: PathTopicRow["state"] = states.every((s) => s === "done") ? "done" : states.includes("current") ? "current" : states.includes("done") ? "started" : "later";
    return { topicId, state: st, steps };
  });
}

/** Which days of the week (Monday first) had any practice, from event times (epoch seconds). */
export function weekDays(weekFrom: number, times: readonly number[]): boolean[] {
  const start = new Date(weekFrom * 1000);
  const bounds = Array.from({ length: 8 }, (_, i) => new Date(start.getFullYear(), start.getMonth(), start.getDate() + i).getTime() / 1000);
  return Array.from({ length: 7 }, (_, d) => times.some((t) => t >= bounds[d]! && t < bounds[d + 1]!));
}

/**
 * The badges Overview shows (three): the most recently earned, or, before any is earned, the three
 * closest to being earned (the most progress first), so the card is never empty.
 */
export function badgesToShow<T extends AchievementState>(all: readonly T[], n = 3): { earned: boolean; list: T[] } {
  const earned = all.filter((a) => a.unlocked).sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
  if (earned.length) return { earned: true, list: earned.slice(0, n) };
  const ratio = (a: T) => (a.progress && a.progress.target > 0 ? a.progress.value / a.progress.target : 0);
  return { earned: false, list: [...all].sort((a, b) => ratio(b) - ratio(a)).slice(0, n) };
}
