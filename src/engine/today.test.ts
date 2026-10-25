import { describe, expect, it } from "vitest";
import { pickDoThisNext } from "./today";

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
