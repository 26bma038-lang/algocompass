import { describe, expect, it } from "vitest";
import { tabActive } from "@/components/SegmentedTabs";
import { practiceIndexFor, practiceTabs } from "./tabs";

describe("Practice per mode (v1.4; v1.8 adds Your notes)", () => {
  it("smart mode: Today's problems, Sheets, then Your notes", () => {
    expect(practiceTabs("smart").map((t) => [t.label, t.to])).toEqual([
      ["Today's problems", "/practice"],
      ["Sheets", "/practice/sheets"],
      ["Your notes", "/practice/notes"],
    ]);
    expect(practiceIndexFor("smart")).toBe("mix");
  });

  it("Beginner mode: no tabs, the page is the problems from your lessons", () => {
    expect(practiceTabs("beginner")).toEqual([]);
    expect(practiceIndexFor("beginner")).toBe("lessons");
  });

  it("marks the right tab on every Practice route, old ones included", () => {
    const tabs = practiceTabs("smart");
    const active = (path: string) => tabs.filter((t) => tabActive(t, path)).map((t) => t.label);
    expect(active("/practice")).toEqual(["Today's problems"]);
    expect(active("/practice/mix")).toEqual(["Today's problems"]);
    expect(active("/practice/sheets")).toEqual(["Sheets"]);
    expect(active("/practice/sheets/blind-75")).toEqual(["Sheets"]);
    expect(active("/practice/notes")).toEqual(["Your notes"]);
  });
});
