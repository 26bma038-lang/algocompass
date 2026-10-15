import type { CfRatingChange, CfSubmission, ContestResult, LcContestEntry, LcDifficulty, LcProblemMeta, LcRecentAc, LcSolvedByDifficulty, ManualSolve } from "@/data/types";
import { UNRATED_BASELINE } from "./strength";

/**
 * XP and levels. Pure and fully derived from history, so the first run computes your whole past
 * (you start at a fair level) and every later sync just recomputes.
 *
 * Sources:
 * - Codeforces solve (first AC per problem): 10 XP at your rating at the time, ×2 per +300, ×½ per −300 (2…40).
 * - LeetCode solve: Easy 5, Medium 12, Hard 25. Solves LeetCode hides (all but the latest 20) count once, undated.
 * - Contest you took part in: Codeforces 40, LeetCode 25.
 * - Upsolve (accepted on a later day than a failed try, or from the contest upsolve list): +10.
 * - Quest: its own XP (30 / 20 / 15, src/engine/quests.ts).
 * - Active day: 5, +1 per day the streak has run (up to +10).
 */

export const CF_BASE_XP = 10;
export const LC_XP: Record<LcDifficulty, number> = { Easy: 5, Medium: 12, Hard: 25 };
export const CONTEST_XP = { cf: 40, lc: 25 } as const;
export const UPSOLVE_BONUS = 10;
export const STREAK_DAY_XP = 5;
export const STREAK_BONUS_CAP = 10;

export type XpKind = "cf_solve" | "lc_solve" | "contest" | "upsolve" | "quest" | "streak";

export const XP_KIND_LABEL: Record<XpKind, string> = {
  cf_solve: "Codeforces solves",
  lc_solve: "LeetCode solves",
  contest: "Contests",
  upsolve: "Upsolves",
  quest: "Quests",
  streak: "Streak days",
};

export interface XpEvent {
  kind: XpKind;
  /** Epoch seconds; null for solves LeetCode can't date. */
  at: number | null;
  xp: number;
}

export interface XpInput {
  cfSubmissions: readonly CfSubmission[];
  ratingHistory: readonly CfRatingChange[];
  contestResults: readonly ContestResult[];
  lcRecentAc: readonly LcRecentAc[];
  lcProblems: readonly LcProblemMeta[];
  /** LeetCode's own solved totals (all solves ever), for the undated remainder. */
  lcSolved: LcSolvedByDifficulty | null;
  lcContests: readonly LcContestEntry[];
  manualSolves: readonly ManualSolve[];
  /** Difficulty for manually marked slugs that have no LeetCode metadata (curated list). */
  lcDifficulty?: ReadonlyMap<string, LcDifficulty>;
  completedQuests: readonly { completedAt: number; xp: number }[];
  /** Local YYYY-MM-DD days with any practice. */
  activeDays: readonly string[];
  /** CF problem keys queued for upsolving after a contest. */
  upsolveQueue?: ReadonlySet<string>;
}

/** Rating going into time `t` (the last change before it). */
function ratingBefore(history: readonly CfRatingChange[], t: number): number | null {
  let r: number | null = null;
  for (const h of history) if (h.at < t) r = h.newRating;
  return r;
}

/** XP for a Codeforces solve: 10 at your rating, doubling per +300 (2…40). */
export function cfSolveXp(problemRating: number | null, userRating: number | null): number {
  const ur = userRating ?? UNRATED_BASELINE;
  const pr = problemRating ?? ur - 100;
  const w = Math.min(4, Math.max(0.2, Math.pow(2, (pr - ur) / 300)));
  return Math.max(2, Math.round(CF_BASE_XP * w));
}

const localDay = (t: number) => {
  const d = new Date(t * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const noonOf = (day: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return Math.floor(new Date(y, m - 1, d, 12).getTime() / 1000);
};
const judged = (v: string | null) => v !== null && v !== "OK" && v !== "COMPILATION_ERROR" && v !== "TESTING" && v !== "SKIPPED";

export function xpEvents(input: XpInput): XpEvent[] {
  const out: XpEvent[] = [];
  const history = [...input.ratingHistory].sort((a, b) => a.at - b.at);

  // ---- Codeforces solves and upsolves ----
  const byProblem = new Map<string, CfSubmission[]>();
  for (const s of input.cfSubmissions) byProblem.set(s.problemKey, [...(byProblem.get(s.problemKey) ?? []), s]);
  for (const [key, subs] of byProblem) {
    const sorted = [...subs].sort((a, b) => a.createdAt - b.createdAt);
    const ac = sorted.find((s) => s.verdict === "OK");
    if (!ac) continue;
    out.push({ kind: "cf_solve", at: ac.createdAt, xp: cfSolveXp(ac.problemRating, ratingBefore(history, ac.createdAt)) });
    const failedEarlierDay = sorted.some((s) => s.createdAt < ac.createdAt && judged(s.verdict) && localDay(s.createdAt) !== localDay(ac.createdAt));
    if (failedEarlierDay || input.upsolveQueue?.has(key)) out.push({ kind: "upsolve", at: ac.createdAt, xp: UPSOLVE_BONUS });
  }

  // ---- LeetCode: dated solves, manual marks, then the undated remainder ----
  const meta = new Map(input.lcProblems.map((p) => [p.slug, p.difficulty]));
  const diffOf = (slug: string) => meta.get(slug) ?? input.lcDifficulty?.get(slug);
  const firstLc = new Map<string, number>();
  for (const r of input.lcRecentAc) firstLc.set(r.slug, Math.min(firstLc.get(r.slug) ?? Infinity, r.timestamp));
  for (const m of input.manualSolves) if (m.platform === "lc" && !firstLc.has(m.problemId)) firstLc.set(m.problemId, m.solvedAt);
  const dated: Record<LcDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const [slug, at] of firstLc) {
    const d = diffOf(slug) ?? "Easy";
    dated[d]++;
    out.push({ kind: "lc_solve", at, xp: LC_XP[d] });
  }
  if (input.lcSolved) {
    const rest =
      Math.max(0, input.lcSolved.easy - dated.Easy) * LC_XP.Easy +
      Math.max(0, input.lcSolved.medium - dated.Medium) * LC_XP.Medium +
      Math.max(0, input.lcSolved.hard - dated.Hard) * LC_XP.Hard;
    if (rest > 0) out.push({ kind: "lc_solve", at: null, xp: rest });
  }

  // ---- contests ----
  const cfContests = new Map<string, number>();
  for (const r of input.contestResults) if (r.participated) cfContests.set(r.contestId, r.startTime);
  for (const h of history) if (!cfContests.has(`cf:${h.contestId}`)) cfContests.set(`cf:${h.contestId}`, h.at);
  for (const at of cfContests.values()) out.push({ kind: "contest", at, xp: CONTEST_XP.cf });
  for (const c of input.lcContests) out.push({ kind: "contest", at: c.startTime, xp: CONTEST_XP.lc });

  // ---- quests ----
  for (const q of input.completedQuests) out.push({ kind: "quest", at: q.completedAt, xp: q.xp });

  // ---- streak days ----
  const days = [...new Set(input.activeDays)].sort();
  let run = 0;
  let prev: string | null = null;
  for (const day of days) {
    const expected = prev ? localDay(noonOf(prev) + 86_400) : null;
    run = expected === day ? run + 1 : 1;
    out.push({ kind: "streak", at: noonOf(day), xp: STREAK_DAY_XP + Math.min(run - 1, STREAK_BONUS_CAP) });
    prev = day;
  }

  return out;
}

// ---------- levels ----------

/** Total XP needed to reach `level`: 25 × (level − 1)^1.6. Level 10 ≈ 840 XP, 20 ≈ 2,780, 30 ≈ 5,450. */
export function xpForLevel(level: number): number {
  return level <= 1 ? 0 : Math.round(25 * Math.pow(level - 1, 1.6));
}

/** Level titles: a new one every five levels. */
export const LEVEL_TITLES: readonly { from: number; title: string }[] = [
  { from: 1, title: "Novice Coder" },
  { from: 5, title: "Loop Apprentice" },
  { from: 10, title: "Pattern Hunter" },
  { from: 15, title: "Greedy Adept" },
  { from: 20, title: "Algorithm Smith" },
  { from: 25, title: "Graph Ranger" },
  { from: 30, title: "DP Alchemist" },
  { from: 35, title: "Segment Sage" },
  { from: 40, title: "Proof Knight" },
  { from: 50, title: "Code Archmage" },
  { from: 60, title: "Legend of the Judge" },
];

export function titleForLevel(level: number): string {
  let t = LEVEL_TITLES[0]!.title;
  for (const x of LEVEL_TITLES) if (level >= x.from) t = x.title;
  return t;
}

export interface LevelInfo {
  /** Null until any XP exists (the level badge stays unlit). */
  level: number | null;
  title: string | null;
  totalXp: number;
  /** XP into the current level, and the size of the level. */
  intoLevel: number;
  toNext: number;
  /** 0–1 toward the next level. */
  progress: number;
}

export function levelForXp(totalXp: number): LevelInfo {
  if (totalXp <= 0) return { level: null, title: null, totalXp: 0, intoLevel: 0, toNext: xpForLevel(2), progress: 0 };
  let level = 1;
  while (xpForLevel(level + 1) <= totalXp) level++;
  const floor = xpForLevel(level);
  const toNext = xpForLevel(level + 1) - floor;
  const intoLevel = totalXp - floor;
  return { level, title: titleForLevel(level), totalXp, intoLevel, toNext, progress: intoLevel / toNext };
}

export interface XpSummary extends LevelInfo {
  /** XP earned today, by source (only sources with XP). */
  today: { kind: XpKind; xp: number }[];
  todayTotal: number;
}

/** Totals plus today's breakdown (`from`–`to` = today's local bounds). */
export function summarizeXp(events: readonly XpEvent[], from: number, to: number): XpSummary {
  const total = events.reduce((n, e) => n + e.xp, 0);
  const byKind = new Map<XpKind, number>();
  for (const e of events) if (e.at !== null && e.at >= from && e.at < to) byKind.set(e.kind, (byKind.get(e.kind) ?? 0) + e.xp);
  const today = [...byKind].map(([kind, xp]) => ({ kind, xp })).sort((a, b) => b.xp - a.xp);
  return { ...levelForXp(total), today, todayTotal: today.reduce((n, t) => n + t.xp, 0) };
}
