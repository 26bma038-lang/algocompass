/**
 * Revision queue (v1.7): a solved problem comes back after 7 days and again after 30 (3 days
 * instead of 7 when you said you needed help). Pure: the data layer hands in the solves, the saved
 * records and the clock. Only solves from `since` on are scheduled, so the first launch never
 * dumps a whole solve history into the queue.
 */

const DAY = 86_400;
export const FIRST_REVIEW_DAYS = 7;
export const HELP_REVIEW_DAYS = 3;
export const SECOND_REVIEW_DAYS = 30;
/** A review you called "still hard" comes back this soon. */
export const STILL_HARD_DAYS = 3;
/** The most due problems ever shown at once, so a missed month doesn't bury the day's problems. */
export const MAX_DUE = 5;

export interface RevisionSolve {
  /** "lc:two-sum" / "cf:4-A": the same key sheets and notes use. */
  key: string;
  platform: "cf" | "lc";
  problemId: string;
  title: string;
  topicId: string | null;
  /** First solved, epoch seconds. */
  at: number;
}

export interface RevisionRecord {
  key: string;
  neededHelp: boolean;
  /** Reviews done: 0 none, 1 the first, 2 finished. */
  stage: number;
  /** Overrides the schedule when set. */
  nextAt: number | null;
}

export interface DueRevision extends RevisionSolve {
  dueAt: number;
  neededHelp: boolean;
  /** Whole days past due (0 = due today). */
  overdueDays: number;
  /** 0 = the first return, 1 = the 30-day one. */
  stage: 0 | 1;
}

/** When the next review of a solve is due, or null once both are done. */
export function nextDueAt(solvedAt: number, rec: Pick<RevisionRecord, "neededHelp" | "stage" | "nextAt"> | undefined): number | null {
  const stage = rec?.stage ?? 0;
  if (stage >= 2) return null;
  if (rec?.nextAt != null) return rec.nextAt;
  if (stage === 1) return solvedAt + SECOND_REVIEW_DAYS * DAY;
  return solvedAt + (rec?.neededHelp ? HELP_REVIEW_DAYS : FIRST_REVIEW_DAYS) * DAY;
}

/** Due now, most overdue first (ties by title), at most `limit`. Solves before `since` are never scheduled. */
export function dueRevisions(input: {
  solves: readonly RevisionSolve[];
  records: readonly RevisionRecord[];
  now: number;
  since: number;
  limit?: number;
}): DueRevision[] {
  const recs = new Map(input.records.map((r) => [r.key, r]));
  const out: DueRevision[] = [];
  for (const s of input.solves) {
    if (s.at < input.since) continue;
    const rec = recs.get(s.key);
    const dueAt = nextDueAt(s.at, rec);
    if (dueAt === null || dueAt > input.now) continue;
    out.push({
      ...s,
      dueAt,
      neededHelp: rec?.neededHelp ?? false,
      overdueDays: Math.floor((input.now - dueAt) / DAY),
      stage: (rec?.stage ?? 0) >= 1 ? 1 : 0,
    });
  }
  out.sort((a, b) => a.dueAt - b.dueAt || a.title.localeCompare(b.title));
  return out.slice(0, input.limit ?? MAX_DUE);
}

/**
 * The record after a review. Fine: the next stage (a first review that comes after the 30-day mark
 * finishes it). Still hard: same stage, asked again in 3 days, and flagged as needing help.
 */
export function afterReview(solvedAt: number, prev: RevisionRecord | undefined, key: string, now: number, stillHard: boolean): RevisionRecord {
  const stage = prev?.stage ?? 0;
  if (stillHard) return { key, neededHelp: true, stage, nextAt: now + STILL_HARD_DAYS * DAY };
  const finished = stage >= 1 || now >= solvedAt + SECOND_REVIEW_DAYS * DAY;
  return { key, neededHelp: prev?.neededHelp ?? false, stage: finished ? 2 : 1, nextAt: null };
}

/** "Solved 8 days ago" for a due problem. */
export function solvedAgoWords(solvedAt: number, now: number): string {
  const days = Math.max(0, Math.floor((now - solvedAt) / DAY));
  if (days === 0) return "Solved today";
  if (days === 1) return "Solved yesterday";
  return `Solved ${days} days ago`;
}
