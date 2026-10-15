import { describe, expect, it, vi } from "vitest";
import type { CodeforcesAdapter } from "@/adapters/codeforces";
import type { LeetCodeAdapter } from "@/adapters/leetcode";
import { AdapterError } from "@/adapters/http";
import { memoryRepo } from "@/test/sqljs";
import { checkHandles, describeFailure } from "./onboarding";
import { DEFAULT_HANDLES, resolveHandles, type Handles } from "./settings";
import { syncAll } from "./sync";

const cfUser = (handle: string) => ({ handle, rating: 1008, maxRating: 1008, rank: "newbie", maxRank: "newbie", avatar: null, registeredAt: 1 });

describe("defaults", () => {
  it("ships no handles, so nobody starts on someone else's stats", () => {
    expect(DEFAULT_HANDLES).toEqual({ codeforces: "", leetcode: "" });
  });
});

describe("resolveHandles", () => {
  const store = (saved: Handles | null) => {
    const written: Handles[] = [];
    return { readSaved: async () => saved, write: async (h: Handles) => void written.push(h), written };
  };

  it("uses saved handles as they are", async () => {
    const repo = await memoryRepo();
    const s = store({ codeforces: "tourist", leetcode: "" });
    expect(await resolveHandles({ ...s, repo })).toEqual({ codeforces: "tourist", leetcode: "" });
    expect(s.written).toEqual([]);
  });

  it("asks (returns null) on a fresh install: nothing saved, nothing synced", async () => {
    expect(await resolveHandles({ ...store(null), repo: await memoryRepo() })).toBeNull();
  });

  it("adopts and saves the handles of an existing install that ran on the old defaults", async () => {
    const repo = await memoryRepo();
    await repo.saveProfile("cf", "enkrid", cfUser("enkrid"), 1);
    await repo.saveProfile("lc", "xfO61DFAh6", { username: "xfO61DFAh6", ranking: 1, solved: { all: 1, easy: 1, medium: 0, hard: 0 }, totals: { all: 1, easy: 1, medium: 0, hard: 0 } }, 1);
    const s = store(null);
    const h = await resolveHandles({ ...s, repo });
    expect(h).toEqual({ codeforces: "enkrid", leetcode: "xfO61DFAh6" });
    expect(s.written).toEqual([h]);
  });

  it("adopts a Codeforces-only install with an empty LeetCode username", async () => {
    const repo = await memoryRepo();
    await repo.saveProfile("cf", "tourist", cfUser("tourist"), 1);
    expect(await resolveHandles({ ...store(null), repo })).toEqual({ codeforces: "tourist", leetcode: "" });
  });
});

describe("checkHandles", () => {
  const ok = { cf: async (h: string) => ({ handle: h.toLowerCase() === "tourist" ? "tourist" : h }), lc: async (u: string) => ({ username: u }) };

  it("returns the platform's own spelling of the handle", async () => {
    const r = await checkHandles({ codeforces: " TOURIST ", leetcode: "" }, ok);
    expect(r.cf).toEqual({ status: "ok", handle: "tourist" });
    expect(r.lc).toEqual({ status: "skipped" });
  });

  it("says clearly when a handle doesn't exist", async () => {
    const r = await checkHandles(
      { codeforces: "nobody_xyz", leetcode: "ghost" },
      {
        cf: async () => { throw new AdapterError("cf", "not-found", "handles: User with handle nobody_xyz not found"); },
        lc: async () => { throw new AdapterError("lc", "not-found", 'LeetCode user "ghost" not found'); },
      },
    );
    expect(r.cf).toMatchObject({ status: "not-found" });
    expect("message" in r.cf && r.cf.message).toContain('No Codeforces user "nobody_xyz"');
    expect("message" in r.lc && r.lc.message).toContain('No LeetCode user "ghost"');
  });

  it("tells offline apart from not found", () => {
    expect(describeFailure("cf", "x", new AdapterError("cf", "network", "Couldn't reach"))).toMatchObject({ status: "offline" });
    expect(describeFailure("lc", "x", new Error("boom"))).toMatchObject({ status: "error" });
  });
});

describe("sync without handles", () => {
  const cf = {
    getUser: vi.fn(async (h: string) => cfUser(h)),
    getRatingHistory: vi.fn(async () => []),
    getSubmissions: vi.fn(async () => []),
    getProblemset: vi.fn(async () => []),
    getContests: vi.fn(async () => []),
    getContestStanding: vi.fn(),
  };
  const lc = { getProfile: vi.fn(), getContestData: vi.fn(), getTagCounts: vi.fn(), getCalendar: vi.fn(), getRecentAc: vi.fn(), getUpcomingContests: vi.fn(), getProblemMeta: vi.fn() };
  const run = (repo: Awaited<ReturnType<typeof memoryRepo>>, handles: Handles) =>
    syncAll({ repo, cf: cf as unknown as CodeforcesAdapter, lc: lc as unknown as LeetCodeAdapter, handles, now: () => 1000, retryDelaysMs: [0, 0] });

  it("skips LeetCode when the username is empty, without calling it or failing", async () => {
    const res = await run(await memoryRepo(), { codeforces: "tourist", leetcode: "" });
    expect(res.lc.ok).toBe(true);
    expect(res.lc.steps).toEqual([expect.objectContaining({ kind: "lc:profile", status: "skipped" })]);
    expect(lc.getProfile).not.toHaveBeenCalled();
  });

  it("never treats an empty Codeforces handle as a handle change (no wipe)", async () => {
    const repo = await memoryRepo();
    await repo.saveProfile("cf", "enkrid", cfUser("enkrid"), 1);
    const res = await run(repo, { codeforces: "", leetcode: "" });
    expect(res.cf.ok).toBe(false);
    expect((await repo.getProfile("cf"))?.handle).toBe("enkrid");
  });
});
