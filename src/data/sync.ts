import { AdapterError, isNetworkError, sleep } from "@/adapters/http";
import { contestsToCheck, UPSOLVE_WINDOW_SECONDS, upsolvePicks } from "@/engine/contests";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import type { Repo } from "./repo";
import type { CfProblem, CfSubmission, DailyActivity, LcCalendar, Platform } from "./types";
import type { Handles } from "./settings";

export const PROBLEMSET_TTL_SECONDS = 24 * 60 * 60;
/** Finished contests older than this aren't kept in the contests table. */
const CONTEST_HISTORY_SECONDS = 60 * 24 * 60 * 60;
const CF_PAGE = 100;
/** How long a finished round may wait for its problems to appear in the problemset. */
const PROBLEMS_WAIT_SECONDS = 24 * 60 * 60;
/** Fewer problems than this in the problemset means the list is partial (see cf:results). */
const MIN_ROUND_PROBLEMS = 4;
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
  /** Called as each step finishes (the first-sync progress list on the welcome screen). */
  onStep?: (platform: Platform, kind: string, status: "ok" | "error" | "skipped") => void;
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
  onStep?: SyncDeps["onStep"];
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
    ctx.onStep?.(result.platform, kind, skipped ? "skipped" : "ok");
    await repo.logSync({ platform: result.platform, kind, startedAt, finishedAt: now(), status: skipped ? "skipped" : "ok", message: null, items });
  } catch (e) {
    const message = describe(e);
    // Offline only while every failure so far is a network error.
    result.offline = (result.ok || result.offline) && isNetworkError(e);
    result.ok = false;
    result.errors.push(message);
    result.steps.push({ kind, status: "error", items: 0, message });
    ctx.onStep?.(result.platform, kind, "error");
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
  const ctx: StepCtx = { repo, now, retryDelaysMs: deps.retryDelaysMs ?? NETWORK_RETRY_DELAYS_MS, onStep: deps.onStep };

  // No handle (Beginner mode makes it optional): nothing to sync. Defense in depth: an empty handle is
  // "not set", never a handle change that clears history.
  if (!handle.trim()) {
    result.steps.push({ kind: "cf:user", status: "skipped", items: 0, message: "No Codeforces handle" });
    return result;
  }
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
      // Codeforces sometimes answers OK with an empty list. A rated contestant has submitted, so
      // that's a bad answer, not "no solves": save nothing and the next sync fetches it all again.
      const rated = (await repo.getCfRatingHistory()).length;
      if (!fresh.length && rated > 0) {
        throw new AdapterError("cf", "api", `Codeforces returned no submissions for ${handle}, though it lists ${rated} rated ${rated === 1 ? "round" : "rounds"}. Will retry on the next update.`);
      }
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

  // Names of every CF contest from this sync's contest.list (older rounds aren't kept in `contests`).
  const contestNames = new Map<number, string>();
  await step(ctx, result, "cf:contests", async () => {
    const cutoff = now() - CONTEST_HISTORY_SECONDS;
    const all = await cf.getContests();
    for (const c of all) contestNames.set(Number(c.id.slice(3)), c.name);
    const contests = all.filter((c) => c.phase !== "finished" || c.startTime >= cutoff);
    await repo.saveContests(contests);
    // Every contest's date, so recommendations can prefer problems from recent rounds.
    await repo.saveCfContestTimes(
      all.flatMap((c) => {
        const id = Number(c.id.slice(3)); // "cf:2050" → 2050
        return Number.isInteger(id) ? [{ contestId: id, startTime: c.startTime, durationSeconds: c.durationSeconds }] : [];
      }),
    );
    return contests.length;
  });

  // Your result in each finished round you took part in; unsolved problems of recent rounds go to Upsolve.
  await step(ctx, result, "cf:results", async () => {
    await repo.repairContestResults(contestNames, MIN_ROUND_PROBLEMS);
    const [known, windows, ratingHistory, attending, submissions, contests] = await Promise.all([
      repo.getContestResults(),
      repo.getCfContestWindows(),
      repo.getCfRatingHistory(),
      repo.getAttending(),
      repo.getCfSubmissions(),
      repo.getContests(0),
    ]);
    const ratedIds = new Set(ratingHistory.map((h) => `cf:${h.contestId}`));
    const todo = contestsToCheck({
      now: now(),
      contests,
      windows,
      ratingHistory,
      attending,
      submissions,
      // A rated round saved without your solves came from an empty contest.status answer: look again.
      known: new Set(known.filter((k) => !(ratedIds.has(k.contestId) && (!k.participated || k.solved === null))).map((k) => k.contestId)),
      names: contestNames,
    });
    if (!todo.length) return "skipped";
    // The problem list comes from the problemset cache. A round from today may not be in it yet:
    // refresh it once, and if it's still missing, wait (up to a day) instead of saving half a list.
    const byContest = async () => {
      const m = new Map<number, CfProblem[]>();
      for (const p of await repo.getCfProblems()) if (p.contestId !== null) m.set(p.contestId, [...(m.get(p.contestId) ?? []), p]);
      return m;
    };
    let problems = await byContest();
    if (todo.some((c) => !problems.has(c.contestId))) {
      await repo.saveCfProblems(await cf.getProblemset());
      problems = await byContest();
    }
    const rated = new Map(ratingHistory.map((h) => [h.contestId, h]));
    let failure: unknown = null;
    for (const c of todo) {
      const list = problems.get(c.contestId) ?? [];
      if (!list.length && now() - (c.startTime + c.durationSeconds) < PROBLEMS_WAIT_SECONDS) continue;
      try {
        const standing = await cf.getContestStanding(c.contestId, handle, list);
        // You were rated in it, so contest.status must show your submissions. Empty means Codeforces
        // gave a bad answer: keep nothing (a saved row is never looked up again) and retry next time.
        if (!standing.me && rated.has(c.contestId)) {
          failure ??= new AdapterError("cf", "api", `Codeforces didn't return your submissions for ${c.name}. Will retry on the next update.`);
          continue;
        }
        const solved = new Set(standing.me?.solvedIndices ?? []);
        await repo.saveContestResult({
          contestId: `cf:${c.contestId}`,
          name: c.name,
          startTime: c.startTime,
          durationSeconds: c.durationSeconds,
          participated: standing.me !== null,
          // contest.status has no rank; rated rounds get it from your rating history.
          rank: rated.get(c.contestId)?.rank ?? null,
          solved: standing.me ? solved.size : null,
          // Paired Div. 2 rounds list only their own problems (shared ones sit under the Div. 1 id),
          // so a list this short isn't the whole round: no total rather than a wrong one.
          total: standing.problems.length >= MIN_ROUND_PROBLEMS ? standing.problems.length : null,
          problems: standing.problems.map((p) => ({ index: p.index, name: p.name, rating: p.rating, solved: solved.has(p.index) })),
          syncedAt: now(),
        });
        if (standing.me && now() - (c.startTime + c.durationSeconds) <= UPSOLVE_WINDOW_SECONDS) {
          await repo.addToUpsolveQueue(
            upsolvePicks(standing).map((p) => ({
              problemKey: p.key,
              contestId: c.contestId,
              index: p.index,
              name: p.name,
              rating: p.rating,
              tags: p.tags,
              contestName: c.name,
              addedAt: now(),
            })),
          );
        }
      } catch (e) {
        // One unavailable standings page doesn't block the rest; the step still reports it.
        failure ??= e;
        if (isNetworkError(e)) throw e;
      }
    }
    if (failure) throw failure;
    return todo.length;
  });

  return result;
}

async function syncLeetCode(deps: SyncDeps, now: () => number): Promise<PlatformSyncResult> {
  const { repo, lc } = deps;
  const username = deps.handles.leetcode;
  const result: PlatformSyncResult = { platform: "lc", ok: true, offline: false, errors: [], steps: [] };
  const ctx: StepCtx = { repo, now, retryDelaysMs: deps.retryDelaysMs ?? NETWORK_RETRY_DELAYS_MS, onStep: deps.onStep };

  // LeetCode is optional: no username, nothing to sync (and nothing to fail, or to clear).
  if (!username.trim()) {
    result.steps.push({ kind: "lc:profile", status: "skipped", items: 0, message: "No LeetCode username" });
    return result;
  }
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
