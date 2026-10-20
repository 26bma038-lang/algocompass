import { describe, expect, it } from "vitest";
import { nextInSheet, problemStatus, sectionKeys, sheetProgress, type Sheet, type SheetProblem, type SolveIndex, type TickRow } from "./sheets";

const p = (key: string, topics: string[] = ["arrays-hashing"], extra: Partial<SheetProblem> = {}): SheetProblem => ({
  key,
  title: key,
  difficulty: "Easy",
  topics,
  ...(key.startsWith("lc:") ? { lc: key.slice(3) } : {}),
  ...extra,
});

const sheet = (id: string, sections: SheetProblem[][]): Sheet => ({
  id,
  name: id,
  short: id,
  creator: "test",
  sourceUrl: "https://example.com",
  sectionLabel: "Step",
  fetched: "2026-10-18",
  status: "complete",
  notes: [],
  sections: sections.map((problems, i) => ({ title: `S${i + 1}`, problems })),
});

const index = (o: Partial<{ lc: [string, number][]; cf: [string, number][]; manual: [string, number][]; ticks: TickRow[] }> = {}): SolveIndex => ({
  lc: new Map(o.lc ?? []),
  cf: new Map(o.cf ?? []),
  manual: new Map(o.manual ?? []),
  ticks: new Map((o.ticks ?? []).map((t) => [t.key, t])),
});

describe("auto-tick", () => {
  it("ticks a LeetCode problem when sync has seen it solved, and a Codeforces one by contest-index", () => {
    const idx = index({ lc: [["two-sum", 100]], cf: [["4-A", 200]] });
    expect(problemStatus("lc:two-sum", idx)).toEqual({ done: true, source: "auto", at: 100 });
    expect(problemStatus("cf:4-A", idx)).toEqual({ done: true, source: "auto", at: 200 });
    expect(problemStatus("lc:3sum", idx).done).toBe(false);
  });

  it("never auto-ticks problems that only live on GFG or takeUforward", () => {
    const idx = index({ lc: [["reverse-the-array", 1]] });
    expect(problemStatus("gfg:reverse-the-array", idx).done).toBe(false);
    expect(problemStatus("tuf:pattern-1", idx).done).toBe(false);
  });

  it("one solve ticks the problem in every sheet that lists it (shared keys)", () => {
    const a2z = sheet("a2z", [[p("lc:two-sum"), p("tuf:pattern-1")], [p("lc:3sum")]]);
    const nc = sheet("nc", [[p("lc:contains-duplicate"), p("lc:two-sum")]]);
    const idx = index({ lc: [["two-sum", 100]] });
    const st = (k: string) => problemStatus(k, idx);
    expect(sheetProgress(a2z, st)).toMatchObject({ done: 1, total: 3, pct: 33 });
    expect(sheetProgress(nc, st)).toMatchObject({ done: 1, total: 2, pct: 50 });
  });
});

describe("manual and bulk ticks", () => {
  it("a manual or bulk tick marks a problem done, with its source", () => {
    const idx = index({ ticks: [{ key: "gfg:x", state: "done", source: "manual", at: 5 }, { key: "tuf:y", state: "done", source: "bulk", at: 6 }] });
    expect(problemStatus("gfg:x", idx)).toEqual({ done: true, source: "manual", at: 5 });
    expect(problemStatus("tuf:y", idx)).toEqual({ done: true, source: "bulk", at: 6 });
  });

  it("Mark solved elsewhere in the app (manual_solves) counts as a manual tick", () => {
    expect(problemStatus("lc:two-sum", index({ manual: [["lc:two-sum", 9]] }))).toEqual({ done: true, source: "manual", at: 9 });
  });

  it("a platform solve wins over a manual tick (it's verified)", () => {
    const idx = index({ lc: [["two-sum", 50]], ticks: [{ key: "lc:two-sum", state: "done", source: "manual", at: 10 }] });
    expect(problemStatus("lc:two-sum", idx).source).toBe("auto");
  });

  it("unticking hides an automatic tick until a newer solve shows up", () => {
    const untick: TickRow = { key: "lc:two-sum", state: "undone", source: "manual", at: 100 };
    expect(problemStatus("lc:two-sum", index({ lc: [["two-sum", 90]], ticks: [untick] })).done).toBe(false);
    expect(problemStatus("lc:two-sum", index({ lc: [["two-sum", 150]], ticks: [untick] }))).toEqual({ done: true, source: "auto", at: 150 });
  });

  it("an untick also overrides an old manual mark", () => {
    const idx = index({ manual: [["lc:two-sum", 5]], ticks: [{ key: "lc:two-sum", state: "undone", source: "manual", at: 10 }] });
    expect(problemStatus("lc:two-sum", idx).done).toBe(false);
  });
});

describe("progress", () => {
  it("counts distinct problems: one listed twice counts once, per section and overall", () => {
    const s = sheet("b75", [[p("lc:merge-k-sorted-lists"), p("lc:reverse-linked-list")], [p("lc:merge-k-sorted-lists"), p("lc:top-k-frequent-elements")]]);
    const pr = sheetProgress(s, (k) => problemStatus(k, index({ lc: [["merge-k-sorted-lists", 1]] })));
    expect(pr.total).toBe(3);
    expect(pr.done).toBe(1);
    expect(pr.sections).toEqual([
      { done: 1, total: 2, pct: 50 },
      { done: 1, total: 2, pct: 50 },
    ]);
    expect(pr.bySource).toEqual({ auto: 1, manual: 0, bulk: 0 });
  });

  it("floors the percent, so 100% means every problem", () => {
    const s = sheet("x", [[p("lc:a"), p("lc:b"), p("lc:c")]]);
    expect(sheetProgress(s, (k) => problemStatus(k, index({ lc: [["a", 1], ["b", 1]] }))).pct).toBe(66);
  });

  it("sectionKeys covers 'I've finished Steps 1–2', deduplicated, in either order", () => {
    const s = sheet("x", [[p("lc:a"), p("lc:b")], [p("lc:a"), p("lc:c")], [p("lc:d")]]);
    expect(sectionKeys(s, 0, 1)).toEqual(["lc:a", "lc:b", "lc:c"]);
    expect(sectionKeys(s, 1, 0)).toEqual(["lc:a", "lc:b", "lc:c"]);
    expect(sectionKeys(s, 2, 9)).toEqual(["lc:d"]);
  });
});

describe("smart next", () => {
  const s = sheet("x", [
    [p("lc:a", ["arrays-hashing"]), p("lc:b", ["arrays-hashing"]), p("lc:c", ["graphs"])],
    [p("lc:d", ["dp"])],
  ]);

  it("is the first unsolved problem in order when there's no topic data", () => {
    expect(nextInSheet(s, (k) => k === "lc:a")?.problem.key).toBe("lc:b");
    expect(nextInSheet(s, () => false)?.weakTopic).toBeNull();
  });

  it("moves a nearby problem in a weak topic up, and says which topic", () => {
    const pick = nextInSheet(s, () => false, new Map([["graphs", 1]]));
    expect(pick?.problem.key).toBe("lc:c");
    expect(pick?.weakTopic).toBe("graphs");
  });

  it("doesn't jump far ahead for a weak topic: only the next few unsolved count", () => {
    const long = sheet("y", [[...Array.from({ length: 12 }, (_, i) => p(`lc:p${i}`)), p("lc:far", ["dp"])]]);
    expect(nextInSheet(long, () => false, new Map([["dp", 1]]))?.problem.key).toBe("lc:p0");
  });

  it("passes over a LeetCode Premium problem while free ones are near, but still offers it when it's all that's left", () => {
    const prem = sheet("p", [[p("lc:locked", ["graphs"], { premium: true }), p("lc:free", ["arrays-hashing"])]]);
    expect(nextInSheet(prem, () => false, new Map([["graphs", 1]]))?.problem.key).toBe("lc:free");
    expect(nextInSheet(prem, (k) => k === "lc:free")?.problem.key).toBe("lc:locked");
  });

  it("skips duplicates and solved problems, and is null when the sheet is done", () => {
    expect(nextInSheet(s, (k) => ["lc:a", "lc:b", "lc:c"].includes(k))?.problem.key).toBe("lc:d");
    expect(nextInSheet(s, () => true)).toBeNull();
  });
});
