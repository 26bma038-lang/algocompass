import { describe, expect, it } from "vitest";
import { tabActive } from "@/components/SegmentedTabs";
import { CONTESTS_TABS } from "./tabs";

describe("Contests tabs (v1.8)", () => {
  it("are Upcoming, Your rounds and Virtual contest", () => {
    expect(CONTESTS_TABS.map((t) => [t.label, t.to])).toEqual([
      ["Upcoming", "/contests"],
      ["Your rounds", "/contests/rounds"],
      ["Virtual contest", "/contests/virtual"],
    ]);
  });

  it("light exactly one tab per route", () => {
    const active = (path: string) => CONTESTS_TABS.filter((t) => tabActive(t, path)).map((t) => t.label);
    expect(active("/contests")).toEqual(["Upcoming"]);
    expect(active("/contests/rounds")).toEqual(["Your rounds"]);
    expect(active("/contests/virtual")).toEqual(["Virtual contest"]);
  });
});
