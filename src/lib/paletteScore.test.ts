import { describe, expect, it } from "vitest";
import { paletteScore } from "./paletteScore";

const rank = (q: string, items: [string, string[]][]) =>
  items
    .map(([v, k]) => ({ v, s: paletteScore(v, q, k) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .map((x) => x.v);

const ITEMS: [string, string[]][] = [
  ["Open today's mix", ["problems", "daily"]],
  ["Contests", ["go", "screen"]],
  ["Open next contest", ["round", "register", "codeforces"]],
  ["Dynamic programming", ["dp", "dynamic-programming", "topic"]],
  ["Two pointers & sliding window", ["two pointers", "sliding-window", "topic"]],
  ["Sync now", ["refresh", "update"]],
];

describe("paletteScore", () => {
  it("puts a name prefix first", () => {
    expect(rank("contests", ITEMS)[0]).toBe("Contests");
    expect(rank("sync", ITEMS)[0]).toBe("Sync now");
  });
  it("finds topics by exact tag and by initials, never through loose keywords", () => {
    expect(rank("dp", ITEMS)).toEqual(["Dynamic programming"]);
    expect(rank("sliding", ITEMS)[0]).toBe("Two pointers & sliding window");
  });
  it("still matches loosely on the name as a last resort", () => {
    expect(rank("dyprog", ITEMS)).toEqual(["Dynamic programming"]);
  });
  it("shows everything for an empty search", () => {
    expect(paletteScore("Anything", "  ")).toBe(1);
  });
});
