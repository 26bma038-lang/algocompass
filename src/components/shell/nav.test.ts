import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_NAV, isNavItemActive, LEGACY_REDIRECTS, legacyLessonRedirect, learnTopicPath, lessonPath, navFor, navItemFor, PRIMARY_NAV } from "./nav";

const rows = (items: ReturnType<typeof navFor>) => items.map((n) => [n.label, n.to, n.shortcut]);

describe("navigation (v1.4: one order)", () => {
  it("smart mode: Today · Learn · Practice · Progress · Contests on Ctrl+1–5", () => {
    expect(rows(navFor("smart"))).toEqual([
      ["Today", "/", "1"],
      ["Learn", "/learn", "2"],
      ["Practice", "/practice", "3"],
      ["Progress", "/progress", "4"],
      ["Contests", "/contests", "5"],
    ]);
    // The milestone doesn't apply in smart mode: Contests is always there, never badged.
    expect(navFor("smart", { contestsUnlocked: false }).some((n) => n.to === "/contests")).toBe(true);
    expect(navFor("smart").some((n) => n.badge)).toBe(false);
  });

  it("Beginner mode: the same order and shortcuts, Contests hidden until the milestone", () => {
    expect(rows(navFor("beginner"))).toEqual(rows(navFor("smart")).slice(0, 4));
    const unlocked = navFor("beginner", { contestsUnlocked: true, contestsNew: true });
    expect(rows(unlocked)).toEqual(rows(navFor("smart")));
    expect(unlocked.slice(-1)[0]).toMatchObject({ label: "Contests", shortcut: "5", badge: "New" });
    expect(navFor("beginner", { contestsUnlocked: true, contestsNew: false }).slice(-1)[0]!.badge).toBeUndefined();
  });

  it("the tray menu lists the screens in sidebar order", () => {
    const rs = readFileSync(join(__dirname, "..", "..", "..", "src-tauri", "src", "lib.rs"), "utf8");
    const tray = [...rs.matchAll(/"go:(\/[a-z]*)"/g)].map((m) => m[1]);
    expect(tray).toEqual(navFor("smart").map((n) => n.to));
  });

  it("gives every screen a one-line description and a unique shortcut", () => {
    for (const mode of ["smart", "beginner"] as const) {
      const items = navFor(mode, { contestsUnlocked: true });
      for (const n of items) expect(n.description.length).toBeGreaterThan(10);
      expect(new Set(items.map((n) => n.shortcut)).size).toBe(items.length);
    }
    expect(new Set(ALL_NAV.map((n) => n.shortcut)).size).toBe(ALL_NAV.length);
  });

  it("redirects moved routes: v1.1 screens, and the Beginner Path from Practice to Learn", () => {
    expect(LEGACY_REDIRECTS).toEqual({ "/skill-tree": "/progress/topics", "/quests": "/", "/achievements": "/progress/achievements", "/practice/path": "/learn" });
    for (const to of Object.values(LEGACY_REDIRECTS)) expect(navItemFor(to)).toBeDefined();
    expect(legacyLessonRedirect("/practice/path/hashing")).toBe("/learn/path/hashing");
    expect(legacyLessonRedirect("/practice/path/")).toBe("/learn");
    expect(legacyLessonRedirect("/practice/sheets")).toBeNull();
    expect(lessonPath("dp")).toBe("/learn/path/dp");
    expect(learnTopicPath("binary-search")).toBe("/learn?topic=binary-search");
  });

  it("marks Learn active on lessons and videos, Progress on topic deep links, Today only on /", () => {
    const learn = PRIMARY_NAV.find((n) => n.to === "/learn")!;
    expect(isNavItemActive(learn, "/learn/path/hashing")).toBe(true);
    expect(isNavItemActive(learn, "/learn/watch/abc")).toBe(true);
    expect(navItemFor("/learn/path/hashing")?.label).toBe("Learn");
    const progress = PRIMARY_NAV.find((n) => n.to === "/progress")!;
    expect(isNavItemActive(progress, "/topics/dp")).toBe(true);
    expect(isNavItemActive(PRIMARY_NAV[0]!, "/practice")).toBe(false);
    expect(navItemFor("/settings")?.label).toBe("Settings");
    expect(navItemFor("/debug")).toBeUndefined();
  });
});

describe("tip tour (v1.4)", () => {
  it("is version 4: smart mode follows the sidebar; beginners get no tour (they start in Step 1)", async () => {
    const { tourSteps, TOUR_VERSION } = await import("./TipTour");
    expect(TOUR_VERSION).toBe(4);
    expect(tourSteps(navFor("beginner"), "beginner")).toEqual([]);
    expect(tourSteps(navFor("beginner", { contestsUnlocked: true }), "beginner")).toEqual([]);
    const smart = tourSteps(navFor("smart"), "smart");
    expect(smart.map((s) => s.title)).toEqual(["Today", "Learn", "Practice", "Sheets", "Progress", "Contests"]);
    expect(smart.map((s) => s.shortcut)).toEqual(["1", "2", "3", "3", "4", "5"]);
    expect([smart[3]!.anchor, smart[3]!.to]).toEqual(["/practice", "/practice/sheets"]);
    for (const s of smart) expect(PRIMARY_NAV.some((n) => n.to === s.anchor)).toBe(true);
  }, 30_000); // TipTour pulls in the data layer on first import
});
