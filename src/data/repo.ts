import type { SqlDriver, SqlValue } from "./db";
import type {
  CfProblem,
  CfRatingChange,
  CfSubmission,
  CfUser,
  Contest,
  DailyActivity,
  LcContestEntry,
  LcContestRanking,
  LcProblemMeta,
  LcProfile,
  LcRecentAc,
  LcTagCount,
  Platform,
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
