import type { CfRatingChange, CfSubmission, ContestResult, LcContestEntry, LcRecentAc, ManualSolve } from "@/data/types";

/** Weekly goals (set in Settings) and what counts toward them. Weeks run Monday to Sunday, local time. */

export interface WeeklyGoals {
  cfProblems: number;
  lcProblems: number;
  contests: number;
}

export const DEFAULT_GOALS: WeeklyGoals = { cfProblems: 10, lcProblems: 5, contests: 1 };

/** Monday 00:00 local of the week containing `d`, as epoch seconds. */
export function weekStart(d: Date): number {
  const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
  return Math.floor(monday.getTime() / 1000);
}

/** Next Monday 00:00 local (DST-safe: built from calendar fields, not +7×86400). */
export function weekEnd(start: number): number {
  const d = new Date(start * 1000);
  return Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7).getTime() / 1000);
}

export interface WeekInput {
  cfSubmissions: readonly CfSubmission[];
  lcRecentAc: readonly LcRecentAc[];
  manualSolves: readonly ManualSolve[];
  ratingHistory: readonly CfRatingChange[];
  contestResults: readonly ContestResult[];
  lcContests: readonly LcContestEntry[];
}

export interface WeekCounts {
  cfProblems: number;
  lcProblems: number;
  contests: number;
}

const inRange = (t: number, from: number, to: number) => t >= from && t < to;

/**
 * Problems are counted once, in the week of their first accepted solve (re-solving an old problem
 * doesn't count again). LeetCode adds manual marks by the day they were marked, deduped against
 * real solves. Contests: Codeforces rounds you took part in (rated or not) plus LeetCode contests.
 */
export function weekCounts(input: WeekInput, from: number, to: number): WeekCounts {
  const firstCf = new Map<string, number>();
  for (const s of input.cfSubmissions) {
    if (s.verdict !== "OK") continue;
    firstCf.set(s.problemKey, Math.min(firstCf.get(s.problemKey) ?? Infinity, s.createdAt));
  }
  for (const m of input.manualSolves) if (m.platform === "cf" && !firstCf.has(m.problemId)) firstCf.set(m.problemId, m.solvedAt);

  const firstLc = new Map<string, number>();
  for (const r of input.lcRecentAc) firstLc.set(r.slug, Math.min(firstLc.get(r.slug) ?? Infinity, r.timestamp));
  for (const m of input.manualSolves) if (m.platform === "lc" && !firstLc.has(m.problemId)) firstLc.set(m.problemId, m.solvedAt);

  const cfContests = new Set<string>();
  for (const r of input.contestResults) if (r.participated && inRange(r.startTime, from, to)) cfContests.add(r.contestId);
  // Rated rounds are dated by their rating update, which lands a few hours after the round.
  for (const h of input.ratingHistory) if (inRange(h.at, from, to)) cfContests.add(`cf:${h.contestId}`);
  const lcContests = input.lcContests.filter((c) => inRange(c.startTime, from, to)).length;

  return {
    cfProblems: [...firstCf.values()].filter((t) => inRange(t, from, to)).length,
    lcProblems: [...firstLc.values()].filter((t) => inRange(t, from, to)).length,
    contests: cfContests.size + lcContests,
  };
}
