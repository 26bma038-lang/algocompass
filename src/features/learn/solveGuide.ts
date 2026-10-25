/**
 * "How to solve on LeetCode" (v1.4, audit problem #1): the steps a first-timer needs between
 * pressing Open and ticking the problem. Shown inside the lesson's Solve part.
 */

export const LEETCODE_SIGNUP_URL = "https://leetcode.com/accounts/signup/";

export interface GuideStep {
  title: string;
  body: string;
}

export const SOLVE_GUIDE_STEPS: readonly GuideStep[] = [
  { title: "Make a free LeetCode account", body: "LeetCode is the website where you solve the problems. Signing up is free." },
  { title: "Read the problem", body: "Press Open. Read what it asks, and the examples under it: they show the input and the answer you should give." },
  { title: "Write your code", body: "Pick your language (C++, Java or Python) above the code box on the right, then write your solution there." },
  { title: "Press Run", body: "It tries your code on the examples. If an answer is wrong, fix the code and run it again." },
  { title: "Press Submit", body: "LeetCode tests it on many more cases. A green \"Accepted\" means you've solved it." },
  { title: "Come back and tick it", body: "Press \"I solved it\" here. Or connect your LeetCode username below, and solved problems tick themselves." },
];

/**
 * Whether the guide is open: always when you asked for it ("How to solve on LeetCode"), and for a
 * beginner until they press "Got it". Smart users only get it on request.
 */
export function solveGuideOpen(a: { mode: "smart" | "beginner"; seen: boolean; requested: boolean }): boolean {
  return a.requested || (a.mode === "beginner" && !a.seen);
}

/** The inline "Connect LeetCode" row: a username field until there is one; then (beginners) Update. */
export function connectState(a: { leetcode: string; mode: "smart" | "beginner" }): "ask" | "connected" | "hidden" {
  if (!a.leetcode.trim()) return "ask";
  return a.mode === "beginner" ? "connected" : "hidden";
}
