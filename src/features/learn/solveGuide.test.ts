import { describe, expect, it } from "vitest";
import { connectState, LEETCODE_SIGNUP_URL, SOLVE_GUIDE_STEPS, solveGuideOpen } from "./solveGuide";

describe("How to solve on LeetCode (v1.4)", () => {
  it("walks account → read → write → Run → Submit → come back and tick", () => {
    expect(SOLVE_GUIDE_STEPS.map((s) => s.title)).toEqual([
      "Make a free LeetCode account",
      "Read the problem",
      "Write your code",
      "Press Run",
      "Press Submit",
      "Come back and tick it",
    ]);
    expect(SOLVE_GUIDE_STEPS[SOLVE_GUIDE_STEPS.length - 1]!.body).toMatch(/connect your LeetCode username/i);
    expect(LEETCODE_SIGNUP_URL).toMatch(/^https:\/\/leetcode\.com\//);
  });

  it("is open for a beginner until Got it, and reopens on request for anyone", () => {
    expect(solveGuideOpen({ mode: "beginner", seen: false, requested: false })).toBe(true);
    expect(solveGuideOpen({ mode: "beginner", seen: true, requested: false })).toBe(false);
    expect(solveGuideOpen({ mode: "beginner", seen: true, requested: true })).toBe(true);
    expect(solveGuideOpen({ mode: "smart", seen: false, requested: false })).toBe(false);
    expect(solveGuideOpen({ mode: "smart", seen: false, requested: true })).toBe(true);
  });

  it("asks for a LeetCode username inside the lesson until there is one", () => {
    expect(connectState({ leetcode: "", mode: "beginner" })).toBe("ask");
    expect(connectState({ leetcode: "  ", mode: "smart" })).toBe("ask");
    // Beginners have no Update in the top bar, so the lesson offers it once connected.
    expect(connectState({ leetcode: "neo", mode: "beginner" })).toBe("connected");
    expect(connectState({ leetcode: "neo", mode: "smart" })).toBe("hidden");
  });
});
