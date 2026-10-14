import { describe, expect, it, vi } from "vitest";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import { AdapterError } from "@/adapters/http";
import { memoryRepo } from "@/test/sqljs";
import { cfDailyActivity, lcDailyActivity, syncAll } from "./sync";
import type { CfSubmission } from "./types";

const sub = (id: number, createdAt: number, verdict: string | null = "OK"): CfSubmission => ({
  id,
  problemKey: `1-${id}`,
  contestId: 1,
  problemIndex: String(id),
  problemName: `P${id}`,
  problemRating: 800,
  tags: ["math"],
  verdict,
  createdAt,
  language: "C++",
});

function fakeCf(subs: CfSubmission[]) {
  return {
    getUser: vi.fn(async (h: string) => ({ handle: h, rating: 1008, maxRating: 1008, rank: "newbie", maxRank: "newbie", avatar: null, registeredAt: 1 })),
    getRatingHistory: vi.fn(async () => [{ contestId: 1, contestName: "R1", rank: 5000, oldRating: 0, newRating: 1008, at: 100 }]),
    getSubmissions: vi.fn(async (_h: string, page?: { from: number; count: number }) =>
      page ? subs.slice(page.from - 1, page.from - 1 + page.count) : subs,
    ),
    getProblemset: vi.fn(async () => [{ key: "1-1", contestId: 1, index: "1", name: "P1", rating: 800, tags: ["math"], solvedCount: 10 }]),
    getContests: vi.fn(async () => [
      { id: "cf:2", platform: "cf" as const, name: "Next", startTime: 10_000_000, durationSeconds: 7200, phase: "upcoming" as const, url: "u" },
      { id: "cf:0", platform: "cf" as const, name: "Ancient", startTime: 1, durationSeconds: 7200, phase: "finished" as const, url: "u" },
    ]),
  };
}

function fakeLc(fail = false) {
  const boom = async () => {
    throw new AdapterError("lc", "http", "LeetCode returned HTTP 403");
  };
  return {
    getProfile: fail ? vi.fn(boom) : vi.fn(async (u: string) => ({ username: u, ranking: 5, solved: { all: 19, easy: 14, medium: 3, hard: 2 }, totals: { all: 4082, easy: 971, medium: 2128, hard: 983 } })),
    getContestData: vi.fn(async () => ({ ranking: null, history: [] })),
    getTagCounts: vi.fn(async () => [{ slug: "array", name: "Array", level: "fundamental" as const, solved: 9 }]),
    getCalendar: vi.fn(async () => ({ 1775952000: 7 })),
    getRecentAc: vi.fn(async () => [{ id: "1", title: "Two Sum", slug: "two-sum", timestamp: 1 }]),
    getUpcomingContests: vi.fn(async () => []),
    getProblemMeta: vi.fn(async (slugs: string[]) => slugs.map((slug) => ({ slug, difficulty: "Easy" as const, tags: ["array"] }))),
  };
}

const handles = { codeforces: "enkrid", leetcode: "xfO61DFAh6" };
const NOW = 9_000_000;

describe("syncAll", () => {
  it("fills every table on first sync", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([sub(3, 3000), sub(2, 2000, "WRONG_ANSWER"), sub(1, 1000)]);
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW });
    expect(res.cf.ok && res.lc.ok).toBe(true);
    expect(cf.getSubmissions).toHaveBeenCalledWith("enkrid"); // full history, no paging
    const counts = await repo.tableCounts();
    expect(counts).toMatchObject({ profiles: 2, cf_submissions: 3, cf_problems: 1, cf_rating_history: 1, lc_stats: 1, lc_tag_counts: 1, lc_recent_ac: 1, lc_problems: 1 });
    // The finished contest older than 60 days is dropped; the upcoming one is kept.
    expect((await repo.getContests(0)).map((c) => c.id)).toEqual(["cf:2"]);
  });

  it("syncs CF submissions incrementally and caches the problemset for 24h", async () => {
    const repo = await memoryRepo();
    const subs = [sub(2, 2000), sub(1, 1000)];
    const cf = fakeCf(subs);
    const lc = fakeLc() as unknown as LeetCodeAdapter;
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW });

    subs.unshift(sub(4, 4000), sub(3, 3000));
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW + 3600 });
    expect(cf.getSubmissions).toHaveBeenLastCalledWith("enkrid", { from: 1, count: 100 });
    expect(res.cf.steps.find((s) => s.kind === "cf:submissions")?.items).toBe(2);
    expect((await repo.tableCounts()).cf_submissions).toBe(4);
    expect(res.cf.steps.find((s) => s.kind === "cf:problemset")?.status).toBe("skipped");
    expect(cf.getProblemset).toHaveBeenCalledTimes(1);

    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW + 25 * 3600 });
    expect(cf.getProblemset).toHaveBeenCalledTimes(2);
  });

  it("a LeetCode outage doesn't block Codeforces", async () => {
    const repo = await memoryRepo();
    const res = await syncAll({
      repo,
      cf: fakeCf([sub(1, 1000)]) as unknown as CodeforcesAdapter,
      lc: fakeLc(true) as unknown as LeetCodeAdapter,
      handles,
      now: () => NOW,
    });
    expect(res.cf.ok).toBe(true);
    expect(res.lc.ok).toBe(false);
    expect(res.lc.errors[0]).toContain("403");
    expect((await repo.tableCounts()).cf_submissions).toBe(1);
    const log = await repo.getSyncLog();
    expect(log.some((e) => e.kind === "lc:profile" && e.status === "error")).toBe(true);
  });

  it("re-syncs from scratch when the handle changes", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([sub(1, 1000)]);
    const lc = fakeLc() as unknown as LeetCodeAdapter;
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW });
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles: { ...handles, codeforces: "tourist" }, now: () => NOW });
    expect(cf.getSubmissions).toHaveBeenLastCalledWith("tourist"); // full fetch again
    expect((await repo.getProfile("cf"))?.handle).toBe("tourist");
  });
});

describe("daily activity", () => {
  it("counts accepted CF submissions per local day", () => {
    const t = new Date(2026, 9, 14, 10).getTime() / 1000;
    const rows = cfDailyActivity([sub(1, t), sub(2, t + 60), sub(3, t + 120, "WRONG_ANSWER")]);
    expect(rows).toEqual([{ day: "2026-10-14", platform: "cf", count: 2 }]);
  });

  it("maps LeetCode calendar keys to UTC days", () => {
    expect(lcDailyActivity({ 1775952000: 7 })).toEqual([{ day: "2026-04-12", platform: "lc", count: 7 }]);
  });
});
