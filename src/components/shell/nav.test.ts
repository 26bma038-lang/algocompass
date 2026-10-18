import { describe, expect, it } from "vitest";
import { ALL_NAV, isNavItemActive, LEGACY_REDIRECTS, navItemFor, PRIMARY_NAV } from "./nav";

describe("navigation (v1.2 simplify)", () => {
  it("has four plain-named screens on Ctrl+1–4", () => {
    expect(PRIMARY_NAV.map((n) => [n.label, n.to, n.shortcut])).toEqual([
      ["Today", "/", "1"],
      ["Practice", "/practice", "2"],
      ["Progress", "/progress", "3"],
      ["Contests", "/contests", "4"],
    ]);
  });

  it("gives every screen a one-line description and a unique shortcut", () => {
    for (const n of ALL_NAV) expect(n.description.length).toBeGreaterThan(10);
    expect(new Set(ALL_NAV.map((n) => n.shortcut)).size).toBe(ALL_NAV.length);
  });

  it("redirects the v1.1 screens to their new home", () => {
    expect(LEGACY_REDIRECTS).toEqual({ "/skill-tree": "/progress/topics", "/quests": "/", "/achievements": "/progress/achievements" });
    for (const to of Object.values(LEGACY_REDIRECTS)) expect(navItemFor(to)).toBeDefined();
  });

  it("marks Progress active on its tabs and on topic deep links, Today only on /", () => {
    const progress = PRIMARY_NAV[2]!;
    expect(isNavItemActive(progress, "/progress/topics")).toBe(true);
    expect(isNavItemActive(progress, "/topics/dp")).toBe(true);
    expect(isNavItemActive(PRIMARY_NAV[0]!, "/practice")).toBe(false);
    expect(navItemFor("/progress/achievements")?.label).toBe("Progress");
    expect(navItemFor("/settings")?.label).toBe("Settings");
    expect(navItemFor("/debug")).toBeUndefined();
  });
});

describe("tip tour (v1.3)", () => {
  it("is version 2, with a Sheets step after Practice that points at Practice and opens the Sheets tab", async () => {
    const { TOUR_STEPS, TOUR_VERSION } = await import("./TipTour");
    expect(TOUR_VERSION).toBe(2);
    expect(TOUR_STEPS.map((s) => s.title)).toEqual(["Today", "Practice", "Sheets", "Progress", "Contests"]);
    const sheets = TOUR_STEPS[2]!;
    expect([sheets.anchor, sheets.to]).toEqual(["/practice", "/practice/sheets"]);
    for (const s of TOUR_STEPS) expect(PRIMARY_NAV.some((n) => n.to === s.anchor)).toBe(true);
  });
});
