import { describe, expect, it } from "vitest";
import { tabActive } from "@/components/SegmentedTabs";
import { continuePractice, friendsTabShown, progressTabs } from "./tabs";

describe("Progress tabs (v1.8: Overview, Topics, and Friends when there's someone to compare)", () => {
  it("are Overview, Topics and Friends; Your notes moved to Practice", () => {
    expect(progressTabs(true).map((t) => t.label)).toEqual(["Overview", "Topics", "Friends"]);
    expect(progressTabs(false).map((t) => t.label)).toEqual(["Overview", "Topics"]);
  });

  it("shows Friends in smart mode, and in Beginner mode once there's a handle", () => {
    expect(friendsTabShown("smart", { codeforces: "", leetcode: "" })).toBe(true);
    expect(friendsTabShown("beginner", { codeforces: "", leetcode: "" })).toBe(false);
    expect(friendsTabShown("beginner", undefined)).toBe(false);
    expect(friendsTabShown("beginner", { codeforces: "", leetcode: "someone" })).toBe(true);
    expect(friendsTabShown("beginner", { codeforces: "tourist", leetcode: "" })).toBe(true);
  });

  it("has a way back to practice beside the tabs (v1.4 polish)", () => {
    expect(continuePractice("smart", "/learn/path/basics")).toEqual({ to: "/practice", label: "Continue today's practice" });
    expect(continuePractice("beginner", "/learn/path/arrays")).toEqual({ to: "/learn/path/arrays", label: "Continue today's practice" });
    expect(continuePractice("beginner", null).to).toBe("/learn");
  });

  it("light Overview on the badges page and Topics on the map", () => {
    const tabs = progressTabs(true);
    const active = (path: string) => tabs.filter((t) => tabActive(t, path)).map((t) => t.label);
    expect(active("/progress")).toEqual(["Overview"]);
    expect(active("/progress/badges")).toEqual(["Overview"]);
    expect(active("/progress/achievements")).toEqual(["Overview"]);
    expect(active("/progress/topics")).toEqual(["Topics"]);
    expect(active("/progress/topics/map")).toEqual(["Topics"]);
    expect(active("/progress/friends")).toEqual(["Friends"]);
  });
});
