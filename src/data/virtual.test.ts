import { describe, expect, it } from "vitest";
import { memoryRepo } from "@/test/sqljs";

describe("virtual contests data (migration 0009)", () => {
  it("keeps round names with contest times, and an update without a name keeps it", async () => {
    const repo = await memoryRepo();
    await repo.saveCfContestTimes([{ contestId: 1950, startTime: 100, durationSeconds: 8100, name: "Codeforces Round 937 (Div. 4)" }]);
    await repo.saveCfContestTimes([{ contestId: 1950, startTime: 100, durationSeconds: 8100 }]);
    expect(await repo.getCfRounds()).toEqual([{ contestId: 1950, name: "Codeforces Round 937 (Div. 4)", startTime: 100, durationSeconds: 8100 }]);
  });

  it("starts, ends once and removes a virtual", async () => {
    const repo = await memoryRepo();
    await repo.startVirtual({ contestId: 1950, name: "Round 937", startedAt: 1000, durationSeconds: 8100, problems: [{ index: "A", name: "Stair", rating: 800, tags: ["implementation"] }] });
    const [v] = await repo.getVirtuals();
    expect(v).toMatchObject({ contestId: 1950, startedAt: 1000, endedAt: null, problems: [{ index: "A", tags: ["implementation"] }] });
    await repo.endVirtual(v!.id, 2000);
    await repo.endVirtual(v!.id, 3000);
    expect((await repo.getVirtuals())[0]!.endedAt).toBe(2000);
    await repo.deleteVirtual(v!.id);
    expect(await repo.getVirtuals()).toEqual([]);
  });
});
