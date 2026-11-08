import { describe, expect, it, vi } from "vitest";
import { memoryRepo } from "@/test/sqljs";
import { ensureCfProblemset } from "./cfProblemset";
import { PROBLEMSET_TTL_SECONDS } from "./sync";
import type { CfProblem } from "./types";

const P: CfProblem[] = [
  { key: "4-A", contestId: 4, index: "A", name: "Watermelon", rating: 800, tags: ["brute force", "math"], solvedCount: 400000 },
  { key: "1-A", contestId: 1, index: "A", name: "Theatre Square", rating: 1000, tags: ["math"], solvedCount: 200000 },
];

describe("ensureCfProblemset", () => {
  it("fetches once, caches in SQLite, and doesn't ask again within a day", async () => {
    const repo = await memoryRepo();
    const fetch = vi.fn(async () => P);
    let t = 1_000_000;
    const first = await ensureCfProblemset(repo, fetch, () => t);
    expect(first).toMatchObject({ stale: false, error: null, fetchedAt: t });
    expect(first.problems.map((p) => p.key).sort()).toEqual(["1-A", "4-A"]);
    t += PROBLEMSET_TTL_SECONDS - 60;
    const again = await ensureCfProblemset(repo, fetch, () => t);
    expect(again.problems).toHaveLength(2);
    expect(fetch).toHaveBeenCalledTimes(1);
    t += 120;
    await ensureCfProblemset(repo, fetch, () => t);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("fails soft: offline uses the saved list, marked stale", async () => {
    const repo = await memoryRepo();
    let t = 1_000_000;
    await ensureCfProblemset(repo, async () => P, () => t);
    t += PROBLEMSET_TTL_SECONDS * 3;
    const view = await ensureCfProblemset(repo, async () => Promise.reject(new Error("Couldn't reach codeforces.com")), () => t);
    expect(view).toMatchObject({ stale: true, error: "Couldn't reach codeforces.com", fetchedAt: 1_000_000 });
    expect(view.problems).toHaveLength(2);
  });

  it("with no saved list and no network, returns nothing and says why", async () => {
    const repo = await memoryRepo();
    const view = await ensureCfProblemset(repo, async () => Promise.reject(new Error("offline")));
    expect(view).toEqual({ problems: [], fetchedAt: null, stale: false, error: "offline" });
  });

  it("shares the day with the sync's own problemset step", async () => {
    const repo = await memoryRepo();
    const now = 2_000_000;
    await repo.saveCfProblems(P);
    await repo.logSync({ platform: "cf", kind: "cf:problemset", startedAt: now - 10, finishedAt: now - 5, status: "ok", message: null, items: 2 });
    const fetch = vi.fn(async () => P);
    await ensureCfProblemset(repo, fetch, () => now);
    expect(fetch).not.toHaveBeenCalled();
  });
});
