import { describe, expect, it } from "vitest";
import { filterNotes, noteEntries, titleFromKey, type SavedNote } from "./notes";

const n = (key: string, body: string, updatedAt: number, title: string | null = null): SavedNote => ({ key, body, updatedAt, title });

describe("noteEntries", () => {
  const lookup = (k: string) => (k === "lc:two-sum" ? "Two Sum" : undefined);
  it("is newest first and uses the stored title, then the sheets', then the key's words", () => {
    const list = noteEntries([n("lc:two-sum", "hash map", 1), n("cf:4-A", "parity", 3, "Watermelon"), n("gfg:some-thing", "x", 2)], lookup);
    expect(list.map((e) => e.title)).toEqual(["Watermelon", "some thing", "Two Sum"]);
  });
  it("drops empty notes", () => {
    expect(noteEntries([n("lc:a", "  ", 1)], lookup)).toEqual([]);
  });
  it("makes words from a key", () => {
    expect(titleFromKey("lc:two-sum")).toBe("two sum");
    expect(titleFromKey("odd")).toBe("odd");
  });
});

describe("filterNotes", () => {
  const entries = noteEntries([n("lc:two-sum", "Used a hash map, forgot duplicates", 2, "Two Sum"), n("cf:4-A", "parity of w", 1, "Watermelon")], () => undefined);
  it("matches title or body, every word, any order, ignoring case", () => {
    expect(filterNotes(entries, "HASH duplicates").map((e) => e.title)).toEqual(["Two Sum"]);
    expect(filterNotes(entries, "watermelon parity").map((e) => e.title)).toEqual(["Watermelon"]);
    expect(filterNotes(entries, "hash parity")).toEqual([]);
  });
  it("returns everything for an empty query", () => {
    expect(filterNotes(entries, "   ")).toHaveLength(2);
  });
});
