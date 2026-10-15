import { describe, expect, it } from "vitest";
import { memoryRepo } from "@/test/sqljs";
import { TOPICS } from "@/engine/topics";
import { LC_CURATED, LC_LISTS, RESOURCES } from "./catalog";

/** Offline shape checks. Whether the links resolve is `npm run check:links` (network). */
describe("resources.json", () => {
  it("covers every topic with learn (article + video), practice and deeper", () => {
    for (const t of TOPICS) {
      const r = RESOURCES[t.id];
      expect(r, t.id).toBeDefined();
      expect(r!.learn.map((x) => x.kind).sort(), t.id).toEqual(["article", "video"]);
      expect(r!.practice.length, t.id).toBeGreaterThan(0);
      expect(r!.deeper.length, t.id).toBeGreaterThan(0);
    }
    expect(Object.keys(RESOURCES).sort()).toEqual(TOPICS.map((t) => t.id).sort());
  });

  it("uses https URLs only", () => {
    const urls = Object.values(RESOURCES).flatMap((r) => [...r.learn, ...r.practice, ...r.deeper]).map((x) => x.url);
    for (const u of urls) expect(new URL(u).protocol, u).toBe("https:");
  });
});

describe("lc_lists.json", () => {
  const topicIds = new Set(TOPICS.map((t) => t.id));

  it("references real topics and lists", () => {
    for (const p of LC_CURATED) {
      expect(topicIds.has(p.topic), p.slug).toBe(true);
      expect(p.topics[0]).toBe(p.topic);
      for (const id of p.topics) expect(topicIds.has(id), `${p.slug} â†’ ${id}`).toBe(true);
      expect(LC_LISTS[p.list], p.slug).toBeDefined();
    }
  });

  it("orders each topic's path 1..n, Easy â†’ Medium â†’ Hard", () => {
    const rank = { Easy: 0, Medium: 1, Hard: 2 } as const;
    for (const t of TOPICS) {
      const path = LC_CURATED.filter((p) => p.topic === t.id);
      expect(path.map((p) => p.order), t.id).toEqual(path.map((_, i) => i + 1));
      for (let i = 1; i < path.length; i++) expect(rank[path[i]!.difficulty]).toBeGreaterThanOrEqual(rank[path[i - 1]!.difficulty]);
    }
  });

  it("has a learning path for every topic LeetCode teaches", () => {
    const withPath = new Set(LC_CURATED.map((p) => p.topic));
    // Codeforces-only topics: LeetCode has no constructive or flow/matching problems to learn from.
    const cfOnly = TOPICS.filter((t) => !withPath.has(t.id)).map((t) => t.id);
    expect(cfOnly.sort()).toEqual(["advanced-graphs", "constructive"]);
  });
});

describe("recommender tables", () => {
  it("stores, lists and undoes feedback", async () => {
    const repo = await memoryRepo();
    await repo.addFeedback({ platform: "cf", problemId: "2050-B", topicId: "sorting", kind: "too_easy", createdAt: 100 });
    await repo.addFeedback({ platform: "lc", problemId: "two-sum", topicId: "arrays-hashing", kind: "skip", createdAt: 101 });
    expect(await repo.getFeedback()).toEqual([
      { platform: "cf", problemId: "2050-B", topicId: "sorting", kind: "too_easy", createdAt: 100 },
      { platform: "lc", problemId: "two-sum", topicId: "arrays-hashing", kind: "skip", createdAt: 101 },
    ]);
    await repo.removeFeedback({ platform: "cf", problemId: "2050-B", createdAt: 100 });
    expect((await repo.getFeedback()).map((f) => f.problemId)).toEqual(["two-sum"]);
  });

  it("keeps one mix per day and only today's", async () => {
    const repo = await memoryRepo();
    const items = [{ platform: "cf" as const, problemId: "2050-B", topicId: "sorting" }];
    await repo.saveDailyMix({ day: "2026-10-13", generatedAt: 1, items });
    await repo.saveDailyMix({ day: "2026-10-14", generatedAt: 2, items });
    expect(await repo.getDailyMix("2026-10-13")).toBeNull();
    expect(await repo.getDailyMix("2026-10-14")).toEqual({ day: "2026-10-14", generatedAt: 2, items });
  });

  it("stores contest start times", async () => {
    const repo = await memoryRepo();
    await repo.saveCfContestTimes([
      { contestId: 2050, startTime: 1_700_000_000, durationSeconds: 7200 },
      { contestId: 1, startTime: 1_266_000_000, durationSeconds: 7200 },
    ]);
    await repo.saveCfContestTimes([{ contestId: 2050, startTime: 1_700_000_100, durationSeconds: 8100 }]);
    const times = await repo.getCfContestTimes();
    expect(times.get(2050)).toBe(1_700_000_100);
    expect(times.size).toBe(2);
  });
});
