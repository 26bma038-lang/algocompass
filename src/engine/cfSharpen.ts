import type { CfProblem } from "@/data/types";
import { MIN_CF_RATING, roundToStep, SHARPEN_SPAN } from "./recommender";
import { topicsForTags } from "./topics";

/**
 * "Sharpen on Codeforces" (v1.6): after a video's sheet problems, a few real Codeforces problems
 * for its topic at your level. LeetCode is where a topic is learned and Codeforces where it's
 * sharpened, so Practice this ends there. Pure: the data layer hands in the cached problemset.
 */

/** No rating yet (or Beginner mode): Codeforces' easiest band. */
export const BEGINNER_WINDOW = { lo: 800, hi: 1200 } as const;

/** Practice this fills up to this many rows when the sheets barely cover a topic. */
export const CARD_ROWS = 5;
/** A topic with fewer sheet problems than this is "thin" (see sharpenCount). */
export const THIN_TOPIC = 3;

export interface RatingWindow {
  lo: number;
  hi: number;
}

/**
 * The rating window for your Codeforces problems: the same one Today's problems use (your rating
 * rounded to 100, up to 200 above), or 800 to 1200 with no rating or in Beginner mode.
 */
export function sharpenWindow(rating: number | null, beginner = false): RatingWindow {
  if (beginner || rating === null || !Number.isFinite(rating) || rating <= 0) return { ...BEGINNER_WINDOW };
  const lo = Math.min(Math.max(roundToStep(rating), MIN_CF_RATING), 3500 - SHARPEN_SPAN);
  return { lo, hi: lo + SHARPEN_SPAN };
}

/**
 * How many Codeforces rows a card gets: 2 normally; a thin topic (fewer than 3 problems in the
 * sheets) fills the card up to 5 rows with Codeforces problems.
 */
export function sharpenCount(sheetRows: number, sheetProblemsInTopic: number, base = 2): number {
  if (sheetProblemsInTopic < THIN_TOPIC) return Math.max(base, CARD_ROWS - sheetRows);
  return base;
}

/** The app's key for a Codeforces problem ("cf:4-A"), the same one sheets and ticks use. */
export const cfKey = (p: Pick<CfProblem, "key">) => `cf:${p.key}`;

/**
 * Codeforces problems for a topic: tags that map to it (topics.json), rating inside the window,
 * from a real round (so Open works; no April Fools "*special" problems), not solved yet (or ticked
 * on this screen: `keep`), not already on the card (`exclude`, app keys). Most solved first, so
 * the first ones are the classics everyone does; then lower rating, then the newer round.
 */
export function cfSharpen(
  problems: readonly CfProblem[],
  topic: string,
  window: RatingWindow,
  isSolved: (key: string) => boolean,
  n = 2,
  opts: { keep?: ReadonlySet<string>; exclude?: ReadonlySet<string> } = {},
): CfProblem[] {
  if (n <= 0) return [];
  const keep = opts.keep ?? new Set<string>();
  const exclude = opts.exclude ?? new Set<string>();
  return problems
    .filter((p) => {
      if (p.contestId === null || p.rating === null || p.rating < window.lo || p.rating > window.hi) return false;
      // April Fools and other special rounds aren't practice.
      if (p.tags.includes("*special")) return false;
      const key = cfKey(p);
      if (exclude.has(key) || (isSolved(key) && !keep.has(key))) return false;
      return topicsForTags(p.tags, "cf").includes(topic);
    })
    .sort((a, b) => (b.solvedCount ?? 0) - (a.solvedCount ?? 0) || a.rating! - b.rating! || b.contestId! - a.contestId!)
    .slice(0, n);
}
