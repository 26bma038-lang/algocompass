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

// ---------- Recommender ----------

/** Feedback buttons on a recommended problem. */
export type FeedbackKind = "skip" | "too_easy" | "too_hard";

export interface RecFeedback {
  platform: Platform;
  /** CF problem key (`2050-B`) or LC slug. */
  problemId: string;
  topicId: string;
  kind: FeedbackKind;
  createdAt: number;
}

/** One slot of the Mix of the Day. Only ids are stored; details are resolved against the cache. */
export interface MixItem {
  platform: Platform;
  problemId: string;
  topicId: string;
}

export interface DailyMix {
  day: string; // local YYYY-MM-DD
  generatedAt: number;
  items: MixItem[];
}

// ---------- Quests, contests (Phase 7) ----------

/** A problem you marked solved by hand (LeetCode hides all but your 20 latest solves). */
export interface ManualSolve {
  platform: Platform;
  problemId: string;
  title: string;
  topicId: string | null;
  solvedAt: number;
}

export interface ContestProblemResult {
  index: string;
  name: string;
  rating: number | null;
  solved: boolean;
}

/** Your standing in one finished Codeforces contest. */
export interface ContestResult {
  contestId: string; // 'cf:<id>'
  name: string;
  startTime: number;
  durationSeconds: number;
  participated: boolean;
  rank: number | null;
  solved: number | null;
  total: number | null;
  problems: ContestProblemResult[];
  syncedAt: number;
}

/** contest.standings, normalized: the problem list plus your row (null when you didn't take part). */
export interface CfContestStanding {
  contestId: number;
  problems: CfProblem[];
  me: { rank: number; participantType: string; solvedIndices: string[] } | null;
}

export interface UpsolveQueueItem {
  problemKey: string;
  contestId: number;
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
  contestName: string;
  addedAt: number;
}

export type QuestKind = "cf_topic" | "lc_topic" | "any_solves";

/** One daily quest, generated from the Mix of the Day. */
export interface QuestSpec {
  /** Stable within a day: one quest per kind. */
  id: string;
  kind: QuestKind;
  title: string;
  target: number;
  topicId: string | null;
  /** Codeforces quests: a solve counts when rated at least this. */
  minRating: number | null;
  /** The mix problems this quest points at (they always count). */
  problemIds: string[];
  xp: number;
}

export interface StoredQuest extends QuestSpec {
  completedAt: number | null;
}
