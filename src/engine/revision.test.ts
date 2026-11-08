import { describe, expect, it } from "vitest";
import { afterReview, dueRevisions, nextDueAt, solvedAgoWords, type RevisionRecord, type RevisionSolve } from "./revision";

const DAY = 86_400;
const T0 = 1_800_000_000;
const solve = (key: string, at: number, title = key): RevisionSolve => ({ key, platform: key.startsWith("cf") ? "cf" : "lc", problemId: key.slice(3), title, topicId: null, at });
const rec = (key: string, p: Partial<RevisionRecord> = {}): RevisionRecord => ({ key, neededHelp: false, stage: 0, nextAt: null, ...p });

describe("nextDueAt", () => {
  it("is 7 days after the solve, 3 with help, 30 for the second", () => {
    expect(nextDueAt(T0, undefined)).toBe(T0 + 7 * DAY);
    expect(nextDueAt(T0, rec("x", { neededHelp: true }))).toBe(T0 + 3 * DAY);
    expect(nextDueAt(T0, rec("x", { stage: 1 }))).toBe(T0 + 30 * DAY);
    expect(nextDueAt(T0, rec("x", { stage: 1, neededHelp: true }))).toBe(T0 + 30 * DAY);
  });
  it("is null once both reviews are done", () => expect(nextDueAt(T0, rec("x", { stage: 2 }))).toBeNull());
  it("lets nextAt override", () => expect(nextDueAt(T0, rec("x", { nextAt: T0 + 99 }))).toBe(T0 + 99));
});

describe("dueRevisions", () => {
  const now = T0 + 10 * DAY;
  it("lists a solve once its 7 days are up, not before", () => {
    const solves = [solve("lc:a", T0 + 4 * DAY), solve("lc:b", T0 + 2 * DAY)];
    const due = dueRevisions({ solves, records: [], now, since: 0 });
    expect(due.map((d) => d.key)).toEqual(["lc:b"]);
    expect(due[0]).toMatchObject({ overdueDays: 1, stage: 0, neededHelp: false });
  });
  it("brings a problem you needed help with back after 3 days", () => {
    const due = dueRevisions({ solves: [solve("cf:1-A", T0 + 6 * DAY)], records: [rec("cf:1-A", { neededHelp: true })], now, since: 0 });
    expect(due).toHaveLength(1);
    expect(due[0]!.neededHelp).toBe(true);
  });
  it("skips solves before `since` (an old history is never queued)", () => {
    expect(dueRevisions({ solves: [solve("lc:old", T0 - 50 * DAY)], records: [], now, since: T0 })).toEqual([]);
  });
  it("hides finished ones and sorts the most overdue first, capped", () => {
    const solves = [solve("lc:a", T0), solve("lc:b", T0 - 3 * DAY), solve("lc:done", T0 - 40 * DAY), ...Array.from({ length: 8 }, (_, i) => solve(`lc:x${i}`, T0 + i))];
    const due = dueRevisions({ solves, records: [rec("lc:done", { stage: 2 })], now, since: 0, limit: 4 });
    expect(due).toHaveLength(4);
    expect(due[0]!.key).toBe("lc:b");
  });
});

describe("afterReview", () => {
  it("moves a 7-day review to the 30-day one", () => {
    expect(afterReview(T0, undefined, "lc:a", T0 + 8 * DAY, false)).toEqual({ key: "lc:a", neededHelp: false, stage: 1, nextAt: null });
  });
  it("finishes after the second, or when the first is already past 30 days", () => {
    expect(afterReview(T0, rec("lc:a", { stage: 1 }), "lc:a", T0 + 31 * DAY, false).stage).toBe(2);
    expect(afterReview(T0, undefined, "lc:a", T0 + 45 * DAY, false).stage).toBe(2);
  });
  it("keeps the stage and asks again in 3 days when it was still hard", () => {
    const now = T0 + 8 * DAY;
    expect(afterReview(T0, undefined, "lc:a", now, true)).toEqual({ key: "lc:a", neededHelp: true, stage: 0, nextAt: now + 3 * DAY });
  });
});

describe("solvedAgoWords", () => {
  it("says it in days", () => {
    expect(solvedAgoWords(T0, T0 + 3600)).toBe("Solved today");
    expect(solvedAgoWords(T0, T0 + DAY)).toBe("Solved yesterday");
    expect(solvedAgoWords(T0, T0 + 8 * DAY)).toBe("Solved 8 days ago");
  });
});
