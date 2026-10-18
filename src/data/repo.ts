import type { SqlDriver, SqlValue } from "./db";
import type { TickRow } from "@/engine/sheets";
import type {
  CfProblem,
  CfRatingChange,
  CfSubmission,
  CfUser,
  Contest,
  DailyActivity,
  DailyMix,
  MixItem,
  LcContestEntry,
  LcContestRanking,
  LcProblemMeta,
  LcProfile,
  LcRecentAc,
  LcTagCount,
  ManualSolve,
  Platform,
  QuestSpec,
  StoredQuest,
  ContestResult,
  UpsolveQueueItem,
  RecFeedback,
  SyncLogEntry,
} from "./types";

/** Tables the Debug page may dump. Whitelisted so table names never come from input. */
export const TABLES = [
  "profiles",
  "cf_submissions",
  "cf_problems",
  "cf_rating_history",
  "lc_stats",
  "lc_tag_counts",
  "lc_contest_history",
  "lc_recent_ac",
  "lc_problems",
  "daily_activity",
  "contests",
  "cf_contest_times",
  "rec_feedback",
  "daily_mix",
  "manual_solves",
  "daily_quests",
  "contest_attend",
  "contest_results",
  "upsolve_queue",
  "achievements",
  "sheet_ticks",
  "sheet_notes",
  "video_watched",
  "path_steps",
  "sync_log",
] as const;
export type TableName = (typeof TABLES)[number];

/** Rows per multi-row INSERT; keeps bound params well under SQLite's limit. */
const CHUNK = 80;

async function insertMany(
  db: SqlDriver,
  head: string,
  columns: number,
  rows: SqlValue[][],
  tail = "",
): Promise<void> {
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    let n = 0;
    const values = chunk
      .map(() => `(${Array.from({ length: columns }, () => `$${++n}`).join(", ")})`)
      .join(", ");
    await db.execute(`${head} VALUES ${values} ${tail}`, chunk.flat());
  }
}

const json = (v: unknown) => JSON.stringify(v);
const parseTags = (s: string): string[] => {
  try {
    const v: unknown = JSON.parse(s);
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
};

export class Repo {
  constructor(private readonly db: SqlDriver) {}

  // ---------- profiles ----------
  async saveProfile(platform: Platform, handle: string, data: CfUser | LcProfile, now: number) {
    await this.db.execute(
      `INSERT INTO profiles (platform, handle, data_json, updated_at) VALUES ($1, $2, $3, $4)
       ON CONFLICT(platform) DO UPDATE SET handle = excluded.handle, data_json = excluded.data_json, updated_at = excluded.updated_at`,
      [platform, handle, json(data), now],
    );
  }

  async getProfile<T extends CfUser | LcProfile>(platform: Platform): Promise<{ handle: string; data: T; updatedAt: number } | null> {
    const [row] = await this.db.select<{ handle: string; data_json: string; updated_at: number }>(
      "SELECT handle, data_json, updated_at FROM profiles WHERE platform = $1",
      [platform],
    );
    return row ? { handle: row.handle, data: JSON.parse(row.data_json) as T, updatedAt: row.updated_at } : null;
  }

  /** Called when a handle changes: drop that platform's history so it re-syncs from scratch. */
  async clearPlatform(platform: Platform) {
    const tables =
      platform === "cf"
        ? ["cf_submissions", "cf_rating_history"]
        : ["lc_stats", "lc_tag_counts", "lc_contest_history", "lc_recent_ac"];
    for (const t of tables) await this.db.execute(`DELETE FROM ${t}`);
    await this.db.execute("DELETE FROM daily_activity WHERE platform = $1", [platform]);
    await this.db.execute("DELETE FROM profiles WHERE platform = $1", [platform]);
    // Today's mix was picked for the old account.
    await this.db.execute("DELETE FROM daily_mix");
  }

  // ---------- Codeforces ----------
  async saveCfSubmissions(subs: CfSubmission[]) {
    await insertMany(
      this.db,
      "INSERT INTO cf_submissions (id, problem_key, contest_id, problem_index, problem_name, problem_rating, tags_json, verdict, created_at, language)",
      10,
      subs.map((s) => [
        s.id, s.problemKey, s.contestId, s.problemIndex, s.problemName, s.problemRating,
        json(s.tags), s.verdict, s.createdAt, s.language,
      ]),
      "ON CONFLICT(id) DO UPDATE SET verdict = excluded.verdict, problem_rating = excluded.problem_rating, tags_json = excluded.tags_json",
    );
  }

  async latestCfSubmissionId(): Promise<number | null> {
    const [row] = await this.db.select<{ id: number | null }>("SELECT MAX(id) AS id FROM cf_submissions");
    return row?.id ?? null;
  }

  async getCfSubmissions(): Promise<CfSubmission[]> {
    const rows = await this.db.select<{
      id: number; problem_key: string; contest_id: number | null; problem_index: string; problem_name: string;
      problem_rating: number | null; tags_json: string; verdict: string | null; created_at: number; language: string;
    }>("SELECT * FROM cf_submissions ORDER BY created_at DESC");
    return rows.map((r) => ({
      id: r.id,
      problemKey: r.problem_key,
      contestId: r.contest_id,
      problemIndex: r.problem_index,
      problemName: r.problem_name,
      problemRating: r.problem_rating,
      tags: parseTags(r.tags_json),
      verdict: r.verdict,
      createdAt: r.created_at,
      language: r.language,
    }));
  }

  async saveCfProblems(problems: CfProblem[]) {
    await insertMany(
      this.db,
      "INSERT INTO cf_problems (key, contest_id, problem_index, name, rating, tags_json, solved_count)",
      7,
      problems.map((p) => [p.key, p.contestId, p.index, p.name, p.rating, json(p.tags), p.solvedCount]),
      "ON CONFLICT(key) DO UPDATE SET rating = excluded.rating, tags_json = excluded.tags_json, solved_count = excluded.solved_count",
    );
  }

  async getCfProblems(): Promise<CfProblem[]> {
    const rows = await this.db.select<{
      key: string; contest_id: number | null; problem_index: string; name: string; rating: number | null;
      tags_json: string; solved_count: number | null;
    }>("SELECT * FROM cf_problems");
    return rows.map((r) => ({
      key: r.key,
      contestId: r.contest_id,
      index: r.problem_index,
      name: r.name,
      rating: r.rating,
      tags: parseTags(r.tags_json),
      solvedCount: r.solved_count,
    }));
  }

  async saveCfRatingHistory(history: CfRatingChange[]) {
    await this.db.execute("DELETE FROM cf_rating_history");
    await insertMany(
      this.db,
      "INSERT INTO cf_rating_history (contest_id, contest_name, rank, old_rating, new_rating, at)",
      6,
      history.map((h) => [h.contestId, h.contestName, h.rank, h.oldRating, h.newRating, h.at]),
    );
  }

  async getCfRatingHistory(): Promise<CfRatingChange[]> {
    const rows = await this.db.select<{
      contest_id: number; contest_name: string; rank: number; old_rating: number; new_rating: number; at: number;
    }>("SELECT * FROM cf_rating_history ORDER BY at ASC");
    return rows.map((r) => ({
      contestId: r.contest_id,
      contestName: r.contest_name,
      rank: r.rank,
      oldRating: r.old_rating,
      newRating: r.new_rating,
      at: r.at,
    }));
  }

  // ---------- LeetCode ----------
  async saveLcStats(profile: LcProfile, contest: LcContestRanking | null, now: number) {
    await this.db.execute(
      `INSERT INTO lc_stats (username, ranking, easy, medium, hard, all_solved, total_easy, total_medium, total_hard,
         contest_rating, contest_attended, contest_global_rank, contest_top_percent, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT(username) DO UPDATE SET ranking = excluded.ranking, easy = excluded.easy, medium = excluded.medium,
         hard = excluded.hard, all_solved = excluded.all_solved, total_easy = excluded.total_easy,
         total_medium = excluded.total_medium, total_hard = excluded.total_hard,
         contest_rating = excluded.contest_rating, contest_attended = excluded.contest_attended,
         contest_global_rank = excluded.contest_global_rank, contest_top_percent = excluded.contest_top_percent,
         updated_at = excluded.updated_at`,
      [
        profile.username, profile.ranking, profile.solved.easy, profile.solved.medium, profile.solved.hard,
        profile.solved.all, profile.totals.easy, profile.totals.medium, profile.totals.hard,
        contest?.rating ?? null, contest?.attended ?? null, contest?.globalRanking ?? null,
        contest?.topPercentage ?? null, now,
      ],
    );
  }

  async getLcStats() {
    const [row] = await this.db.select<{
      username: string; ranking: number | null; easy: number; medium: number; hard: number; all_solved: number;
      total_easy: number; total_medium: number; total_hard: number; contest_rating: number | null;
      contest_attended: number | null; contest_global_rank: number | null; contest_top_percent: number | null;
      updated_at: number;
    }>("SELECT * FROM lc_stats LIMIT 1");
    return row ?? null;
  }

  async saveLcTagCounts(tags: LcTagCount[]) {
    await this.db.execute("DELETE FROM lc_tag_counts");
    await insertMany(
      this.db,
      "INSERT INTO lc_tag_counts (slug, name, level, solved)",
      4,
      tags.map((t) => [t.slug, t.name, t.level, t.solved]),
      "ON CONFLICT(slug) DO UPDATE SET solved = excluded.solved",
    );
  }

  async getLcTagCounts(): Promise<LcTagCount[]> {
    return this.db.select<LcTagCount>("SELECT slug, name, level, solved FROM lc_tag_counts ORDER BY solved DESC");
  }

  async saveLcContestHistory(history: LcContestEntry[]) {
    await this.db.execute("DELETE FROM lc_contest_history");
    await insertMany(
      this.db,
      "INSERT INTO lc_contest_history (start_time, title, rating, ranking, solved, total)",
      6,
      history.map((h) => [h.startTime, h.title, h.rating, h.ranking, h.solved, h.total]),
    );
  }

  async getLcContestHistory(): Promise<LcContestEntry[]> {
    return this.db.select<LcContestEntry>(
      'SELECT start_time AS "startTime", title, rating, ranking, solved, total FROM lc_contest_history ORDER BY start_time ASC',
    );
  }

  async saveLcRecentAc(items: LcRecentAc[]) {
    await insertMany(
      this.db,
      "INSERT INTO lc_recent_ac (id, title, slug, timestamp)",
      4,
      items.map((s) => [s.id, s.title, s.slug, s.timestamp]),
      "ON CONFLICT(id) DO NOTHING",
    );
  }

  async getLcRecentAc(): Promise<LcRecentAc[]> {
    return this.db.select<LcRecentAc>("SELECT id, title, slug, timestamp FROM lc_recent_ac ORDER BY timestamp DESC");
  }

  async saveLcProblems(items: LcProblemMeta[]) {
    await insertMany(
      this.db,
      "INSERT INTO lc_problems (slug, difficulty, tags_json)",
      3,
      items.map((p) => [p.slug, p.difficulty, json(p.tags)]),
      "ON CONFLICT(slug) DO UPDATE SET difficulty = excluded.difficulty, tags_json = excluded.tags_json",
    );
  }

  async getLcProblems(): Promise<LcProblemMeta[]> {
    const rows = await this.db.select<{ slug: string; difficulty: LcProblemMeta["difficulty"]; tags_json: string }>(
      "SELECT slug, difficulty, tags_json FROM lc_problems",
    );
    return rows.map((r) => ({ slug: r.slug, difficulty: r.difficulty, tags: parseTags(r.tags_json) }));
  }

  // ---------- cross-platform ----------
  /** Replaces one platform's activity for the days given (other days are kept). */
  async saveDailyActivity(rows: DailyActivity[]) {
    await insertMany(
      this.db,
      "INSERT INTO daily_activity (day, platform, count)",
      3,
      rows.map((r) => [r.day, r.platform, r.count]),
      "ON CONFLICT(day, platform) DO UPDATE SET count = excluded.count",
    );
  }

  async getDailyActivity(): Promise<DailyActivity[]> {
    return this.db.select<DailyActivity>("SELECT day, platform, count FROM daily_activity ORDER BY day ASC");
  }

  async saveContests(contests: Contest[]) {
    await insertMany(
      this.db,
      "INSERT INTO contests (id, platform, name, start_time, duration_seconds, phase, url)",
      7,
      contests.map((c) => [c.id, c.platform, c.name, c.startTime, c.durationSeconds, c.phase, c.url]),
      "ON CONFLICT(id) DO UPDATE SET name = excluded.name, start_time = excluded.start_time, duration_seconds = excluded.duration_seconds, phase = excluded.phase",
    );
  }

  async getContests(fromTime: number): Promise<Contest[]> {
    return this.db.select<Contest>(
      `SELECT id, platform, name, start_time AS "startTime", duration_seconds AS "durationSeconds", phase, url
       FROM contests WHERE start_time + duration_seconds >= $1 ORDER BY start_time ASC`,
      [fromTime],
    );
  }

  /** Start time of every CF contest (the problemset itself carries no dates). */
  async saveCfContestTimes(rows: { contestId: number; startTime: number; durationSeconds: number }[]) {
    await insertMany(
      this.db,
      "INSERT INTO cf_contest_times (contest_id, start_time, duration_seconds)",
      3,
      rows.map((r) => [r.contestId, r.startTime, r.durationSeconds]),
      "ON CONFLICT(contest_id) DO UPDATE SET start_time = excluded.start_time, duration_seconds = excluded.duration_seconds",
    );
  }

  async getCfContestTimes(): Promise<Map<number, number>> {
    const rows = await this.db.select<{ contest_id: number; start_time: number }>("SELECT contest_id, start_time FROM cf_contest_times");
    return new Map(rows.map((r) => [r.contest_id, r.start_time]));
  }

  // ---------- recommender ----------
  async addFeedback(f: RecFeedback) {
    await this.db.execute(
      "INSERT INTO rec_feedback (platform, problem_id, topic_id, kind, created_at) VALUES ($1, $2, $3, $4, $5)",
      [f.platform, f.problemId, f.topicId, f.kind, f.createdAt],
    );
  }

  /** Undo one feedback press (identified by problem and time). */
  async removeFeedback(f: Pick<RecFeedback, "platform" | "problemId" | "createdAt">) {
    await this.db.execute("DELETE FROM rec_feedback WHERE platform = $1 AND problem_id = $2 AND created_at = $3", [
      f.platform,
      f.problemId,
      f.createdAt,
    ]);
  }

  async getFeedback(): Promise<RecFeedback[]> {
    return this.db.select<RecFeedback>(
      `SELECT platform, problem_id AS "problemId", topic_id AS "topicId", kind, created_at AS "createdAt"
       FROM rec_feedback ORDER BY created_at ASC, id ASC`,
    );
  }

  async getDailyMix(day: string): Promise<DailyMix | null> {
    const [row] = await this.db.select<{ day: string; generated_at: number; items_json: string }>(
      "SELECT day, generated_at, items_json FROM daily_mix WHERE day = $1",
      [day],
    );
    if (!row) return null;
    let items: MixItem[] = [];
    try {
      const v: unknown = JSON.parse(row.items_json);
      if (Array.isArray(v)) items = v as MixItem[];
    } catch {
      // Unreadable row: treat as no mix, it gets regenerated.
      return null;
    }
    return { day: row.day, generatedAt: row.generated_at, items };
  }

  /** Stores today's mix and drops older days (only today's is ever read). */
  async saveDailyMix(mix: DailyMix) {
    await this.db.execute(
      `INSERT INTO daily_mix (day, generated_at, items_json) VALUES ($1, $2, $3)
       ON CONFLICT(day) DO UPDATE SET generated_at = excluded.generated_at, items_json = excluded.items_json`,
      [mix.day, mix.generatedAt, json(mix.items)],
    );
    await this.db.execute("DELETE FROM daily_mix WHERE day <> $1", [mix.day]);
  }

  // ---------- manual solves ----------
  async addManualSolve(m: ManualSolve) {
    await this.db.execute(
      `INSERT INTO manual_solves (platform, problem_id, title, topic_id, solved_at) VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT(platform, problem_id) DO NOTHING`,
      [m.platform, m.problemId, m.title, m.topicId, m.solvedAt],
    );
  }

  async removeManualSolve(platform: Platform, problemId: string) {
    await this.db.execute("DELETE FROM manual_solves WHERE platform = $1 AND problem_id = $2", [platform, problemId]);
  }

  async getManualSolves(): Promise<ManualSolve[]> {
    return this.db.select<ManualSolve>(
      `SELECT platform, problem_id AS "problemId", title, topic_id AS "topicId", solved_at AS "solvedAt"
       FROM manual_solves ORDER BY solved_at DESC`,
    );
  }

  // ---------- quests ----------
  async getQuests(day: string): Promise<StoredQuest[]> {
    const rows = await this.db.select<{ quest_id: string; spec_json: string; xp: number; completed_at: number | null }>(
      "SELECT quest_id, spec_json, xp, completed_at FROM daily_quests WHERE day = $1 ORDER BY rowid ASC",
      [day],
    );
    const out: StoredQuest[] = [];
    for (const r of rows) {
      try {
        out.push({ ...(JSON.parse(r.spec_json) as QuestSpec), xp: r.xp, completedAt: r.completed_at });
      } catch {
        // Unreadable row: skipped; the day's quests get regenerated if none are left.
      }
    }
    return out;
  }

  /** Replaces the day's not-yet-completed quests (completed ones are kept as earned). */
  async saveQuests(day: string, quests: QuestSpec[]) {
    await this.db.execute("DELETE FROM daily_quests WHERE day = $1 AND completed_at IS NULL", [day]);
    await insertMany(
      this.db,
      "INSERT INTO daily_quests (day, quest_id, spec_json, xp, completed_at)",
      5,
      quests.map((q) => [day, q.id, json(q), q.xp, null]),
      "ON CONFLICT(day, quest_id) DO NOTHING",
    );
  }

  async completeQuest(day: string, questId: string, at: number) {
    await this.db.execute("UPDATE daily_quests SET completed_at = $1 WHERE day = $2 AND quest_id = $3 AND completed_at IS NULL", [at, day, questId]);
  }

  /** Every completed quest (XP history, weekly review). */
  async getCompletedQuests(): Promise<{ day: string; questId: string; xp: number; completedAt: number }[]> {
    return this.db.select(
      `SELECT day, quest_id AS "questId", xp, completed_at AS "completedAt" FROM daily_quests
       WHERE completed_at IS NOT NULL ORDER BY completed_at ASC`,
    );
  }

  /** Per day with quests: how many there were, how many got done, and when the last one finished. */
  async getQuestDays(): Promise<{ day: string; total: number; done: number; lastAt: number | null }[]> {
    return this.db.select(
      `SELECT day, COUNT(*) AS total, COUNT(completed_at) AS done, MAX(completed_at) AS "lastAt"
       FROM daily_quests GROUP BY day ORDER BY day ASC`,
    );
  }

  // ---------- achievements ----------
  async getAchievements(): Promise<Map<string, { unlockedAt: number | null; recordedAt: number }>> {
    const rows = await this.db.select<{ id: string; unlocked_at: number | null; recorded_at: number }>("SELECT id, unlocked_at, recorded_at FROM achievements");
    return new Map(rows.map((r) => [r.id, { unlockedAt: r.unlocked_at, recordedAt: r.recorded_at }]));
  }

  async recordAchievements(rows: { id: string; unlockedAt: number | null }[], now: number) {
    await insertMany(
      this.db,
      "INSERT INTO achievements (id, unlocked_at, recorded_at)",
      3,
      rows.map((r) => [r.id, r.unlockedAt, now]),
      "ON CONFLICT(id) DO NOTHING",
    );
  }

  // ---------- sheets, path, videos (v1.3) ----------
  async getSheetTicks(): Promise<TickRow[]> {
    return this.db.select<TickRow>('SELECT problem_key AS "key", state, source, at FROM sheet_ticks');
  }

  /** Sets ticks by hand (one row per problem key; the newest wins). */
  async setSheetTicks(rows: TickRow[]) {
    await insertMany(
      this.db,
      "INSERT INTO sheet_ticks (problem_key, state, source, at)",
      4,
      rows.map((r) => [r.key, r.state, r.source, r.at]),
      "ON CONFLICT(problem_key) DO UPDATE SET state = excluded.state, source = excluded.source, at = excluded.at",
    );
  }

  async deleteSheetTicks(keys: string[]) {
    for (let i = 0; i < keys.length; i += CHUNK) {
      const chunk = keys.slice(i, i + CHUNK);
      await this.db.execute(`DELETE FROM sheet_ticks WHERE problem_key IN (${chunk.map((_, j) => `$${j + 1}`).join(", ")})`, chunk);
    }
  }

  async getSheetNotes(): Promise<{ key: string; body: string; updatedAt: number }[]> {
    return this.db.select('SELECT problem_key AS "key", body, updated_at AS "updatedAt" FROM sheet_notes');
  }

  /** Saves a note; an empty one is deleted. */
  async saveSheetNote(key: string, body: string, now: number) {
    if (!body.trim()) {
      await this.db.execute("DELETE FROM sheet_notes WHERE problem_key = $1", [key]);
      return;
    }
    await this.db.execute(
      `INSERT INTO sheet_notes (problem_key, body, updated_at) VALUES ($1, $2, $3)
       ON CONFLICT(problem_key) DO UPDATE SET body = excluded.body, updated_at = excluded.updated_at`,
      [key, body, now],
    );
  }

  async getWatchedVideos(): Promise<Map<string, number>> {
    const rows = await this.db.select<{ video_id: string; watched_at: number }>("SELECT video_id, watched_at FROM video_watched");
    return new Map(rows.map((r) => [r.video_id, r.watched_at]));
  }

  async setVideoWatched(videoId: string, watched: boolean, now: number) {
    if (watched) {
      await this.db.execute("INSERT INTO video_watched (video_id, watched_at) VALUES ($1, $2) ON CONFLICT(video_id) DO NOTHING", [videoId, now]);
    } else {
      await this.db.execute("DELETE FROM video_watched WHERE video_id = $1", [videoId]);
    }
  }

  async getPathSteps(): Promise<Map<string, number>> {
    const rows = await this.db.select<{ step_id: string; completed_at: number }>("SELECT step_id, completed_at FROM path_steps");
    return new Map(rows.map((r) => [r.step_id, r.completed_at]));
  }

  async recordPathSteps(ids: string[], now: number) {
    await insertMany(this.db, "INSERT INTO path_steps (step_id, completed_at)", 2, ids.map((id) => [id, now]), "ON CONFLICT(step_id) DO NOTHING");
  }

  /** Wipes every table: only ever called on the separate preview database (Debug → beginner preview). */
  async wipeAll() {
    for (const t of TABLES) await this.db.execute(`DELETE FROM ${t}`);
  }

  // ---------- contests ----------
  async setAttending(contestId: string, attending: boolean, now: number) {
    if (attending) {
      await this.db.execute("INSERT INTO contest_attend (contest_id, created_at) VALUES ($1, $2) ON CONFLICT(contest_id) DO NOTHING", [contestId, now]);
    } else {
      await this.db.execute("DELETE FROM contest_attend WHERE contest_id = $1", [contestId]);
    }
  }

  async getAttending(): Promise<Set<string>> {
    const rows = await this.db.select<{ contest_id: string }>("SELECT contest_id FROM contest_attend");
    return new Set(rows.map((r) => r.contest_id));
  }

  async saveContestResult(r: ContestResult) {
    await this.db.execute(
      `INSERT INTO contest_results (contest_id, name, start_time, duration_seconds, participated, rank, solved, total, problems_json, synced_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       ON CONFLICT(contest_id) DO UPDATE SET name = excluded.name, participated = excluded.participated, rank = excluded.rank,
         solved = excluded.solved, total = excluded.total, problems_json = excluded.problems_json, synced_at = excluded.synced_at`,
      [r.contestId, r.name, r.startTime, r.durationSeconds, r.participated ? 1 : 0, r.rank, r.solved, r.total, json(r.problems), r.syncedAt],
    );
  }

  /**
   * Fixes rows saved before contest names and partial problem lists were handled: fills in
   * placeholder names, and drops totals that can't be a whole round. Idempotent.
   */
  async repairContestResults(names: ReadonlyMap<number, string>, minProblems: number) {
    await this.db.execute("UPDATE contest_results SET total = NULL WHERE total IS NOT NULL AND total < $1", [minProblems]);
    const rows = await this.db.select<{ contest_id: string }>("SELECT contest_id FROM contest_results WHERE name LIKE 'Codeforces contest %'");
    for (const r of rows) {
      const name = names.get(Number(r.contest_id.slice(3)));
      if (name) await this.db.execute("UPDATE contest_results SET name = $1 WHERE contest_id = $2", [name, r.contest_id]);
    }
  }

  async getContestResults(): Promise<ContestResult[]> {
    const rows = await this.db.select<{
      contest_id: string; name: string; start_time: number; duration_seconds: number; participated: number;
      rank: number | null; solved: number | null; total: number | null; problems_json: string; synced_at: number;
    }>("SELECT * FROM contest_results ORDER BY start_time DESC");
    return rows.map((r) => {
      let problems: ContestResult["problems"] = [];
      try {
        const v: unknown = JSON.parse(r.problems_json);
        if (Array.isArray(v)) problems = v as ContestResult["problems"];
      } catch {
        // Keep the row, without its problem list.
      }
      return {
        contestId: r.contest_id, name: r.name, startTime: r.start_time, durationSeconds: r.duration_seconds,
        participated: r.participated === 1, rank: r.rank, solved: r.solved, total: r.total, problems, syncedAt: r.synced_at,
      };
    });
  }

  /** Start and length of every CF contest we know (contest.list), for in-contest windows. */
  async getCfContestWindows(): Promise<Map<number, { startTime: number; durationSeconds: number | null }>> {
    const rows = await this.db.select<{ contest_id: number; start_time: number; duration_seconds: number | null }>(
      "SELECT contest_id, start_time, duration_seconds FROM cf_contest_times",
    );
    return new Map(rows.map((r) => [r.contest_id, { startTime: r.start_time, durationSeconds: r.duration_seconds }]));
  }

  async addToUpsolveQueue(items: UpsolveQueueItem[]) {
    await insertMany(
      this.db,
      "INSERT INTO upsolve_queue (problem_key, contest_id, problem_index, name, rating, tags_json, contest_name, added_at)",
      8,
      items.map((i) => [i.problemKey, i.contestId, i.index, i.name, i.rating, json(i.tags), i.contestName, i.addedAt]),
      "ON CONFLICT(problem_key) DO NOTHING",
    );
  }

  async getUpsolveQueue(): Promise<UpsolveQueueItem[]> {
    const rows = await this.db.select<{
      problem_key: string; contest_id: number; problem_index: string; name: string; rating: number | null;
      tags_json: string; contest_name: string; added_at: number;
    }>("SELECT * FROM upsolve_queue ORDER BY added_at DESC");
    return rows.map((r) => ({
      problemKey: r.problem_key, contestId: r.contest_id, index: r.problem_index, name: r.name, rating: r.rating,
      tags: parseTags(r.tags_json), contestName: r.contest_name, addedAt: r.added_at,
    }));
  }

  async logSync(e: SyncLogEntry) {
    await this.db.execute(
      "INSERT INTO sync_log (platform, kind, started_at, finished_at, status, message, items) VALUES ($1, $2, $3, $4, $5, $6, $7)",
      [e.platform, e.kind, e.startedAt, e.finishedAt, e.status, e.message, e.items],
    );
  }

  async lastSuccess(kind: string): Promise<number | null> {
    const [row] = await this.db.select<{ at: number | null }>(
      "SELECT MAX(finished_at) AS at FROM sync_log WHERE kind = $1 AND status = 'ok'",
      [kind],
    );
    return row?.at ?? null;
  }

  async getSyncLog(limit = 50): Promise<SyncLogEntry[]> {
    return this.db.select<SyncLogEntry>(
      `SELECT id, platform, kind, started_at AS "startedAt", finished_at AS "finishedAt", status, message, items
       FROM sync_log ORDER BY id DESC LIMIT $1`,
      [limit],
    );
  }

  // ---------- debug ----------
  async tableCounts(): Promise<Record<TableName, number>> {
    const out = {} as Record<TableName, number>;
    for (const t of TABLES) {
      const [row] = await this.db.select<{ n: number }>(`SELECT COUNT(*) AS n FROM ${t}`);
      out[t] = row?.n ?? 0;
    }
    return out;
  }

  async dumpTable(table: TableName, limit = 50): Promise<Record<string, unknown>[]> {
    if (!TABLES.includes(table)) throw new Error(`Unknown table ${table}`);
    return this.db.select(`SELECT * FROM ${table} LIMIT $1`, [limit]);
  }
}
