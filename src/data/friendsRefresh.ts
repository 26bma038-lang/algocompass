import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import { personStats, type PersonStats } from "@/engine/friends";
import type { FriendRow, Repo } from "./repo";
import { cfDailyActivity, lcDailyActivity } from "./sync";
import type { DailyActivity } from "./types";

/** Submissions read per friend: enough for this week and a streak, without pulling a whole history. */
export const FRIEND_CF_SUBMISSIONS = 1000;

export interface FriendAdapters {
  cf: Pick<CodeforcesAdapter, "getUser" | "getSubmissions">;
  lc: Pick<LeetCodeAdapter, "getProfile" | "getRecentAc" | "getCalendar">;
}

const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

/**
 * Reads one friend's public profiles through the adapters. Fails soft per platform: a site that
 * doesn't answer keeps that part of the last good read, and the error is saved to show beside them.
 */
export async function refreshFriend(repo: Repo, adapters: FriendAdapters, f: FriendRow, now: number): Promise<void> {
  const errors: string[] = [];
  const activity: DailyActivity[] = [];
  let cf: Parameters<typeof personStats>[0]["cf"] = null;
  let lc: Parameters<typeof personStats>[0]["lc"] = null;
  let cfFailed = false;
  let lcFailed = false;

  if (f.cfHandle) {
    try {
      const [user, submissions] = await Promise.all([adapters.cf.getUser(f.cfHandle), adapters.cf.getSubmissions(f.cfHandle, { from: 1, count: FRIEND_CF_SUBMISSIONS })]);
      cf = { user, submissions, complete: submissions.length < FRIEND_CF_SUBMISSIONS };
      activity.push(...cfDailyActivity(submissions));
    } catch (e) {
      cfFailed = true;
      errors.push(`Codeforces: ${message(e)}`);
    }
  }
  if (f.lcHandle) {
    try {
      const [profile, recent, calendar] = await Promise.all([adapters.lc.getProfile(f.lcHandle), adapters.lc.getRecentAc(f.lcHandle), adapters.lc.getCalendar(f.lcHandle)]);
      lc = { profile, recent };
      activity.push(...lcDailyActivity(calendar));
    } catch (e) {
      lcFailed = true;
      errors.push(`LeetCode: ${message(e)}`);
    }
  }

  const error = errors.length ? errors.join(" ") : null;
  if ((f.cfHandle ? cfFailed : true) && (f.lcHandle ? lcFailed : true)) {
    await repo.saveFriendStats(f.id, null, null, error);
    return;
  }
  const fresh = personStats({ cf, lc, activity, now });
  // A platform that failed this time keeps its last good numbers (the streak is from what answered).
  const stats: PersonStats = { ...fresh, cf: cfFailed ? (f.stats?.cf ?? null) : fresh.cf, lc: lcFailed ? (f.stats?.lc ?? null) : fresh.lc };
  await repo.saveFriendStats(f.id, stats, now, error);
}

/** Every friend, one after another (Codeforces calls share the adapter's rate-limit queue). Never throws. */
export async function refreshFriends(repo: Repo, adapters: FriendAdapters, now: number): Promise<void> {
  for (const f of await repo.getFriends()) {
    try {
      await refreshFriend(repo, adapters, f, now);
    } catch {
      // One friend never blocks the others or the update.
    }
  }
}
