/**
 * Shared domain types. Adapters normalize platform responses into these; nothing above
 * src/adapters ever sees a Codeforces or LeetCode response shape.
 * Times are Unix epoch seconds unless noted.
 */

export type Platform = "cf" | "lc";

// ---------- Codeforces ----------

export interface CfUser {
  handle: string;
  rating: number | null; // null when unrated
  maxRating: number | null;
  rank: string | null; // e.g. "newbie"
  maxRank: string | null;
  avatar: string | null;
  registeredAt: number;
}

export interface CfRatingChange {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  at: number; // ratingUpdateTimeSeconds
}

export type CfVerdict =
  | "OK"
  | "WRONG_ANSWER"
  | "TIME_LIMIT_EXCEEDED"
  | "MEMORY_LIMIT_EXCEEDED"
  | "RUNTIME_ERROR"
  | "COMPILATION_ERROR"
  | (string & {});

export interface CfSubmission {
  id: number;
  /** Stable problem key: `${contestId}-${index}` (or `gym-…` / `ps-…` for odd sources). */
  problemKey: string;
  contestId: number | null;
  problemIndex: string;
  problemName: string;
  problemRating: number | null;
  tags: string[];
  verdict: CfVerdict | null; // null while testing
  createdAt: number;
  language: string;
}

export interface CfProblem {
  key: string;
  contestId: number | null;
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
  solvedCount: number | null;
}

// ---------- LeetCode ----------

export interface LcSolvedByDifficulty {
  easy: number;
  medium: number;
  hard: number;
  all: number;
}

export interface LcProfile {
  username: string;
  ranking: number | null;
  solved: LcSolvedByDifficulty;
  /** Total questions available on the site, per difficulty. */
  totals: LcSolvedByDifficulty;
}

export type LcTagLevel = "fundamental" | "intermediate" | "advanced";

export interface LcTagCount {
  slug: string;
  name: string;
  level: LcTagLevel;
  solved: number;
}

export interface LcContestRanking {
  rating: number;
  attended: number;
  globalRanking: number | null;
  topPercentage: number | null;
}

export interface LcContestEntry {
  title: string;
  startTime: number;
  rating: number;
  ranking: number;
  solved: number;
  total: number;
}

export interface LcRecentAc {
  id: string;
  title: string;
  slug: string;
  timestamp: number;
}

export type LcDifficulty = "Easy" | "Medium" | "Hard";

export interface LcProblemMeta {
  slug: string;
  difficulty: LcDifficulty;
  tags: string[];
}

/** Submissions per UTC day start (epoch seconds), straight from LeetCode's calendar. */
export type LcCalendar = Record<number, number>;

// ---------- Cross-platform ----------

export type ContestPhase = "upcoming" | "running" | "finished";

export interface Contest {
  /** `cf:<id>` or `lc:<slug>` */
  id: string;
  platform: Platform;
  name: string;
  startTime: number;
  durationSeconds: number;
  phase: ContestPhase;
  url: string;
}

export interface DailyActivity {
  day: string; // YYYY-MM-DD (UTC for LeetCode calendar days, local for CF)
  platform: Platform;
  count: number;
}

export type SyncStatus = "ok" | "error" | "skipped";

export interface SyncLogEntry {
  id?: number;
  platform: Platform;
  kind: string;
  startedAt: number;
  finishedAt: number;
  status: SyncStatus;
  message: string | null;
  items: number;
}
