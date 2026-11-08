import { describe, expect, it } from "vitest";
import type { CfProblem } from "@/data/types";
import { BEGINNER_WINDOW, cfKey, cfSharpen, sharpenCount, sharpenWindow } from "./cfSharpen";

const cf = (key: string, rating: number | null, tags: string[], solvedCount: number | null, contestId: number | null = Number(key.split("-")[0])): CfProblem => ({
  key,
  contestId,
  index: key.split("-")[1] ?? "A",
  name: `Problem ${key}`,
  rating,
  tags,
  solvedCount,
});

const SET: CfProblem[] = [
  cf("4-A", 800, ["brute force", "math"], 400_000),
  cf("1-A", 1000, ["math"], 200_000),
  cf("71-A", 800, ["strings"], 300_000),
  cf("100-B", 1200, ["greedy", "math"], 90_000),
  cf("200-C", 1300, ["math"], 500_000), // above the beginner window
  cf("300-A", 900, ["math"], null), // no stats yet
  cf("400-A", null, ["math"], 1_000), // unrated
  cf("ps-1", 900, ["math"], 50_000, null), // problemset-only, no round to open
  cf("500-A", 900, ["math", "*special"], 600_000), // April Fools
];
const none = () => false;
const keys = (ps: CfProblem[]) => ps.map((p) => p.key);

describe("sharpenWindow", () => {
  it("is 800 to 1200 with no rating or in Beginner mode", () => {
    expect(sharpenWindow(null)).toEqual(BEGINNER_WINDOW);
    expect(sharpenWindow(0)).toEqual(BEGINNER_WINDOW);
    expect(sharpenWindow(1500, true)).toEqual(BEGINNER_WINDOW);
  });

  it("is your rating rounded to 100, up to 200 above, like Today's problems", () => {
    expect(sharpenWindow(1008)).toEqual({ lo: 1000, hi: 1200 });
    expect(sharpenWindow(1450)).toEqual({ lo: 1500, hi: 1700 });
    expect(sharpenWindow(600)).toEqual({ lo: 800, hi: 1000 });
    expect(sharpenWindow(3600)).toEqual({ lo: 3300, hi: 3500 });
  });
});

describe("cfSharpen", () => {
  it("picks the topic's problems in the window, most solved first", () => {
    expect(keys(cfSharpen(SET, "math", BEGINNER_WINDOW, none, 5))).toEqual(["4-A", "1-A", "100-B", "300-A"]);
    expect(keys(cfSharpen(SET, "math", BEGINNER_WINDOW, none))).toEqual(["4-A", "1-A"]);
  });

  it("maps tags to topics through topics.json", () => {
    expect(keys(cfSharpen(SET, "strings", BEGINNER_WINDOW, none))).toEqual(["71-A"]);
    expect(keys(cfSharpen(SET, "greedy", BEGINNER_WINDOW, none))).toEqual(["100-B"]);
    // Linked lists have no Codeforces tag.
    expect(cfSharpen(SET, "linked-lists", BEGINNER_WINDOW, none)).toEqual([]);
  });

  it("leaves out unrated, round-less and April Fools problems", () => {
    const out = keys(cfSharpen(SET, "math", { lo: 800, hi: 3500 }, none, 20));
    expect(out).not.toContain("400-A");
    expect(out).not.toContain("ps-1");
    expect(out).not.toContain("500-A");
  });

  it("skips solved problems (by the app's key) but keeps ones ticked on this screen, and leaves out the card's own", () => {
    const solved = new Set(["cf:4-A"]);
    expect(keys(cfSharpen(SET, "math", BEGINNER_WINDOW, (k) => solved.has(k)))).toEqual(["1-A", "100-B"]);
    expect(keys(cfSharpen(SET, "math", BEGINNER_WINDOW, (k) => solved.has(k), 2, { keep: new Set(["cf:4-A"]) }))).toEqual(["4-A", "1-A"]);
    expect(keys(cfSharpen(SET, "math", BEGINNER_WINDOW, none, 2, { exclude: new Set(["cf:4-A"]) }))).toEqual(["1-A", "100-B"]);
    expect(cfKey(SET[0]!)).toBe("cf:4-A");
  });

  it("returns nothing for n = 0", () => {
    expect(cfSharpen(SET, "math", BEGINNER_WINDOW, none, 0)).toEqual([]);
  });
});

describe("sharpenCount", () => {
  it("adds two Codeforces rows to a well-covered topic", () => {
    expect(sharpenCount(5, 120)).toBe(2);
    expect(sharpenCount(0, 120)).toBe(2);
  });

  it("fills a thin topic's card up to five rows", () => {
    expect(sharpenCount(0, 0)).toBe(5);
    expect(sharpenCount(1, 1)).toBe(4);
    expect(sharpenCount(2, 2)).toBe(3);
    // Never fewer than the usual two.
    expect(sharpenCount(4, 2)).toBe(2);
  });
});
