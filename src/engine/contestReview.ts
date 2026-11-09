import type { CfRatingChange, ContestResult } from "@/data/types";
import { TOPIC_BY_ID, topicsForTags } from "./topics";
import { UPSOLVE_AHEAD } from "./contests";

/**
 * Contest review (v1.7): one card per Codeforces round you took part in. Pure: the data layer hands
 * in the saved results, your rating history, the problems' real tags (problemset cache) and what
 * you've solved since. Nothing here is estimated: a problem with no tags adds no topic.
 */

export interface ReviewProblem {
  index: string;
  name: string;
  rating: number | null;
  /** Solved during the round. */
  solved: boolean;
  /** Not solved in the round, but solved since. */
  fixedLater: boolean;
  /** "cf:1950-C": the key sheets, notes and the revision queue use. */
  key: string;
  contestId: number;
  /** Topic ids from the problem's real tags (empty when the cache has none). */
  topics: string[];
}

export interface MissedTopic {
  id: string;
  name: string;
  /** Unsolved problems with this topic. */
  count: number;
}

export interface ContestReview {
  id: string;
  contestId: number;
  name: string;
  startTime: number;
  rank: number | null;
  oldRating: number | null;
  newRating: number | null;
  delta: number | null;
  problems: ReviewProblem[];
  solvedCount: number;
  missedTopics: MissedTopic[];
  /** The unsolved problems just past what you solved, not fixed yet: solved A and B → C and D. */
  fixNext: ReviewProblem[];
}

const byIndex = (a: { index: string }, b: { index: string }) => a.index.localeCompare(b.index, "en", { numeric: true });

export function buildContestReviews(input: {
  results: readonly ContestResult[];
  ratingHistory: readonly CfRatingChange[];
  /** "1950-C" → tags, from the problemset cache. */
  tags: ReadonlyMap<string, readonly string[]>;
  /** Keys ("cf:1950-C") with an accepted submission or a manual mark, at any time. */
  solvedKeys: ReadonlySet<string>;
}): ContestReview[] {
  const rated = new Map(input.ratingHistory.map((h) => [h.contestId, h]));
  const out: ContestReview[] = [];
  for (const r of input.results) {
    if (!r.participated || !r.contestId.startsWith("cf:")) continue;
    const contestId = Number(r.contestId.slice(3));
    if (!Number.isInteger(contestId)) continue;
    const h = rated.get(contestId);
    const problems: ReviewProblem[] = [...r.problems].sort(byIndex).map((p) => {
      const key = `cf:${contestId}-${p.index}`;
      const topics = topicsForTags(input.tags.get(`${contestId}-${p.index}`) ?? [], "cf");
      return { index: p.index, name: p.name, rating: p.rating, solved: p.solved, fixedLater: !p.solved && input.solvedKeys.has(key), key, contestId, topics };
    });
    const solvedCount = problems.filter((p) => p.solved).length;

    const counts = new Map<string, number>();
    for (const p of problems) {
      if (p.solved) continue;
      // topicsForTags is distinct, so a problem counts once per topic.
      for (const t of p.topics) counts.set(t, (counts.get(t) ?? 0) + 1);
    }
    const missedTopics = [...counts]
      .map(([id, count]) => ({ id, name: TOPIC_BY_ID.get(id)?.name ?? id, count }))
      .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

    const fixNext = problems.slice(0, solvedCount + UPSOLVE_AHEAD).filter((p) => !p.solved && !p.fixedLater);

    out.push({
      id: r.contestId,
      contestId,
      name: h?.contestName ?? r.name,
      startTime: r.startTime,
      rank: r.rank ?? h?.rank ?? null,
      oldRating: h?.oldRating ?? null,
      newRating: h?.newRating ?? null,
      delta: h ? h.newRating - h.oldRating : null,
      problems,
      solvedCount,
      missedTopics,
      fixNext,
    });
  }
  return out.sort((a, b) => b.startTime - a.startTime);
}
