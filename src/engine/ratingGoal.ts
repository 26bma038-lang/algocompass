import type { CfRatingChange } from "@/data/types";
import { weekEnd, weekStart } from "./goals";

/**
 * Rating goal plan (v1.7): a target Codeforces rating by a date, turned into weekly targets from your
 * own history. Pure. Every number shown comes from your rating history and solves; where there's not
 * enough history to judge, the plan says so instead of guessing.
 */

const DAY = 86_400;
const WEEK = 7 * DAY;
const MONTH = 30.44 * DAY;
/** Weeks of solves the "lately" numbers look at. */
export const RECENT_WEEKS = 8;
/** The window your rating history is scanned with for your best climb. */
const BEST_WINDOW = 90 * DAY;
/** With no rating yet, the practice band starts here (Codeforces' lowest problem rating). */
const UNRATED_FLOOR = 800;
/** A first rated round has old rating 0 on Codeforces: its own result is the starting point, not a gain. */
const baseOf = (h: CfRatingChange) => (h.oldRating > 0 ? h.oldRating : h.newRating);

export interface RatingGoal {
  target: number;
  /** End of the target day, epoch seconds. */
  by: number;
  setAt: number;
  /** Your rating when you set it (null: unrated then). */
  startRating: number | null;
}

/** Codeforces problems you solved: first accepted time and the problem's rating. */
export interface RatedSolve {
  at: number;
  rating: number | null;
}

/** Practice band: 100 to 300 above your rating, in Codeforces' 100-point steps (800 to 1000 unrated). */
export function practiceBand(rating: number | null): { lo: number; hi: number } {
  if (rating === null) return { lo: UNRATED_FLOOR, hi: UNRATED_FLOOR + 200 };
  const base = Math.floor(rating / 100) * 100;
  return { lo: Math.max(UNRATED_FLOOR, base + 100), hi: Math.max(UNRATED_FLOOR + 200, base + 300) };
}

/** Your rating at a moment, from the history (null before your first rated round). */
export function ratingAt(history: readonly CfRatingChange[], t: number): number | null {
  let r: number | null = null;
  for (const h of [...history].sort((a, b) => a.at - b.at)) {
    if (h.at > t) break;
    r = h.newRating;
  }
  return r;
}

export interface HistoryPace {
  /** Rated rounds a month over the last 90 days. */
  contestsPerMonth: number;
  /** Rating gained a month over your last 6 months of rounds (null with fewer than 2 rounds). */
  gainPerMonth: number | null;
  /** Your best 90-day climb, per month, and how many rounds a month you took then (null: history shorter than 90 days). */
  best: { gainPerMonth: number; contestsPerMonth: number } | null;
  /** Codeforces problems you solved a week, over the last 8 weeks. */
  solvesPerWeek: number;
}

export function historyPace(history: readonly CfRatingChange[], solves: readonly RatedSolve[], now: number): HistoryPace {
  const h = [...history].sort((a, b) => a.at - b.at);
  const contestsPerMonth = h.filter((x) => x.at > now - 90 * DAY).length / (90 * DAY / MONTH);

  let gainPerMonth: number | null = null;
  const recent = h.filter((x) => x.at > now - 182 * DAY);
  if (recent.length >= 2) {
    const first = recent[0]!;
    const last = recent[recent.length - 1]!;
    const span = Math.max(last.at - first.at, MONTH);
    gainPerMonth = ((last.newRating - baseOf(first)) / span) * MONTH;
  }

  let best: HistoryPace["best"] = null;
  if (h.length >= 2 && h[h.length - 1]!.at - h[0]!.at >= BEST_WINDOW) {
    for (let i = 0; i < h.length; i++) {
      const start = h[i]!;
      const inWindow = h.filter((x) => x.at >= start.at && x.at <= start.at + BEST_WINDOW);
      const end = inWindow[inWindow.length - 1]!;
      if (end.at - start.at < BEST_WINDOW / 2) continue; // too short a stretch to call a pace
      const gain = ((end.newRating - baseOf(start)) / BEST_WINDOW) * MONTH;
      if (!best || gain > best.gainPerMonth) best = { gainPerMonth: gain, contestsPerMonth: inWindow.length / (BEST_WINDOW / MONTH) };
    }
  }

  const solvesPerWeek = solves.filter((s) => s.at > now - RECENT_WEEKS * WEEK && s.at <= now).length / RECENT_WEEKS;
  return { contestsPerMonth, gainPerMonth, best, solvesPerWeek };
}

export type PlanVerdict =
  | { kind: "reached" }
  | { kind: "date-passed" }
  /** Within what you've managed before. */
  | { kind: "realistic" }
  /** Faster than your best climb so far: `suggestedBy` is when your best pace would get there. */
  | { kind: "unrealistic"; neededPerMonth: number; bestPerMonth: number; suggestedBy: number }
  /** Too little rated history to compare. */
  | { kind: "unknown" };

export interface RatingPlan {
  current: number | null;
  gap: number;
  weeksLeft: number;
  neededPerMonth: number;
  band: { lo: number; hi: number };
  /** Problems a week in the band. */
  problemsPerWeek: number;
  contestsPerMonth: number;
  pace: HistoryPace;
  verdict: PlanVerdict;
}

/**
 * The plan. Contests a month: what you took during your best climb (or lately, whichever is more, rounded),
 * at least 2; with no history, 4 (one a week). Problems a week in the band: your recent weekly solves,
 * scaled by how much faster than your best climb the goal asks you to go (×0.75 to ×1.5), 3 to 30.
 */
export function buildPlan(goal: RatingGoal, current: number | null, history: readonly CfRatingChange[], solves: readonly RatedSolve[], now: number): RatingPlan {
  const pace = historyPace(history, solves, now);
  const gap = goal.target - (current ?? 0);
  const weeksLeft = Math.max(0, (goal.by - now) / WEEK);
  const monthsLeft = (goal.by - now) / MONTH;
  const neededPerMonth = monthsLeft > 0 ? gap / monthsLeft : Number.POSITIVE_INFINITY;
  const reference = pace.best?.gainPerMonth ?? null;

  let verdict: PlanVerdict;
  if (current !== null && gap <= 0) verdict = { kind: "reached" };
  else if (goal.by <= now) verdict = { kind: "date-passed" };
  else if (current === null || reference === null || reference <= 0) verdict = { kind: "unknown" };
  else if (neededPerMonth <= reference) verdict = { kind: "realistic" };
  else verdict = { kind: "unrealistic", neededPerMonth, bestPerMonth: reference, suggestedBy: now + Math.ceil((gap / reference) * MONTH) };

  const contestsPerMonth = history.length === 0 ? 4 : Math.max(2, Math.round(Math.max(pace.best?.contestsPerMonth ?? 0, pace.contestsPerMonth)));
  const push = reference && reference > 0 && Number.isFinite(neededPerMonth) ? Math.min(1.5, Math.max(0.75, neededPerMonth / reference)) : 1;
  const problemsPerWeek = Math.min(30, Math.max(3, Math.round(pace.solvesPerWeek * push)));

  return { current, gap, weeksLeft, neededPerMonth, band: practiceBand(current), problemsPerWeek, contestsPerMonth, pace, verdict };
}

export interface PlanWeek {
  start: number;
  band: { lo: number; hi: number };
  /** Problems solved that week inside the week's band (from your rating at its start). */
  inBand: number;
  target: number;
}

/** Weeks since the goal was set (newest first, at most `limit`), each against its own band. */
export function planWeeks(goal: RatingGoal, history: readonly CfRatingChange[], solves: readonly RatedSolve[], target: number, now: number, limit = 6): PlanWeek[] {
  const out: PlanWeek[] = [];
  let start = weekStart(new Date(now * 1000));
  const first = weekStart(new Date(goal.setAt * 1000));
  while (start >= first && out.length < limit) {
    const end = weekEnd(start);
    const band = practiceBand(ratingAt(history, start) ?? goal.startRating);
    const inBand = solves.filter((s) => s.at >= start && s.at < end && s.rating !== null && s.rating >= band.lo && s.rating <= band.hi).length;
    out.push({ start, band, inBand, target });
    start = weekStart(new Date((start - DAY) * 1000));
  }
  return out;
}

/** Rated rounds since the start of this calendar month. */
export function contestsThisMonth(history: readonly CfRatingChange[], now: number): number {
  const d = new Date(now * 1000);
  const monthStart = Math.floor(new Date(d.getFullYear(), d.getMonth(), 1).getTime() / 1000);
  return history.filter((h) => h.at >= monthStart && h.at <= now).length;
}

/** Where a straight line from your rating when you set the goal to the target says you'd be now. */
export function planLineNow(goal: RatingGoal, now: number): number | null {
  if (goal.startRating === null || goal.by <= goal.setAt) return null;
  const share = Math.min(1, Math.max(0, (now - goal.setAt) / (goal.by - goal.setAt)));
  return Math.round(goal.startRating + (goal.target - goal.startRating) * share);
}
