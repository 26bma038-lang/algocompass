import { AdapterError } from "@/adapters/http";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import type { Repo } from "./repo";
import type { CfSubmission, DailyActivity, LcCalendar, Platform } from "./types";
import type { Handles } from "./settings";

export const PROBLEMSET_TTL_SECONDS = 24 * 60 * 60;
/** Finished contests older than this aren't kept in the contests table. */
const CONTEST_HISTORY_SECONDS = 60 * 24 * 60 * 60;
const CF_PAGE = 100;

export interface PlatformSyncResult {
  platform: Platform;
  ok: boolean;
  /** Human-readable failures, one per failed step. */
  errors: string[];
  steps: { kind: string; status: "ok" | "error" | "skipped"; items: number; message: string | null }[];
}

export interface SyncResult {
  startedAt: number;
  finishedAt: number;
  cf: PlatformSyncResult;
  lc: PlatformSyncResult;
}

export interface SyncDeps {
  repo: Repo;
  cf: CodeforcesAdapter;
  lc: LeetCodeAdapter;
  handles: Handles;
  /** Epoch seconds. */
  now?: () => number;
  /** Re-fetch the CF problemset even if the 24h cache is fresh. */
  forceProblemset?: boolean;
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function describe(e: unknown): string {
  if (e instanceof AdapterError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Runs one logged step; failures are recorded and swallowed so later steps still run. */
async function step(
  repo: Repo,
  result: PlatformSyncResult,
  kind: string,
  now: () => number,
  fn: () => Promise<number | "skipped">,
) {
  const startedAt = now();
  try {
    const out = await fn();
    const skipped = out === "skipped";
    const items = skipped ? 0 : out;
    result.steps.push({ kind, status: skipped ? "skipped" : "ok", items, message: null });
    await repo.logSync({ platform: result.platform, kind, startedAt, finishedAt: now(), status: skipped ? "skipped" : "ok", message: null, items });
  } catch (e) {
    const message = describe(e);
    result.ok = false;
    result.errors.push(message);
    result.steps.push({ kind, status: "error", items: 0, message });
    await repo.logSync({ platform: result.platform, kind, startedAt, finishedAt: now(), status: "error", message, items: 0 }).catch(() => undefined);
  }
}

/** Local calendar day (YYYY-MM-DD) for an epoch-seconds timestamp. */
export function localDay(epochSeconds: number): string {
  const d = new Date(epochSeconds * 1000);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** UTC calendar day for LeetCode calendar keys (they are UTC midnights). */
export function utcDay(epochSeconds: number): string {
  return new Date(epochSeconds * 1000).toISOString().slice(0, 10);
}

/** CF activity = accepted submissions per local day. */
export function cfDailyActivity(subs: CfSubmission[]): DailyActivity[] {
  const counts = new Map<string, number>();
  for (const s of subs) {
    if (s.verdict !== "OK") continue;
    const day = localDay(s.createdAt);
    counts.set(day, (counts.get(day) ?? 0) + 1);
  }
  return [...counts].map(([day, count]) => ({ day, platform: "cf" as const, count }));
}

/** LC activity = all submissions per UTC day, as LeetCode's calendar reports it. */
export function lcDailyActivity(calendar: LcCalendar): DailyActivity[] {
  return Object.entries(calendar).map(([ts, count]) => ({ day: utcDay(Number(ts)), platform: "lc" as const, count }));
}

async function syncCodeforces(deps: SyncDeps, now: () => number): Promise<PlatformSyncResult> {
  const { repo, cf } = deps;
  const handle = deps.handles.codeforces;
  const result: PlatformSyncResult = { platform: "cf", ok: true, errors: [], steps: [] };

  const stored = await repo.getProfile("cf");
  if (stored && stored.handle.toLowerCase() !== handle.toLowerCase()) await repo.clearPlatform("cf");

  await step(repo, result, "cf:user", now, async () => {
    const user = await cf.getUser(handle);
    await repo.saveProfile("cf", handle, user, now());
    return 1;
  });
  // A missing user makes every other CF call pointless.
  if (!result.ok) return result;

  await step(repo, result, "cf:rating", now, async () => {
    const history = await cf.getRatingHistory(handle);
    await repo.saveCfRatingHistory(history);
    return history.length;
  });

  await step(repo, result, "cf:submissions", now, async () => {
    const latest = await repo.latestCfSubmissionId();
    let fresh: CfSubmission[];
    if (latest === null) {
      fresh = await cf.getSubmissions(handle); // first sync: full history in one call
    } else {
      // Incremental: page newest-first until we reach a submission we already have.
      fresh = [];
      for (let from = 1; ; from += CF_PAGE) {
        const page = await cf.getSubmissions(handle, { from, count: CF_PAGE });
        const unseen = page.filter((s) => s.id > latest);
        fresh.push(...unseen);
        if (unseen.length < page.length || page.length < CF_PAGE) break;
      }
      // Re-check recent submissions still being judged.
      const pending = (await repo.getCfSubmissions()).filter((s) => s.verdict === null || s.verdict === "TESTING");
      if (pending.length) fresh.push(...(await cf.getSubmissions(handle, { from: 1, count: CF_PAGE })).filter((s) => pending.some((p) => p.id === s.id)));
    }
    await repo.saveCfSubmissions(fresh);
    await repo.saveDailyActivity(cfDailyActivity(await repo.getCfSubmissions()));
    return fresh.length;
  });

  await step(repo, result, "cf:problemset", now, async () => {
    const last = await repo.lastSuccess("cf:problemset");
    if (!deps.forceProblemset && last !== null && now() - last < PROBLEMSET_TTL_SECONDS) return "skipped";
    const problems = await cf.getProblemset();
    await repo.saveCfProblems(problems);
    return problems.length;
  });

  await step(repo, result, "cf:contests", now, async () => {
    const cutoff = now() - CONTEST_HISTORY_SECONDS;
    const contests = (await cf.getContests()).filter((c) => c.phase !== "finished" || c.startTime >= cutoff);
    await repo.saveContests(contests);
    return contests.length;
  });

  return result;
}

async function syncLeetCode(deps: SyncDeps, now: () => number): Promise<PlatformSyncResult> {
  const { repo, lc } = deps;
  const username = deps.handles.leetcode;
  const result: PlatformSyncResult = { platform: "lc", ok: true, errors: [], steps: [] };

  const stored = await repo.getProfile("lc");
  if (stored && stored.handle.toLowerCase() !== username.toLowerCase()) await repo.clearPlatform("lc");

  let profileOk = false;
  await step(repo, result, "lc:profile", now, async () => {
    const [profile, contest] = await Promise.all([lc.getProfile(username), lc.getContestData(username)]);
    await repo.saveProfile("lc", username, profile, now());
    await repo.saveLcStats(profile, contest.ranking, now());
    await repo.saveLcContestHistory(contest.history);
    profileOk = true;
    return 1 + contest.history.length;
  });
  if (!profileOk) return result;

  await step(repo, result, "lc:tags", now, async () => {
    const tags = await lc.getTagCounts(username);
    await repo.saveLcTagCounts(tags);
    return tags.length;
  });

  await step(repo, result, "lc:calendar", now, async () => {
    const calendar = await lc.getCalendar(username);
    const rows = lcDailyActivity(calendar);
    await repo.saveDailyActivity(rows);
    return rows.length;
  });

  await step(repo, result, "lc:recent", now, async () => {
    const recent = await lc.getRecentAc(username, 20);
    await repo.saveLcRecentAc(recent);
    return recent.length;
  });

  // Difficulty + tags for accepted problems we haven't looked up yet (feeds topic scoring).
  await step(repo, result, "lc:problems", now, async () => {
    const known = new Set((await repo.getLcProblems()).map((p) => p.slug));
    const missing = (await repo.getLcRecentAc()).map((r) => r.slug).filter((s) => s && !known.has(s));
    if (!missing.length) return "skipped";
    const meta = await lc.getProblemMeta(missing);
    await repo.saveLcProblems(meta);
    return meta.length;
  });

  await step(repo, result, "lc:contests", now, async () => {
    const contests = await lc.getUpcomingContests(now());
    await repo.saveContests(contests);
    return contests.length;
  });

  return result;
}

/** Syncs both platforms in parallel. Each fails independently (an LC outage never blocks CF). */
export async function syncAll(deps: SyncDeps): Promise<SyncResult> {
  const now = deps.now ?? nowSeconds;
  const startedAt = now();
  const [cf, lc] = await Promise.all([syncCodeforces(deps, now), syncLeetCode(deps, now)]);
  return { startedAt, finishedAt: now(), cf, lc };
}
