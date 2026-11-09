import { describe, expect, it, vi } from "vitest";
import { memoryRepo } from "@/test/sqljs";
import { refreshFriend, refreshFriends, type FriendAdapters } from "./friendsRefresh";

const NOW = Math.floor(new Date(2026, 10, 11, 12).getTime() / 1000);

function fakes(over: Partial<{ cfFails: boolean; lcFails: boolean }> = {}): FriendAdapters {
  return {
    cf: {
      getUser: vi.fn(async (handle: string) => {
        if (over.cfFails) throw new Error("Codeforces is down");
        return { handle, rating: 1450, maxRating: 1500, rank: "specialist", maxRank: "specialist", avatar: null, registeredAt: 0 };
      }),
      getSubmissions: vi.fn(async () => [
        { id: 1, problemKey: "1-A", contestId: 1, problemIndex: "A", problemName: "A", problemRating: 800, tags: [], verdict: "OK", createdAt: NOW - 3600, language: "C++" },
      ]),
    },
    lc: {
      getProfile: vi.fn(async (username: string) => {
        if (over.lcFails) throw new Error("LeetCode is down");
        return { username, ranking: 1, solved: { easy: 1, medium: 1, hard: 0, all: 2 }, totals: { easy: 1, medium: 1, hard: 1, all: 3 } };
      }),
      getRecentAc: vi.fn(async () => []),
      getCalendar: vi.fn(async () => ({})),
    },
  };
}

describe("friends (migration 0010)", () => {
  it("adds, refreshes from public profiles and removes a friend", async () => {
    const repo = await memoryRepo();
    const id = await repo.addFriend("friend", "lcfriend", 1);
    await refreshFriends(repo, fakes(), NOW);
    const [f] = await repo.getFriends();
    expect(f).toMatchObject({ id, cfHandle: "friend", lcHandle: "lcfriend", fetchedAt: NOW, error: null });
    expect(f!.stats).toMatchObject({ cf: { rating: 1450, solvesThisWeek: 1 }, lc: { solved: 2 }, streak: 1 });
    await repo.removeFriend(id);
    expect(await repo.getFriends()).toEqual([]);
  });

  it("fails soft: a site that doesn't answer keeps its last numbers and the error is shown", async () => {
    const repo = await memoryRepo();
    await repo.addFriend("friend", "lcfriend", 1);
    await refreshFriends(repo, fakes(), NOW);
    let [f] = await repo.getFriends();
    await refreshFriend(repo, fakes({ cfFails: true }), f!, NOW + 60);
    [f] = await repo.getFriends();
    expect(f!.stats!.cf).toMatchObject({ rating: 1450 });
    expect(f!.error).toContain("Codeforces is down");
    // Both down: nothing overwritten.
    await refreshFriend(repo, fakes({ cfFails: true, lcFails: true }), f!, NOW + 120);
    [f] = await repo.getFriends();
    expect(f!.fetchedAt).toBe(NOW + 60);
    expect(f!.error).toContain("LeetCode is down");
  });
});
