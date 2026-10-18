import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { memoryRepo } from "@/test/sqljs";
import { problemStatus, sectionKeys, type Sheet } from "@/engine/sheets";
import { TOPIC_BY_ID } from "@/engine/topics";
import { buildSolveIndex, bulkTick, openTarget, setTicked, SHEET_IDS, undoBulkTick, viewOf } from "./sheets";

const load = (id: string): Sheet => JSON.parse(fs.readFileSync(`src/data/sheets/${id}.json`, "utf8")) as Sheet;
const SHEETS = SHEET_IDS.map(load);

describe("bundled sheet data", () => {
  it.each(SHEET_IDS)("%s is well formed, credited and uses known topics", (id) => {
    const s = load(id);
    expect(s.id).toBe(id);
    expect(s.creator).toBeTruthy();
    expect(s.sourceUrl).toMatch(/^https:\/\//);
    expect(s.sections.length).toBeGreaterThan(0);
    for (const sec of s.sections) {
      expect(sec.problems.length).toBeGreaterThan(0);
      for (const p of sec.problems) {
        expect(p.key).toBeTruthy();
        expect(p.topics.length).toBeGreaterThan(0);
        for (const t of p.topics) expect(TOPIC_BY_ID.has(t), `${id}: ${p.title} topic ${t}`).toBe(true);
        if (p.lc) expect(p.key).toBe(`lc:${p.lc}`);
        if (p.difficulty !== null) expect(["Easy", "Medium", "Hard"]).toContain(p.difficulty);
      }
    }
  });

  it("gives a problem the same key in every sheet (one solve ticks it everywhere)", () => {
    const byLc = new Map<string, Set<string>>();
    for (const s of SHEETS) for (const sec of s.sections) for (const p of sec.problems) if (p.lc) byLc.set(p.lc, (byLc.get(p.lc) ?? new Set()).add(p.key));
    for (const [slug, keys] of byLc) expect([...keys], slug).toEqual([`lc:${slug}`]);
    // Two Sum is in A2Z, NeetCode 150 and Blind 75.
    const holders = SHEETS.filter((s) => s.sections.some((sec) => sec.problems.some((p) => p.key === "lc:two-sum"))).map((s) => s.id);
    expect(holders).toEqual(expect.arrayContaining(["striver-a2z", "neetcode-150", "blind-75"]));
  });

  it("Open prefers LeetCode, and falls back to the sheet's own link", () => {
    const a2z = load("striver-a2z");
    const all = a2z.sections.flatMap((s) => s.problems);
    const onLc = all.find((p) => p.lc)!;
    const tufOnly = all.find((p) => !p.lc && p.links?.tuf)!;
    expect(openTarget(onLc)).toMatchObject({ site: "LeetCode", autoTicks: true });
    expect(openTarget(tufOnly)).toMatchObject({ site: "takeUforward", autoTicks: false });
  });
});

describe("ticking against the real schema", () => {
  const a2z = load("striver-a2z");
  const nc = load("neetcode-150");
  const twoSum = a2z.sections.flatMap((s) => s.problems).find((p) => p.key === "lc:two-sum")!;

  it("a synced LeetCode solve ticks the problem in A2Z and NeetCode 150", async () => {
    const repo = await memoryRepo();
    await repo.saveLcRecentAc([{ id: "1", title: "Two Sum", slug: "two-sum", timestamp: 1000 }]);
    const idx = await buildSolveIndex(repo);
    expect(viewOf(a2z, idx, new Map()).status("lc:two-sum")).toMatchObject({ done: true, source: "auto" });
    expect(viewOf(nc, idx, new Map()).progress.done).toBe(1);
  });

  it("a manual tick on a LeetCode problem is also a Mark solved; unticking removes both", async () => {
    const repo = await memoryRepo();
    await setTicked(repo, twoSum, true, 500);
    expect((await repo.getManualSolves()).map((m) => m.problemId)).toEqual(["two-sum"]);
    expect(problemStatus("lc:two-sum", await buildSolveIndex(repo))).toMatchObject({ done: true, source: "manual" });
    await setTicked(repo, twoSum, false, 600);
    expect(await repo.getManualSolves()).toEqual([]);
    expect(problemStatus("lc:two-sum", await buildSolveIndex(repo)).done).toBe(false);
  });

  it("a manual tick on a GFG-only problem stays in the sheet store", async () => {
    const repo = await memoryRepo();
    const gfg = load("babbar-450").sections[0]!.problems.find((p) => p.key.startsWith("gfg:"))!;
    await setTicked(repo, gfg, true, 500);
    expect(await repo.getManualSolves()).toEqual([]);
    expect(problemStatus(gfg.key, await buildSolveIndex(repo))).toMatchObject({ done: true, source: "manual" });
  });

  it("bulk-ticks whole steps without counting them as solves, and Undo restores what was there", async () => {
    const repo = await memoryRepo();
    const keys = sectionKeys(a2z, 0, 1);
    // One problem was already unticked by hand; one is already solved on LeetCode.
    await repo.setSheetTicks([{ key: keys[0]!, state: "undone", source: "manual", at: 10 }]);
    const solvedSlug = keys.find((k) => k.startsWith("lc:"))!.slice(3);
    await repo.saveLcRecentAc([{ id: "9", title: "x", slug: solvedSlug, timestamp: 5 }]);
    const ticked = await bulkTick(repo, keys, await buildSolveIndex(repo), 2000);
    expect(ticked).not.toContain(`lc:${solvedSlug}`);
    expect(ticked.length).toBe(keys.length - 1);
    expect(await repo.getManualSolves()).toEqual([]);
    const idx = await buildSolveIndex(repo);
    expect(keys.every((k) => problemStatus(k, idx).done)).toBe(true);
    expect(viewOf(a2z, idx, new Map()).progress.bySource.bulk).toBe(ticked.length);

    await undoBulkTick(repo, ticked, 2000);
    const after = await buildSolveIndex(repo);
    expect(after.ticks.get(keys[0]!)).toMatchObject({ state: "undone", at: 10 });
    expect(keys.filter((k) => problemStatus(k, after).done)).toEqual([`lc:${solvedSlug}`]);
  });

  it("notes are saved, updated and deleted when emptied", async () => {
    const repo = await memoryRepo();
    await repo.saveSheetNote("lc:two-sum", "hash map, one pass", 1);
    await repo.saveSheetNote("lc:two-sum", "hash map, one pass; watch duplicates", 2);
    expect(await repo.getSheetNotes()).toEqual([{ key: "lc:two-sum", body: "hash map, one pass; watch duplicates", updatedAt: 2 }]);
    await repo.saveSheetNote("lc:two-sum", "  ", 3);
    expect(await repo.getSheetNotes()).toEqual([]);
  });
});
