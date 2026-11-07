import { describe, expect, it } from "vitest";
import { pickDoThisNext, recommendedNextId } from "./today";

const item = (id: string, done = false) => ({ rec: { id }, done });

describe("smart Today's Do this next (v1.4)", () => {
  it("is the first unsolved problem of today's set", () => {
    expect(pickDoThisNext([item("a", true), item("b"), item("c")], { id: "sheet" })).toEqual({ kind: "mix", problem: { id: "b" }, done: 1, total: 3 });
  });

  it("then the followed sheet's next problem, once today's set is done", () => {
    expect(pickDoThisNext([item("a", true)], { id: "sheet" })).toEqual({ kind: "sheet", next: { id: "sheet" }, done: 1, total: 1 });
    expect(pickDoThisNext(null, { id: "sheet" })).toEqual({ kind: "sheet", next: { id: "sheet" }, done: 0, total: 0 });
  });

  it("says when everything is done, or when there's nothing yet (before the first update)", () => {
    expect(pickDoThisNext([item("a", true), item("b", true)], null)).toEqual({ kind: "all-done", done: 2, total: 2 });
    expect(pickDoThisNext(null, null)).toEqual({ kind: "none" });
    expect(pickDoThisNext([{ rec: null, done: false }], null)).toEqual({ kind: "none" });
  });
});

describe("Practice's Recommended next tag (v1.4 polish)", () => {
  const mix = (platform: "cf" | "lc", problemId: string, done = false) => ({ platform, problemId, done, rec: { id: problemId } });
  it("is the first unsolved problem as Practice lists them (Codeforces, then LeetCode)", () => {
    expect(recommendedNextId([mix("lc", "l1"), mix("cf", "c1", true), mix("cf", "c2")])).toBe("c2");
    expect(recommendedNextId([mix("cf", "c1", true), mix("lc", "l1")])).toBe("l1");
    expect(recommendedNextId([mix("cf", "c1", true)])).toBeNull();
    expect(recommendedNextId([{ platform: "cf", problemId: "gone", done: false, rec: null }, mix("lc", "l1")])).toBe("l1");
  });
  it("tags the same problem Today's Do this next picks", () => {
    const items = [mix("cf", "c1", true), mix("cf", "c2"), mix("lc", "l1")];
    const pick = pickDoThisNext(items, null);
    expect(pick.kind === "mix" && pick.problem.id).toBe(recommendedNextId(items));
  });
});
