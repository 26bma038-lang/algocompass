import type { CfRatingChange } from "@/data/types";
import { computeTopicStrengths, type StrengthInput, type TopicStrength } from "./strength";

/** Weekly review. Pure: what changed between Monday 00:00 and now. */

/**
 * Topic strengths as they stood at `at`: the same engine, fed only what had happened by then.
 * LeetCode solves after `at` are also taken out of the tag and difficulty totals, so they don't
 * sneak back in as undated solves.
 */
export function strengthsAt(input: StrengthInput, at: number, ratingAt: number | null): TopicStrength[] {
  const meta = new Map(input.lcProblems.map((p) => [p.slug, p]));
  const later = new Set(input.lcRecentAc.filter((r) => r.timestamp >= at).map((r) => r.slug));
  const before = new Set(input.lcRecentAc.filter((r) => r.timestamp < at).map((r) => r.slug));
  const newSlugs = [...later].filter((s) => !before.has(s) && meta.has(s));
  const tagMinus = new Map<string, number>();
  const diffMinus = { easy: 0, medium: 0, hard: 0 };
  for (const slug of newSlugs) {
    const m = meta.get(slug)!;
    for (const t of m.tags) tagMinus.set(t, (tagMinus.get(t) ?? 0) + 1);
    diffMinus[m.difficulty.toLowerCase() as keyof typeof diffMinus]++;
  }
  const lcSolved = input.lcSolved && {
    easy: Math.max(0, input.lcSolved.easy - diffMinus.easy),
    medium: Math.max(0, input.lcSolved.medium - diffMinus.medium),
    hard: Math.max(0, input.lcSolved.hard - diffMinus.hard),
    all: Math.max(0, input.lcSolved.all - newSlugs.length),
  };
  return computeTopicStrengths({
    now: at,
    cfRating: ratingAt,
    cfSubmissions: input.cfSubmissions.filter((s) => s.createdAt < at),
    lcSolved,
    lcTagCounts: input.lcTagCounts.map((t) => ({ ...t, solved: Math.max(0, t.solved - (tagMinus.get(t.slug) ?? 0)) })),
    lcProblems: input.lcProblems,
    lcRecentAc: input.lcRecentAc.filter((r) => r.timestamp < at),
  });
}

export interface TopicChange {
  topicId: string;
  name: string;
  from: number;
  to: number;
}

/** Topics whose score rose, biggest gain first. */
export function improvedTopics(before: readonly TopicStrength[], after: readonly TopicStrength[], limit = 3): TopicChange[] {
  const old = new Map(before.map((t) => [t.topicId, t.score]));
  return after
    .map((t) => ({ topicId: t.topicId, name: t.name, from: old.get(t.topicId) ?? 0, to: t.score }))
    .filter((c) => c.to > c.from)
    .sort((a, b) => b.to - b.from - (a.to - a.from))
    .slice(0, limit);
}

/** Your CF rating going into `at` (the last change before it), or null when unrated then. */
export function ratingAt(history: readonly CfRatingChange[], at: number): number | null {
  let r: number | null = null;
  for (const h of history) if (h.at < at) r = h.newRating;
  return r;
}

/** Net rating change from rounds rated in [from, to), and how many. */
export function ratingChange(history: readonly CfRatingChange[], from: number, to: number): { delta: number; rounds: number } {
  const week = history.filter((h) => h.at >= from && h.at < to);
  return { delta: week.reduce((n, h) => n + h.newRating - h.oldRating, 0), rounds: week.length };
}
