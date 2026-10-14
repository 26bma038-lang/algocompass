import { describe, expect, it } from "vitest";
import universe from "./fixtures/tag-universe.json";
import { PREREQUISITES, TOPICS, TOPIC_BY_ID, topicsForCfTag, topicsForLcTag, topicsForTags, topologicalOrder } from "./topics";

describe("tag mapping", () => {
  it("has roughly 30 topics with unique ids", () => {
    expect(TOPICS.length).toBeGreaterThanOrEqual(28);
    expect(TOPICS.length).toBeLessThanOrEqual(36);
    expect(new Set(TOPICS.map((t) => t.id)).size).toBe(TOPICS.length);
  });

  it.each(universe.cf)("maps Codeforces tag %s", (tag) => {
    expect(topicsForCfTag(tag).length).toBeGreaterThan(0);
  });

  it.each(universe.lc)("maps LeetCode tag %s", (tag) => {
    expect(topicsForLcTag(tag).length).toBeGreaterThan(0);
  });

  it("only maps tags that exist on the platform (no typos)", () => {
    const cf = new Set(universe.cf);
    const lc = new Set(universe.lc);
    for (const t of TOPICS) {
      for (const tag of t.cfTags) expect(cf.has(tag), `CF tag "${tag}" in ${t.id}`).toBe(true);
      for (const tag of t.lcTags) expect(lc.has(tag), `LC tag "${tag}" in ${t.id}`).toBe(true);
    }
  });

  it("is case/whitespace tolerant and ignores unknown tags", () => {
    expect(topicsForCfTag(" DP ")).toEqual(["dp"]);
    expect(topicsForLcTag("Dynamic-Programming")).toEqual(["dp"]);
    expect(topicsForCfTag("not a tag")).toEqual([]);
  });

  it("dedupes topics across tags of one problem", () => {
    expect(topicsForTags(["array", "hash-table", "matrix"], "lc")).toEqual(["arrays-hashing"]);
    expect(topicsForTags(["graphs", "dfs and similar", "trees"], "cf").sort()).toEqual(["graphs", "trees"]);
  });
});

describe("prerequisite DAG", () => {
  it("references only known topics", () => {
    for (const [id, reqs] of Object.entries(PREREQUISITES)) {
      expect(TOPIC_BY_ID.has(id), id).toBe(true);
      for (const r of reqs) expect(TOPIC_BY_ID.has(r), `${id} → ${r}`).toBe(true);
    }
  });

  it("is acyclic and orders prerequisites first", () => {
    const order = topologicalOrder();
    expect(order).toHaveLength(TOPICS.length);
    const pos = new Map(order.map((id, i) => [id, i]));
    for (const [id, reqs] of Object.entries(PREREQUISITES)) {
      for (const r of reqs) expect(pos.get(r)!).toBeLessThan(pos.get(id)!);
    }
  });

  it("has implementation as a root", () => {
    expect(PREREQUISITES.implementation).toBeUndefined();
  });
});
