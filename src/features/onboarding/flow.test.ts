import { describe, expect, it } from "vitest";
import beginnerPath from "@/data/path/beginner-path.json";
import { landingPath, onboardingFields, primaryLabel, validateOnboarding } from "./flow";

const none = { codeforces: "", leetcode: "" };

describe("onboarding (v1.4)", () => {
  it("asks a beginner only two things: New to DSA?, then the video language", () => {
    expect(onboardingFields(null)).toEqual({ language: false, handles: [] });
    expect(onboardingFields("beginner")).toEqual({ language: true, handles: [] });
    expect(primaryLabel("beginner")).toBe("Start lesson 1");
  });

  it("never asks a beginner for a LeetCode or Codeforces username, and never blocks on one", () => {
    expect(validateOnboarding("beginner", none)).toEqual({});
    // Leftovers typed before switching from "No" to "Yes" are ignored, not validated.
    expect(validateOnboarding("beginner", { codeforces: "x", leetcode: "bad name!" })).toEqual({});
  });

  it("takes a beginner straight to Step 1's lesson", () => {
    const first = (beginnerPath as { steps: { id: string }[] }).steps[0]!.id;
    expect(landingPath("beginner", first)).toBe(`/learn/path/${first}`);
    expect(landingPath("beginner", undefined)).toBe("/");
  });

  it("keeps the handles for smart users: Codeforces required, LeetCode optional", () => {
    expect(onboardingFields("smart")).toEqual({ language: true, handles: ["codeforces", "leetcode"] });
    expect(primaryLabel("smart")).toBe("Continue");
    expect(validateOnboarding("smart", none).cf).toMatch(/Codeforces username/);
    expect(validateOnboarding("smart", { codeforces: "ab", leetcode: "" }).cf).toMatch(/3–24/);
    expect(validateOnboarding("smart", { codeforces: "enkrid", leetcode: "bad name!" })).toEqual({ lc: expect.stringMatching(/letters/) });
    expect(validateOnboarding("smart", { codeforces: "enkrid", leetcode: "" })).toEqual({});
    expect(landingPath("smart", "basics")).toBe("/");
  });

  it("asks to pick a mode first", () => {
    expect(validateOnboarding(null, none).mode).toMatch(/Pick one/);
    expect(primaryLabel(null)).toBe("Continue");
  });
});
