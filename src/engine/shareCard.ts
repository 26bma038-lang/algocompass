import type { CfRatingChange, CfSubmission, CfUser, DailyActivity, LcProblemMeta, LcRecentAc, ManualSolve } from "@/data/types";
import { computeStreak, mergeActivity } from "./activity";
import { weekEnd, weekStart } from "./goals";
import { ratingChange } from "./review";
import { TOPICS, topicsForTags } from "./topics";

/**
 * "Share my week" (v1.7): the numbers on the share card, all from your synced data. Pure: the
 * feature draws them. Nothing is estimated; a number we don't have is null and the card leaves it out.
 */

export interface ShareWeek {
  /** Monday 00:00 local of this week, and now. */
  from: number;
  now: number;
  handle: string | null;
  rating: number | null;
  /** Codeforces' own rank name, e.g. "pupil" (null when unrated). */
  rank: string | null;
  /** Rating change from rated rounds this week (rounds 0: none). */
  ratingWeek: { delta: number; rounds: number };
  /** Problems first solved this week, as Weekly goals count them. */
  solves: { cf: number; lc: number; total: number };
  streak: number;
  /** The topic with the most problems solved this week (ties: the earlier topic in the topic list). */
  topTopic: { id: string; solves: number } | null;
}

export interface ShareWeekInput {
  cfUser: CfUser | null;
  ratingHistory: readonly CfRatingChange[];
  cfSubmissions: readonly CfSubmission[];
  lcRecentAc: readonly LcRecentAc[];
  lcProblems: readonly LcProblemMeta[];
  manualSolves: readonly ManualSolve[];
  activity: readonly DailyActivity[];
  now: number;
}

export function buildShareWeek(input: ShareWeekInput): ShareWeek {
  const nowDate = new Date(input.now * 1000);
  const from = weekStart(nowDate);
  const to = weekEnd(from);
  const inWeek = (t: number) => t >= from && t < to;

  // First solve per problem (the same rule as weekCounts), with the topics it carries.
  const cf = new Map<string, { at: number; topics: string[] }>();
  for (const s of input.cfSubmissions) {
    if (s.verdict !== "OK") continue;
    const prev = cf.get(s.problemKey);
    if (!prev || s.createdAt < prev.at) cf.set(s.problemKey, { at: s.createdAt, topics: topicsForTags(s.tags, "cf") });
  }
  const lcTags = new Map(input.lcProblems.map((p) => [p.slug, p.tags]));
  const lc = new Map<string, { at: number; topics: string[] }>();
  for (const r of input.lcRecentAc) {
    const prev = lc.get(r.slug);
    if (!prev || r.timestamp < prev.at) lc.set(r.slug, { at: r.timestamp, topics: topicsForTags(lcTags.get(r.slug) ?? [], "lc") });
  }
  for (const m of input.manualSolves) {
    const map = m.platform === "cf" ? cf : lc;
    if (!map.has(m.problemId)) map.set(m.problemId, { at: m.solvedAt, topics: m.topicId ? [m.topicId] : [] });
  }
  const cfWeek = [...cf.values()].filter((x) => inWeek(x.at));
  const lcWeek = [...lc.values()].filter((x) => inWeek(x.at));

  const perTopic = new Map<string, number>();
  for (const x of [...cfWeek, ...lcWeek]) for (const t of x.topics) perTopic.set(t, (perTopic.get(t) ?? 0) + 1);
  let topTopic: ShareWeek["topTopic"] = null;
  for (const t of TOPICS) {
    const n = perTopic.get(t.id) ?? 0;
    if (n > 0 && n > (topTopic?.solves ?? 0)) topTopic = { id: t.id, solves: n };
  }

  return {
    from,
    now: input.now,
    handle: input.cfUser?.handle ?? null,
    rating: input.cfUser?.rating ?? null,
    rank: input.cfUser?.rating != null ? input.cfUser.rank : null,
    ratingWeek: ratingChange(input.ratingHistory, from, to),
    solves: { cf: cfWeek.length, lc: lcWeek.length, total: cfWeek.length + lcWeek.length },
    streak: computeStreak(mergeActivity(input.activity), nowDate).current,
    topTopic,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "3 – 9 Nov 2026" (Monday to Sunday), "29 Dec – 4 Jan 2027" across a month or year. */
export function weekRangeWords(from: number): string {
  const a = new Date(from * 1000);
  const b = new Date(a.getFullYear(), a.getMonth(), a.getDate() + 6);
  const left = a.getMonth() === b.getMonth() ? `${a.getDate()}` : `${a.getDate()} ${MONTHS[a.getMonth()]}${a.getFullYear() === b.getFullYear() ? "" : ` ${a.getFullYear()}`}`;
  return `${left} – ${b.getDate()} ${MONTHS[b.getMonth()]} ${b.getFullYear()}`;
}

/** The suggested file name: algocompass-week-2026-11-09.png (the Monday). */
export function shareFileName(from: number): string {
  const d = new Date(from * 1000);
  return `algocompass-week-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}.png`;
}
