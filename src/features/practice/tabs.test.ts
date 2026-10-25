import { describe, expect, it } from "vitest";
import { tabActive } from "@/components/SegmentedTabs";
import { practiceIndexFor, practiceTabs } from "./tabs";

describe("Practice per mode (v1.4)", () => {
  it("smart mode: two tabs, Today's problems then Sheets", () => {
    expect(practiceTabs("smart").map((t) => [t.label, t.to])).toEqual([
      ["Today's problems", "/practice"],
      ["Sheets", "/practice/sheets"],
    ]);
    expect(practiceIndexFor("smart")).toBe("mix");
  });

  it("Beginner mode: no tabs, the page is the problems from your lessons", () => {
    expect(practiceTabs("beginner")).toEqual([]);
    expect(practiceIndexFor("beginner")).toBe("lessons");
  });

  it("marks the right tab on every Practice route, old ones included", () => {
    const [mix, sheets] = practiceTabs("smart");
    const active = (path: string) => [mix!, sheets!].filter((t) => tabActive(t, path)).map((t) => t.label);
    expect(active("/practice")).toEqual(["Today's problems"]);
    expect(active("/practice/mix")).toEqual(["Today's problems"]);
    expect(active("/practice/sheets")).toEqual(["Sheets"]);
    expect(active("/practice/sheets/blind-75")).toEqual(["Sheets"]);
  });
});
