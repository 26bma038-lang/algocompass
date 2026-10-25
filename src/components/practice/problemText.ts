import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import { LC_LISTS } from "@/data/catalog";
import type { Rec, UpsolveRec } from "@/engine/recommender";
import { verdictLabel } from "@/engine/topicProblems";
import { TOPIC_BY_ID } from "@/engine/topics";

/**
 * A recommended problem in words: its title, link and source line. Kept apart from ProblemRow (and
 * its menu) so Today's "Do this next" doesn't pull the dropdown into the main chunk.
 */

export type RowProblem = Rec | UpsolveRec;

const monthYear = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export function title(p: RowProblem) {
  return p.platform === "lc" ? p.title : p.name;
}

export function url(p: RowProblem): string | null {
  return p.platform === "lc" ? lcProblemUrl(p.id) : cfProblemUrl(p.contestId, p.index);
}

/** What the row's second line says: where the problem comes from, in plain words. */
export function meta(p: RowProblem): string {
  if (p.platform === "lc") {
    const list = LC_LISTS[p.list]?.name ?? "Curated";
    const topic = TOPIC_BY_ID.get(p.topicId)?.name.toLowerCase();
    return p.onPath && topic ? `Step ${p.order} of the ${topic} path, ${list}` : list;
  }
  if ("attempts" in p) {
    if (p.attempts === 0) return `Unsolved in ${p.fromContest ?? "a contest you took part in"}`;
    return `${plural(p.attempts, "try", "tries")}, last ${verdictLabel(p.lastVerdict).toLowerCase()}, ${monthYear(p.lastAttemptAt)}`;
  }
  return p.contestStart ? `From a ${monthYear(p.contestStart)} round` : `Contest ${p.contestId}`;
}
