import { describe, expect, it, vi } from "vitest";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import { AdapterError } from "@/adapters/http";
import { memoryRepo } from "@/test/sqljs";
import { cfDailyActivity, lcDailyActivity, syncAll } from "./sync";
import type { CfContestStanding, CfProblem, CfSubmission, Contest } from "./types";

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
    getProblemset: vi.fn(async (): Promise<CfProblem[]> => [{ key: "1-1", contestId: 1, index: "1", name: "P1", rating: 800, tags: ["math"], solvedCount: 10 }]),
    getContests: vi.fn(async (): Promise<Contest[]> => [
      { id: "cf:2", platform: "cf" as const, name: "Next", startTime: 10_000_000, durationSeconds: 7200, phase: "upcoming" as const, url: "u" },
      { id: "cf:0", platform: "cf" as const, name: "Ancient", startTime: 1, durationSeconds: 7200, phase: "finished" as const, url: "u" },
    ]),
    getContestStanding: vi.fn(async (contestId: number, _h: string, problems: CfProblem[]): Promise<CfContestStanding> => ({
      contestId,
      problems,
      me: { rank: 0, participantType: "CONTESTANT", solvedIndices: ["A", "C"] },
    })),
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

  it("retries network errors with backoff and recovers", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([sub(1, 1000)]);
    let calls = 0;
    const realGetUser = cf.getUser.getMockImplementation()!;
    cf.getUser.mockImplementation(async (h: string) => {
      if (++calls < 3) throw new AdapterError("cf", "network", "Couldn't reach Codeforces (dns error)");
      return realGetUser(h);
    });
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(calls).toBe(3);
    expect(res.cf.ok).toBe(true);
    expect(res.cf.offline).toBe(false);
  });

  it("marks a platform offline after 3 failed network tries, and keeps the other one", async () => {
    const repo = await memoryRepo();
    const lc = fakeLc();
    lc.getProfile.mockImplementation(async () => {
      throw new AdapterError("lc", "network", "Couldn't reach LeetCode (error sending request: dns error)");
    });
    const res = await syncAll({ repo, cf: fakeCf([sub(1, 1000)]) as unknown as CodeforcesAdapter, lc: lc as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(lc.getProfile).toHaveBeenCalledTimes(3);
    expect(res.lc).toMatchObject({ ok: false, offline: true });
    expect(res.cf).toMatchObject({ ok: true, offline: false });
  });

  it("doesn't retry API errors, and they aren't 'offline'", async () => {
    const repo = await memoryRepo();
    const lc = fakeLc(true);
    const res = await syncAll({ repo, cf: fakeCf([]) as unknown as CodeforcesAdapter, lc: lc as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(lc.getProfile).toHaveBeenCalledTimes(1);
    expect(res.lc).toMatchObject({ ok: false, offline: false });
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

describe("contest results", () => {
  it("looks up a round you just took part in and queues what you didn't solve", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([sub(1, 1000)]);
    // A round that ended an hour before NOW, which you marked "I'll attend".
    cf.getContests.mockImplementation(async () => [
      { id: "cf:7", platform: "cf" as const, name: "Codeforces Round 7 (Div. 2)", startTime: NOW - 3 * 3600, durationSeconds: 7200, phase: "finished" as const, url: "u" },
    ]);
    cf.getProblemset.mockImplementation(async () =>
      ["A", "B", "C", "D", "E"].map((index) => ({ key: `7-${index}`, contestId: 7, index, name: `P${index}`, rating: null, tags: ["math"], solvedCount: null })),
    );
    cf.getRatingHistory.mockImplementation(async () => [{ contestId: 7, contestName: "Codeforces Round 7 (Div. 2)", rank: 4321, oldRating: 1008, newRating: 1030, at: NOW - 600 }]);
    await repo.setAttending("cf:7", true, 1);
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(res.cf.steps.find((s) => s.kind === "cf:results")?.status).toBe("ok");
    const [r] = await repo.getContestResults();
    expect(r).toMatchObject({ contestId: "cf:7", participated: true, rank: 4321, solved: 2, total: 5 });
    // Solved A and C → upsolve B and D (the first solved + 2 by index).
    expect((await repo.getUpsolveQueue()).map((q) => q.problemKey).sort()).toEqual(["7-B", "7-D"]);

    // Looked up once: the next sync doesn't call standings again.
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW + 60, retryDelaysMs: [0, 0] });
    expect(cf.getContestStanding).toHaveBeenCalledTimes(1);
  });

  it("waits while a round is still in system testing", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([]);
    cf.getContests.mockImplementation(async () => [
      { id: "cf:8", platform: "cf" as const, name: "Round 8", startTime: NOW - 3 * 3600, durationSeconds: 7200, phase: "running" as const, url: "u" },
    ]);
    await repo.setAttending("cf:8", true, 1);
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(res.cf.steps.find((s) => s.kind === "cf:results")?.status).toBe("skipped");
    expect(cf.getContestStanding).not.toHaveBeenCalled();
  });
});

// The v1.4 audit's browser run: Codeforces answered OK with empty lists, so the hero said "Solved 0"
// and every past round "Solved –", for good. Empty answers for a rated contestant are now retried.
describe("empty Codeforces answers", () => {
  const ratedRound = (cf: ReturnType<typeof fakeCf>) => {
    cf.getContests.mockImplementation(async () => [
      { id: "cf:7", platform: "cf" as const, name: "Round 7", startTime: NOW - 3 * 3600, durationSeconds: 7200, phase: "finished" as const, url: "u" },
    ]);
    cf.getProblemset.mockImplementation(async () =>
      ["A", "B", "C", "D"].map((index) => ({ key: `7-${index}`, contestId: 7, index, name: `P${index}`, rating: null, tags: [], solvedCount: null })),
    );
    cf.getRatingHistory.mockImplementation(async () => [{ contestId: 7, contestName: "Round 7", rank: 4321, oldRating: 1008, newRating: 1030, at: NOW - 600 }]);
  };

  it("doesn't take an empty first submission list from a rated user as 'no solves'", async () => {
    const repo = await memoryRepo();
    const subs: CfSubmission[] = [];
    const cf = fakeCf(subs);
    const lc = fakeLc() as unknown as LeetCodeAdapter;
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(res.cf.steps.find((s) => s.kind === "cf:submissions")?.status).toBe("error");
    expect(res.cf.errors[0]).toContain("no submissions");

    // Next sync Codeforces answers properly: the full history is fetched again, not paged.
    subs.push(sub(2, 2000), sub(1, 1000));
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW + 60, retryDelaysMs: [0, 0] });
    expect(cf.getSubmissions).toHaveBeenLastCalledWith("enkrid");
    expect((await repo.tableCounts()).cf_submissions).toBe(2);
  });

  it("an unrated user with no submissions is fine", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([]);
    cf.getRatingHistory.mockImplementation(async () => []);
    const res = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW });
    expect(res.cf.ok).toBe(true);
  });

  it("retries a rated round whose contest.status came back empty, instead of saving 'Solved –'", async () => {
    const repo = await memoryRepo();
    const cf = fakeCf([sub(1, 1000)]);
    ratedRound(cf);
    cf.getContestStanding.mockImplementationOnce(async (contestId: number, _h: string, problems: CfProblem[]) => ({ contestId, problems, me: null }));
    const lc = fakeLc() as unknown as LeetCodeAdapter;
    const first = await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(first.cf.steps.find((s) => s.kind === "cf:results")?.status).toBe("error");
    expect(await repo.getContestResults()).toEqual([]);

    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc, handles, now: () => NOW + 60, retryDelaysMs: [0, 0] });
    expect((await repo.getContestResults())[0]).toMatchObject({ contestId: "cf:7", participated: true, solved: 2 });
  });

  it("looks again at a rated round already saved without your solves (older installs)", async () => {
    const repo = await memoryRepo();
    await repo.saveContestResult({ contestId: "cf:7", name: "Round 7", startTime: NOW - 3 * 3600, durationSeconds: 7200, participated: false, rank: 4321, solved: null, total: 4, problems: [], syncedAt: 1 });
    const cf = fakeCf([sub(1, 1000)]);
    ratedRound(cf);
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    expect(cf.getContestStanding).toHaveBeenCalledTimes(1);
    expect((await repo.getContestResults())[0]).toMatchObject({ participated: true, solved: 2 });
  });
});

describe("contest result repair", () => {
  it("names placeholder rows from contest.list and drops partial totals", async () => {
    const repo = await memoryRepo();
    const base = { startTime: 1, durationSeconds: 7200, participated: true, rank: null, solved: 1, problems: [], syncedAt: 1 };
    await repo.saveContestResult({ ...base, contestId: "cf:0", name: "Codeforces contest 0", total: 7 });
    await repo.saveContestResult({ ...base, contestId: "cf:9", name: "Round 9 (Div. 2)", total: 2 });
    const cf = fakeCf([]);
    await syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: fakeLc() as unknown as LeetCodeAdapter, handles, now: () => NOW, retryDelaysMs: [0, 0] });
    const rows = new Map((await repo.getContestResults()).map((r) => [r.contestId, r]));
    expect(rows.get("cf:0")).toMatchObject({ name: "Ancient", total: 7 });
    expect(rows.get("cf:9")).toMatchObject({ total: null, solved: 1 });
  });
});
