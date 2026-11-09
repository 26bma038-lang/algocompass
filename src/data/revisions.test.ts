import { describe, expect, it } from "vitest";
import { memoryRepo } from "@/test/sqljs";
import { afterReview, dueRevisions } from "@/engine/revision";
import { revisionSolves } from "./revisions";

const DAY = 86_400;

describe("revision data (migration 0007)", () => {
  it("saves and reads a record, and an update replaces it", async () => {
    const repo = await memoryRepo();
    await repo.saveRevision({ key: "lc:two-sum", neededHelp: true, stage: 0, nextAt: null }, 100);
    await repo.saveRevision({ key: "lc:two-sum", neededHelp: true, stage: 1, nextAt: 555 }, 200);
    expect(await repo.getRevisions()).toEqual([{ key: "lc:two-sum", neededHelp: true, stage: 1, nextAt: 555 }]);
  });

  it("schedules a manual solve 7 days out, and 3 once flagged", async () => {
    const repo = await memoryRepo();
    const solvedAt = 1_800_000_000;
    await repo.addManualSolve({ platform: "lc", problemId: "two-sum", title: "Two Sum", topicId: "hashing", solvedAt });
    const solves = await revisionSolves(repo, solvedAt - 1);
    expect(solves).toEqual([expect.objectContaining({ key: "lc:two-sum", title: "Two Sum", at: solvedAt })]);
    expect(dueRevisions({ solves, records: await repo.getRevisions(), now: solvedAt + 4 * DAY, since: 0 })).toEqual([]);
    await repo.saveRevision({ key: "lc:two-sum", neededHelp: true, stage: 0, nextAt: null }, solvedAt);
    const due = dueRevisions({ solves, records: await repo.getRevisions(), now: solvedAt + 4 * DAY, since: 0 });
    expect(due.map((d) => d.key)).toEqual(["lc:two-sum"]);
    await repo.saveRevision(afterReview(solvedAt, undefined, "lc:two-sum", solvedAt + 4 * DAY, false), solvedAt + 4 * DAY);
    expect(dueRevisions({ solves, records: await repo.getRevisions(), now: solvedAt + 5 * DAY, since: 0 })).toEqual([]);
  });

  it("ignores solves from before the queue started", async () => {
    const repo = await memoryRepo();
    await repo.addManualSolve({ platform: "lc", problemId: "old", title: "Old", topicId: null, solvedAt: 1000 });
    expect(await revisionSolves(repo, 5000)).toEqual([]);
  });
});
