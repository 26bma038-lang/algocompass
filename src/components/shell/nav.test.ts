import { describe, expect, it } from "vitest";
import { ALL_NAV, isNavItemActive, LEGACY_REDIRECTS, legacyLessonRedirect, learnTopicPath, lessonPath, navFor, navItemFor, PRIMARY_NAV } from "./nav";

const rows = (items: ReturnType<typeof navFor>) => items.map((n) => [n.label, n.to, n.shortcut]);

describe("navigation (v1.3: Learn)", () => {
  it("smart mode: Today · Practice · Learn · Progress · Contests on Ctrl+1–5", () => {
    expect(rows(navFor("smart"))).toEqual([
      ["Today", "/", "1"],
      ["Practice", "/practice", "2"],
      ["Learn", "/learn", "3"],
      ["Progress", "/progress", "4"],
      ["Contests", "/contests", "5"],
    ]);
    // The milestone doesn't apply in smart mode: Contests is always there, never badged.
    expect(navFor("smart", { contestsUnlocked: false }).some((n) => n.to === "/contests")).toBe(true);
    expect(navFor("smart").some((n) => n.badge)).toBe(false);
  });

  it("Beginner mode: Today · Learn · Practice · Progress, Contests hidden until the milestone", () => {
    expect(rows(navFor("beginner"))).toEqual([
      ["Today", "/", "1"],
      ["Learn", "/learn", "2"],
      ["Practice", "/practice", "3"],
      ["Progress", "/progress", "4"],
    ]);
    const unlocked = navFor("beginner", { contestsUnlocked: true, contestsNew: true });
    expect(unlocked.slice(-1)[0]).toMatchObject({ label: "Contests", shortcut: "5", badge: "New" });
    expect(navFor("beginner", { contestsUnlocked: true, contestsNew: false }).slice(-1)[0]!.badge).toBeUndefined();
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

describe("tip tour (v1.3)", () => {
  it("is version 3: beginners meet Learn first; smart mode adds Learn after Sheets", async () => {
    const { tourSteps, TOUR_VERSION } = await import("./TipTour");
    expect(TOUR_VERSION).toBe(3);
    const beginner = tourSteps(navFor("beginner"), "beginner");
    expect(beginner.map((s) => s.title)).toEqual(["Learn", "Today", "Practice", "Progress"]);
    expect(beginner[0]!.shortcut).toBe("2");
    // Contests joins the beginner tour only once it's in the sidebar.
    expect(tourSteps(navFor("beginner", { contestsUnlocked: true }), "beginner").slice(-1)[0]!.title).toBe("Contests");
    const smart = tourSteps(navFor("smart"), "smart");
    expect(smart.map((s) => s.title)).toEqual(["Today", "Practice", "Sheets", "Learn", "Progress", "Contests"]);
    expect([smart[2]!.anchor, smart[2]!.to]).toEqual(["/practice", "/practice/sheets"]);
    for (const s of [...beginner, ...smart]) expect(PRIMARY_NAV.some((n) => n.to === s.anchor)).toBe(true);
  }, 30_000); // TipTour pulls in the data layer on first import
});
