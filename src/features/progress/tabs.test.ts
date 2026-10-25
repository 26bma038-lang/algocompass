import { describe, expect, it } from "vitest";
import { tabActive } from "@/components/SegmentedTabs";
import { PROGRESS_TABS } from "./tabs";

describe("Progress tabs (v1.4: two instead of three)", () => {
  it("are Overview and Topics", () => {
    expect(PROGRESS_TABS.map((t) => t.label)).toEqual(["Overview", "Topics"]);
  });

  it("light Overview on the badges page and Topics on the map", () => {
    const active = (path: string) => PROGRESS_TABS.filter((t) => tabActive(t, path)).map((t) => t.label);
    expect(active("/progress")).toEqual(["Overview"]);
    expect(active("/progress/badges")).toEqual(["Overview"]);
    expect(active("/progress/achievements")).toEqual(["Overview"]);
    expect(active("/progress/topics")).toEqual(["Topics"]);
    expect(active("/progress/topics/map")).toEqual(["Topics"]);
  });
});
