import type { CfRatingChange, CfSubmission, ContestResult, LcContestEntry, LcDifficulty, LcProblemMeta, LcRecentAc, LcSolvedByDifficulty, ManualSolve } from "@/data/types";
import type { TopicStrength } from "./strength";

/**
 * Achievements. Pure: every rule reads your history and says whether it's earned, when (if the
 * history can date it) and how far along you are. The first run evaluates your whole past; the
 * data layer records unlocks so they never re-lock.
 */

export type AchievementCategory = "Consistency" | "Codeforces" | "LeetCode" | "Topics" | "Fun";
export const CATEGORIES: readonly AchievementCategory[] = ["Consistency", "Codeforces", "LeetCode", "Topics", "Fun"];

export type AchievementIcon =
  | "flame" | "calendar" | "scroll" | "crown" | "swords" | "trending" | "medal" | "target" | "repeat"
  | "hash" | "book" | "brain" | "tree" | "compass" | "moon" | "sunrise" | "zap" | "sparkles" | "undo";

export interface AchievementDef {
  id: string;
  category: AchievementCategory;
  title: string;
  /** How to earn it, shown on the locked silhouette. */
  hint: string;
  icon: AchievementIcon;
}

export interface AchievementProgress {
  value: number;
  target: number;
  /** Short label for the meter: "Best streak", "Contests". */
  label: string;
}

export interface AchievementState {
  id: string;
  unlocked: boolean;
  /** When it was earned, if history can say (null = earned before tracking, or not yet). */
  at: number | null;
  progress: AchievementProgress | null;
}

export interface AchievementInput {
  cfSubmissions: readonly CfSubmission[];
  ratingHistory: readonly CfRatingChange[];
  contestResults: readonly ContestResult[];
  /** Highest CF rating ever (from the profile). */
  cfMaxRating: number | null;
  lcRecentAc: readonly LcRecentAc[];
  lcProblems: readonly LcProblemMeta[];
  lcSolved: LcSolvedByDifficulty | null;
  lcContests: readonly LcContestEntry[];
  manualSolves: readonly ManualSolve[];
  lcDifficulty?: ReadonlyMap<string, LcDifficulty>;
  /** Every day that had quests: how many, how many done, and when the last one finished. */
  questDays: readonly { day: string; total: number; done: number; lastAt: number | null }[];
  activeDays: readonly string[];
  /** Current topic report (null before any data). */
  topics: readonly TopicStrength[] | null;
  /** Topics common at your rating you've never solved (null before any data). */
  blindSpots: number | null;
  upsolveQueue?: ReadonlySet<string>;
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // Consistency
  { id: "first_quest", category: "Consistency", title: "First Goal", hint: "Finish your first daily goal.", icon: "scroll" },
  { id: "streak_3", category: "Consistency", title: "Kindling", hint: "Practice 3 days in a row.", icon: "flame" },
  { id: "streak_7", category: "Consistency", title: "Week of Fire", hint: "Practice 7 days in a row.", icon: "flame" },
  { id: "streak_30", category: "Consistency", title: "Unbroken Month", hint: "Practice 30 days in a row.", icon: "flame" },
  { id: "streak_100", category: "Consistency", title: "Eternal Flame", hint: "Practice 100 days in a row.", icon: "crown" },
  { id: "active_100", category: "Consistency", title: "Hundred Days", hint: "Practice on 100 different days.", icon: "calendar" },
  { id: "perfect_weeks_4", category: "Consistency", title: "Flawless Month", hint: "Finish every goal, every day, for a full week. Four times.", icon: "sparkles" },
  // Codeforces
  { id: "cf_first_contest", category: "Codeforces", title: "Into the Arena", hint: "Take part in your first Codeforces round.", icon: "swords" },
  { id: "cf_contests_10", category: "Codeforces", title: "Arena Regular", hint: "Take part in 10 Codeforces rounds.", icon: "swords" },
  { id: "cf_contests_25", category: "Codeforces", title: "Veteran", hint: "Take part in 25 Codeforces rounds.", icon: "medal" },
  { id: "cf_above_rating", category: "Codeforces", title: "Punching Up", hint: "Solve a problem rated above your rating.", icon: "trending" },
  { id: "cf_plus_50", category: "Codeforces", title: "Big Climb", hint: "Gain 50 or more rating in one round.", icon: "trending" },
  { id: "cf_first_upsolve", category: "Codeforces", title: "Second Wind", hint: "Solve a problem on a later day after failing it.", icon: "undo" },
  { id: "cf_solved_100", category: "Codeforces", title: "Century", hint: "Solve 100 Codeforces problems.", icon: "hash" },
  { id: "cf_pupil", category: "Codeforces", title: "Pupil", hint: "Reach a 1200 rating.", icon: "crown" },
  { id: "cf_specialist", category: "Codeforces", title: "Specialist", hint: "Reach a 1400 rating.", icon: "crown" },
  { id: "cf_expert", category: "Codeforces", title: "Expert", hint: "Reach a 1600 rating.", icon: "crown" },
  // LeetCode
  { id: "lc_first_medium", category: "LeetCode", title: "Medium Rare", hint: "Solve a Medium on LeetCode.", icon: "book" },
  { id: "lc_first_hard", category: "LeetCode", title: "Hard Mode", hint: "Solve a Hard on LeetCode.", icon: "book" },
  { id: "lc_50", category: "LeetCode", title: "Fifty Lessons", hint: "Solve 50 LeetCode problems.", icon: "hash" },
  { id: "lc_100", category: "LeetCode", title: "Hundred Lessons", hint: "Solve 100 LeetCode problems.", icon: "hash" },
  { id: "lc_first_contest", category: "LeetCode", title: "Weekly Warrior", hint: "Take part in a LeetCode contest.", icon: "swords" },
  // Topics
  { id: "topic_strong", category: "Topics", title: "Specialty", hint: "Bring a topic to Strong.", icon: "brain" },
  { id: "topic_mastered", category: "Topics", title: "Mastery", hint: "Master a topic (needs a solve at or above your rating).", icon: "crown" },
  { id: "topics_unlocked_10", category: "Topics", title: "Branching Out", hint: "Unlock 10 topics in Progress → Topics.", icon: "tree" },
  { id: "blind_spots_tried", category: "Topics", title: "No Blind Spots", hint: "Solve a problem in every topic common at your rating.", icon: "compass" },
  // Fun
  { id: "night_owl", category: "Fun", title: "Night Owl", hint: "Get an accepted solve between midnight and 4 am.", icon: "moon" },
  { id: "early_bird", category: "Fun", title: "Early Bird", hint: "Get an accepted solve between 5 and 7 am.", icon: "sunrise" },
  { id: "five_in_day", category: "Fun", title: "Five Alive", hint: "Solve 5 problems in one day.", icon: "zap" },
  { id: "weekend_warrior", category: "Fun", title: "Weekend Warrior", hint: "Solve something on both days of one weekend.", icon: "calendar" },
  { id: "comeback", category: "Fun", title: "The Comeback", hint: "Solve again after two weeks or more away.", icon: "repeat" },
];

export const ACHIEVEMENT_BY_ID = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

// ---------- helpers ----------

const DAY = 86_400;
const localDay = (t: number) => {
  const d = new Date(t * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
const dayDate = (day: string) => {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d, 12);
};
const noonOf = (day: string) => Math.floor(dayDate(day).getTime() / 1000);
const nextDay = (day: string) => localDay(noonOf(day) + DAY);
const judgedFail = (v: string | null) => v !== null && v !== "OK" && v !== "COMPILATION_ERROR" && v !== "TESTING" && v !== "SKIPPED";

function ratingBefore(history: readonly CfRatingChange[], t: number): number | null {
  let r: number | null = null;
  for (const h of history) if (h.at < t) r = h.newRating;
  return r;
}

/** The `n`th item's time in an ascending list, or null. */
const nth = (times: readonly number[], n: number) => (times.length >= n ? times[n - 1]! : null);

/** First accepted solve per problem, across platforms, with whatever is known about it. */
interface Solve {
  platform: "cf" | "lc";
  at: number;
  rating: number | null;
  difficulty: LcDifficulty | null;
}

function solveTimeline(input: AchievementInput): Solve[] {
  const out: Solve[] = [];
  const firstCf = new Map<string, CfSubmission>();
  for (const s of input.cfSubmissions) {
    if (s.verdict !== "OK") continue;
    const prev = firstCf.get(s.problemKey);
    if (!prev || s.createdAt < prev.createdAt) firstCf.set(s.problemKey, s);
  }
  for (const s of firstCf.values()) out.push({ platform: "cf", at: s.createdAt, rating: s.problemRating, difficulty: null });
  const meta = new Map(input.lcProblems.map((p) => [p.slug, p.difficulty]));
  const firstLc = new Map<string, number>();
  for (const r of input.lcRecentAc) firstLc.set(r.slug, Math.min(firstLc.get(r.slug) ?? Infinity, r.timestamp));
  for (const m of input.manualSolves) if (m.platform === "lc" && !firstLc.has(m.problemId)) firstLc.set(m.problemId, m.solvedAt);
  for (const [slug, at] of firstLc) out.push({ platform: "lc", at, rating: null, difficulty: meta.get(slug) ?? input.lcDifficulty?.get(slug) ?? null });
  return out.sort((a, b) => a.at - b.at);
}

/** Times a run of consecutive active days first reached `n`; also the longest run. */
function streakInfo(days: readonly string[]) {
  const sorted = [...new Set(days)].sort();
  const reached = new Map<number, number>();
  let run = 0;
  let prev: string | null = null;
  let longest = 0;
  for (const day of sorted) {
    run = prev !== null && nextDay(prev) === day ? run + 1 : 1;
    if (!reached.has(run)) reached.set(run, noonOf(day));
    longest = Math.max(longest, run);
    prev = day;
  }
  return { longest, reachedAt: (n: number) => reached.get(n) ?? null, count: sorted.length, sorted };
}

/** First accepted solve on a later day than a failed try, or of a problem queued for upsolving. */
export function firstUpsolveAt(subs: readonly CfSubmission[], queue?: ReadonlySet<string>): number | null {
  const byProblem = new Map<string, CfSubmission[]>();
  for (const s of subs) byProblem.set(s.problemKey, [...(byProblem.get(s.problemKey) ?? []), s]);
  let first: number | null = null;
  for (const [key, list] of byProblem) {
    const sorted = [...list].sort((a, b) => a.createdAt - b.createdAt);
    const ac = sorted.find((s) => s.verdict === "OK");
    if (!ac) continue;
    const upsolved = queue?.has(key) || sorted.some((s) => s.createdAt < ac.createdAt && judgedFail(s.verdict) && localDay(s.createdAt) !== localDay(ac.createdAt));
    if (upsolved && (first === null || ac.createdAt < first)) first = ac.createdAt;
  }
  return first;
}

// ---------- evaluation ----------

type Rule = (input: AchievementInput, ctx: Ctx) => Omit<AchievementState, "id">;

interface Ctx {
  solves: Solve[];
  streak: ReturnType<typeof streakInfo>;
  cfContestTimes: number[];
  history: CfRatingChange[];
}

const earned = (at: number | null, progress: AchievementProgress | null = null) => ({ unlocked: true, at, progress });
const notYet = (progress: AchievementProgress | null = null) => ({ unlocked: false, at: null, progress });
/** Unlocks when a dated count reaches `target`; falls back to an undated total when the dates run out. */
function countRule(times: readonly number[], total: number, target: number, label: string) {
  const progress = { value: Math.min(total, target), target, label };
  if (total < target) return notYet(progress);
  return earned(nth(times, target), progress);
}

const streakRule = (n: number): Rule => (_, { streak }) => {
  const progress = { value: Math.min(streak.longest, n), target: n, label: "Best streak" };
  return streak.longest >= n ? earned(streak.reachedAt(n), progress) : notYet(progress);
};

const ratingRule = (min: number): Rule => (input, { history }) => {
  const hit = history.find((h) => h.newRating >= min);
  const best = Math.max(input.cfMaxRating ?? 0, ...history.map((h) => h.newRating), 0);
  const progress = { value: Math.min(best, min), target: min, label: "Best rating" };
  if (hit) return earned(hit.at, progress);
  return best >= min ? earned(null, progress) : notYet(progress);
};

const lcDifficultyRule = (d: LcDifficulty, key: "medium" | "hard"): Rule => (input, { solves }) => {
  const first = solves.find((s) => s.platform === "lc" && s.difficulty === d);
  if (first) return earned(first.at);
  return (input.lcSolved?.[key] ?? 0) > 0 ? earned(null) : notYet();
};

const lcCountRule = (n: number): Rule => (input, { solves }) => {
  const dated = solves.filter((s) => s.platform === "lc").map((s) => s.at);
  const total = Math.max(input.lcSolved?.all ?? 0, dated.length);
  // Dates only help if every solve is dated; otherwise the nth dated solve isn't the nth solve.
  return countRule(total === dated.length ? dated : [], total, n, "Solved");
};

const statusRule = (statuses: string[]): Rule => (input) => (input.topics?.some((t) => statuses.includes(t.status)) ? earned(null) : notYet());

const RULES: Record<string, Rule> = {
  first_quest: (input) => {
    const at = input.questDays.flatMap((d) => (d.done > 0 && d.lastAt !== null ? [d.lastAt] : [])).sort((a, b) => a - b)[0];
    return at !== undefined ? earned(at) : notYet({ value: 0, target: 1, label: "Goals" });
  },
  streak_3: streakRule(3),
  streak_7: streakRule(7),
  streak_30: streakRule(30),
  streak_100: streakRule(100),
  active_100: (_, { streak }) => countRule(streak.sorted.map(noonOf), streak.count, 100, "Active days"),
  perfect_weeks_4: (input) => {
    const perfect = new Map(input.questDays.map((d) => [d.day, d.total > 0 && d.done === d.total]));
    const weeks: number[] = [];
    // Each Monday that starts 7 perfect days.
    for (const day of [...perfect.keys()].sort()) {
      if (dayDate(day).getDay() !== 1) continue;
      let ok = true;
      let cur = day;
      for (let i = 0; i < 7; i++, cur = nextDay(cur)) ok &&= perfect.get(cur) === true;
      if (ok) weeks.push(noonOf(day) + 6 * DAY);
    }
    return countRule(weeks, weeks.length, 4, "Perfect weeks");
  },
  cf_first_contest: (_, { cfContestTimes }) => countRule(cfContestTimes, cfContestTimes.length, 1, "Contests"),
  cf_contests_10: (_, { cfContestTimes }) => countRule(cfContestTimes, cfContestTimes.length, 10, "Contests"),
  cf_contests_25: (_, { cfContestTimes }) => countRule(cfContestTimes, cfContestTimes.length, 25, "Contests"),
  cf_above_rating: (_, { solves, history }) => {
    const hit = solves.find((s) => {
      if (s.platform !== "cf" || s.rating === null) return false;
      const r = ratingBefore(history, s.at);
      return r !== null && s.rating > r;
    });
    return hit ? earned(hit.at) : notYet();
  },
  cf_plus_50: (_, { history }) => {
    const hit = history.find((h) => h.newRating - h.oldRating >= 50);
    return hit ? earned(hit.at) : notYet();
  },
  cf_first_upsolve: (input) => {
    const at = firstUpsolveAt(input.cfSubmissions, input.upsolveQueue);
    return at !== null ? earned(at) : notYet();
  },
  cf_solved_100: (_, { solves }) => {
    const times = solves.filter((s) => s.platform === "cf").map((s) => s.at);
    return countRule(times, times.length, 100, "Solved");
  },
  cf_pupil: ratingRule(1200),
  cf_specialist: ratingRule(1400),
  cf_expert: ratingRule(1600),
  lc_first_medium: lcDifficultyRule("Medium", "medium"),
  lc_first_hard: lcDifficultyRule("Hard", "hard"),
  lc_50: lcCountRule(50),
  lc_100: lcCountRule(100),
  lc_first_contest: (input) => {
    const first = [...input.lcContests].sort((a, b) => a.startTime - b.startTime)[0];
    return first ? earned(first.startTime) : notYet();
  },
  topic_strong: statusRule(["Strong", "Mastered"]),
  topic_mastered: statusRule(["Mastered"]),
  topics_unlocked_10: (input) => {
    const n = input.topics?.filter((t) => t.status !== "Locked").length ?? 0;
    const progress = { value: Math.min(n, 10), target: 10, label: "Unlocked" };
    return n >= 10 ? earned(null, progress) : notYet(progress);
  },
  blind_spots_tried: (input) => {
    if (input.blindSpots === null) return notYet();
    if (input.blindSpots === 0) return earned(null);
    return notYet({ value: 0, target: input.blindSpots, label: `${input.blindSpots} left` });
  },
  night_owl: (_, { solves }) => {
    const hit = solves.find((s) => new Date(s.at * 1000).getHours() < 4);
    return hit ? earned(hit.at) : notYet();
  },
  early_bird: (_, { solves }) => {
    const hit = solves.find((s) => {
      const h = new Date(s.at * 1000).getHours();
      return h >= 5 && h < 7;
    });
    return hit ? earned(hit.at) : notYet();
  },
  five_in_day: (_, { solves }) => {
    const perDay = new Map<string, number[]>();
    for (const s of solves) perDay.set(localDay(s.at), [...(perDay.get(localDay(s.at)) ?? []), s.at]);
    let best = 0;
    let at: number | null = null;
    for (const times of perDay.values()) {
      best = Math.max(best, times.length);
      if (times.length >= 5) {
        const fifth = [...times].sort((a, b) => a - b)[4]!;
        if (at === null || fifth < at) at = fifth;
      }
    }
    const progress = { value: Math.min(best, 5), target: 5, label: "Best day" };
    return at !== null ? earned(at, progress) : notYet(progress);
  },
  weekend_warrior: (_, { solves }) => {
    const days = new Set(solves.map((s) => localDay(s.at)));
    for (const s of solves) {
      const day = localDay(s.at);
      if (dayDate(day).getDay() === 0 && days.has(localDay(noonOf(day) - DAY))) return earned(s.at);
    }
    return notYet();
  },
  comeback: (_, { solves }) => {
    for (let i = 1; i < solves.length; i++) {
      if (solves[i]!.at - solves[i - 1]!.at >= 14 * DAY) return earned(solves[i]!.at);
    }
    return notYet();
  },
};

export function evaluateAchievements(input: AchievementInput): AchievementState[] {
  const history = [...input.ratingHistory].sort((a, b) => a.at - b.at);
  const contests = new Map<string, number>();
  for (const r of input.contestResults) if (r.participated) contests.set(r.contestId, r.startTime);
  for (const h of history) if (!contests.has(`cf:${h.contestId}`)) contests.set(`cf:${h.contestId}`, h.at);
  const ctx: Ctx = {
    solves: solveTimeline(input),
    streak: streakInfo(input.activeDays),
    cfContestTimes: [...contests.values()].sort((a, b) => a - b),
    history,
  };
  return ACHIEVEMENTS.map((a) => ({ id: a.id, ...RULES[a.id]!(input, ctx) }));
}
