import type { CfSubmission, CfUser, DailyActivity, LcProfile, LcRecentAc } from "@/data/types";
import { computeStreak, mergeActivity } from "./activity";
import { weekStart } from "./goals";

/**
 * Friends (v1.7): you and the people you added, side by side, from public profiles only. Pure: the
 * data layer reads them through the adapters and hands the pieces in. No server, no ranking table.
 */

export interface PersonStats {
  cf: {
    handle: string;
    rating: number | null;
    maxRating: number | null;
    /** Problems first solved this week (Monday to now). */
    solvesThisWeek: number;
    /** The submissions we read don't reach back to Monday, so the count may be short. */
    partial: boolean;
  } | null;
  lc: {
    username: string;
    solved: number;
    /** Accepted problems this week among the latest ones LeetCode shows. */
    solvesThisWeek: number;
    /** LeetCode only shows the latest 20 accepted: all 20 are from this week, so there may be more. */
    capped: boolean;
  } | null;
  /** Days in a row with a solve on Codeforces or a submission on LeetCode (as your own streak counts). */
  streak: number;
  activeToday: boolean;
}

/** How many recent LeetCode accepted submissions LeetCode lets anyone read. */
export const LC_RECENT_LIMIT = 20;

export function personStats(input: {
  cf: { user: CfUser; submissions: readonly CfSubmission[]; complete: boolean } | null;
  lc: { profile: LcProfile; recent: readonly LcRecentAc[] } | null;
  activity: readonly DailyActivity[];
  now: number;
}): PersonStats {
  const from = weekStart(new Date(input.now * 1000));
  let cf: PersonStats["cf"] = null;
  if (input.cf) {
    const first = new Map<string, number>();
    for (const s of input.cf.submissions) if (s.verdict === "OK") first.set(s.problemKey, Math.min(first.get(s.problemKey) ?? Infinity, s.createdAt));
    const oldest = input.cf.submissions.reduce((m, s) => Math.min(m, s.createdAt), Infinity);
    cf = {
      handle: input.cf.user.handle,
      rating: input.cf.user.rating,
      maxRating: input.cf.user.maxRating,
      solvesThisWeek: [...first.values()].filter((t) => t >= from && t <= input.now).length,
      partial: !input.cf.complete && oldest > from,
    };
  }
  let lc: PersonStats["lc"] = null;
  if (input.lc) {
    const week = new Set(input.lc.recent.filter((r) => r.timestamp >= from && r.timestamp <= input.now).map((r) => r.slug));
    lc = {
      username: input.lc.profile.username,
      solved: input.lc.profile.solved.all,
      solvesThisWeek: week.size,
      capped: input.lc.recent.length >= LC_RECENT_LIMIT && input.lc.recent.every((r) => r.timestamp >= from),
    };
  }
  const streak = computeStreak(mergeActivity(input.activity), new Date(input.now * 1000));
  return { cf, lc, streak: streak.current, activeToday: streak.activeToday };
}

/** "5", "20+", "3+" for solves this week. */
export function weekSolvesWords(s: PersonStats): { total: number; plus: boolean } | null {
  if (!s.cf && !s.lc) return null;
  return { total: (s.cf?.solvesThisWeek ?? 0) + (s.lc?.solvesThisWeek ?? 0), plus: !!(s.cf?.partial || s.lc?.capped) };
}

/** Handles as typed: trimmed, and an @ or a profile URL pasted by mistake reduced to the name. */
export function cleanHandle(raw: string): string {
  const s = raw.trim().replace(/^@/, "");
  const url = /(?:codeforces\.com\/profile|leetcode\.com(?:\/u)?)\/([^/?#\s]+)/i.exec(s);
  return (url ? url[1]! : s).trim();
}
