import { AdapterError, isNetworkError, sleep } from "@/adapters/http";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import type { Repo } from "./repo";
import type { CfSubmission, DailyActivity, LcCalendar, Platform } from "./types";
import type { Handles } from "./settings";

export const PROBLEMSET_TTL_SECONDS = 24 * 60 * 60;
/** Finished contests older than this aren't kept in the contests table. */
const CONTEST_HISTORY_SECONDS = 60 * 24 * 60 * 60;
const CF_PAGE = 100;
/** Waits between attempts when a step hits a DNS/network error: 3 tries in total. */
export const NETWORK_RETRY_DELAYS_MS = [1500, 4000] as const;

export interface PlatformSyncResult {
  platform: Platform;
  ok: boolean;
  /**
   * The platform couldn't be reached at all (every failure was a DNS/network error, after
   * retries). That's "offline, will retry", not a broken sync.
   */
  offline: boolean;
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
  /** Backoff between network retries (tests pass zeros). */
  retryDelaysMs?: readonly number[];
}

const nowSeconds = () => Math.floor(Date.now() / 1000);

function describe(e: unknown): string {
  if (e instanceof AdapterError) return e.message;
  if (e instanceof Error) return e.message;
  return String(e);
}

/** Runs `fn`, retrying with backoff only while it fails with a network error. */
async function withNetworkRetry<T>(fn: () => Promise<T>, delays: readonly number[]): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const delay = delays[attempt];
      if (!isNetworkError(e) || delay === undefined) throw e;
      await sleep(delay);
    }
  }
}

interface StepCtx {
  repo: Repo;
  now: () => number;
  retryDelaysMs: readonly number[];
}

/** Runs one logged step; failures are recorded and swallowed so later steps still run. */
async function step(ctx: StepCtx, result: PlatformSyncResult, kind: string, fn: () => Promise<number | "skipped">) {
  const { repo, now } = ctx;
  const startedAt = now();
  try {
    const out = await withNetworkRetry(fn, ctx.retryDelaysMs);
    const skipped = out === "skipped";
    const items = skipped ? 0 : out;
    result.steps.push({ kind, status: skipped ? "skipped" : "ok", items, message: null });
    await repo.logSync({ platform: result.platform, kind, startedAt, finishedAt: now(), status: skipped ? "skipped" : "ok", message: null, items });
  } catch (e) {
    const message = describe(e);
    // Offline only while every failure so far is a network error.
    result.offline = (result.ok || result.offline) && isNetworkError(e);
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
  const result: PlatformSyncResult = { platform: "cf", ok: true, offline: false, errors: [], steps: [] };
  const ctx: StepCtx = { repo, now, retryDelaysMs: deps.retryDelaysMs ?? NETWORK_RETRY_DELAYS_MS };

  const stored = await repo.getProfile("cf");
  if (stored && stored.handle.toLowerCase() !== handle.toLowerCase()) await repo.clearPlatform("cf");

  await step(ctx, result, "cf:user", async () => {
    const user = await cf.getUser(handle);
    await repo.saveProfile("cf", handle, user, now());
    return 1;
  });
  // A missing user makes every other CF call pointless.
  if (!result.ok) return result;

  await step(ctx, result, "cf:rating", async () => {
    const history = await cf.getRatingHistory(handle);
    await repo.saveCfRatingHistory(history);
    return history.length;
  });

  await step(ctx, result, "cf:submissions", async () => {
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

  await step(ctx, result, "cf:problemset", async () => {
    const last = await repo.lastSuccess("cf:problemset");
    if (!deps.forceProblemset && last !== null && now() - last < PROBLEMSET_TTL_SECONDS) return "skipped";
    const problems = await cf.getProblemset();
    await repo.saveCfProblems(problems);
    return problems.length;
  });

  await step(ctx, result, "cf:contests", async () => {
    const cutoff = now() - CONTEST_HISTORY_SECONDS;
    const all = await cf.getContests();
    const contests = all.filter((c) => c.phase !== "finished" || c.startTime >= cutoff);
    await repo.saveContests(contests);
    // Every contest's date, so recommendations can prefer problems from recent rounds.
    await repo.saveCfContestTimes(
      all.flatMap((c) => {
        const id = Number(c.id.slice(3)); // "cf:2050" → 2050
        return Number.isInteger(id) ? [{ contestId: id, startTime: c.startTime }] : [];
      }),
    );
    return contests.length;
  });

  return result;
}

async function syncLeetCode(deps: SyncDeps, now: () => number): Promise<PlatformSyncResult> {
  const { repo, lc } = deps;
  const username = deps.handles.leetcode;
  const result: PlatformSyncResult = { platform: "lc", ok: true, offline: false, errors: [], steps: [] };
  const ctx: StepCtx = { repo, now, retryDelaysMs: deps.retryDelaysMs ?? NETWORK_RETRY_DELAYS_MS };

  const stored = await repo.getProfile("lc");
  if (stored && stored.handle.toLowerCase() !== username.toLowerCase()) await repo.clearPlatform("lc");

  let profileOk = false;
  await step(ctx, result, "lc:profile", async () => {
    const [profile, contest] = await Promise.all([lc.getProfile(username), lc.getContestData(username)]);
    await repo.saveProfile("lc", username, profile, now());
    await repo.saveLcStats(profile, contest.ranking, now());
    await repo.saveLcContestHistory(contest.history);
    profileOk = true;
    return 1 + contest.history.length;
  });
  if (!profileOk) return result;

  await step(ctx, result, "lc:tags", async () => {
    const tags = await lc.getTagCounts(username);
    await repo.saveLcTagCounts(tags);
    return tags.length;
  });

  await step(ctx, result, "lc:calendar", async () => {
    const calendar = await lc.getCalendar(username);
    const rows = lcDailyActivity(calendar);
    await repo.saveDailyActivity(rows);
    return rows.length;
  });

  await step(ctx, result, "lc:recent", async () => {
    const recent = await lc.getRecentAc(username, 20);
    await repo.saveLcRecentAc(recent);
    return recent.length;
  });

  // Difficulty + tags for accepted problems we haven't looked up yet (feeds topic scoring).
  await step(ctx, result, "lc:problems", async () => {
    const known = new Set((await repo.getLcProblems()).map((p) => p.slug));
    const missing = (await repo.getLcRecentAc()).map((r) => r.slug).filter((s) => s && !known.has(s));
    if (!missing.length) return "skipped";
    const meta = await lc.getProblemMeta(missing);
    await repo.saveLcProblems(meta);
    return meta.length;
  });

  await step(ctx, result, "lc:contests", async () => {
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
