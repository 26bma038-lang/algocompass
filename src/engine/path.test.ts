import fs from "node:fs";
import { describe, expect, it } from "vitest";
import { TOPIC_BY_ID } from "./topics";
import { mainVideo, nextAction, pathAsSheet, pathState, stepProgress, type BeginnerPath, type PathStep } from "./path";

const PATH = JSON.parse(fs.readFileSync("src/data/path/beginner-path.json", "utf8")) as BeginnerPath;

const video = (id: string, role: "main" | "extra" = "main", minutes = 12) => ({ id, role, minutes, title: id, channel: "c" });
const step = (id: string, required = 2, extra = 1): PathStep => ({
  id,
  title: id,
  subtitle: "",
  topics: ["arrays-hashing"],
  read: { when: "", idea: ["", ""], mistakes: ["", ""] },
  videos: { en: [video(`${id}-en`)], hi: [video(`${id}-hi`)] },
  problems: [
    ...Array.from({ length: required }, (_, i) => ({ key: `lc:${id}-r${i}`, title: "", difficulty: "Easy" as const, topics: [], required: true })),
    ...Array.from({ length: extra }, (_, i) => ({ key: `lc:${id}-x${i}`, title: "", difficulty: "Easy" as const, topics: [], required: false })),
  ],
});
const path = (n: number): BeginnerPath => ({ id: "p", name: "P", short: "P", creator: "AlgoCompass", steps: Array.from({ length: n }, (_, i) => step(`s${i + 1}`)) });

describe("the bundled Beginner Path", () => {
  it("has the 14 steps in the agreed order", () => {
    expect(PATH.steps.map((s) => s.title)).toEqual([
      "Basics",
      "Arrays",
      "Strings",
      "Hashing",
      "Two Pointers",
      "Sliding Window",
      "Stack and Queue",
      "Binary Search",
      "Recursion",
      "Linked List",
      "Trees",
      "Graphs",
      "Greedy",
      "Dynamic Programming",
    ]);
  });

  it.each(PATH.steps.map((s) => [s.title, s] as const))("%s is a full lesson: videos in both languages, 5 lines to read, 3–5 problems", (_, s) => {
    for (const t of s.topics) expect(TOPIC_BY_ID.has(t), t).toBe(true);
    for (const lang of ["en", "hi"] as const) {
      const vids = s.videos[lang];
      expect(vids.filter((v) => v.role === "main")).toHaveLength(1);
      expect(vids.filter((v) => v.role === "extra").length).toBeGreaterThanOrEqual(1);
      expect(vids.filter((v) => v.role === "extra").length).toBeLessThanOrEqual(2);
      for (const v of vids) {
        expect(v.id).toMatch(/^[\w-]{11}$/);
        expect(v.title && v.channel, `${v.id} needs oEmbed title and channel`).toBeTruthy();
      }
    }
    expect(1 + s.read.idea.length + s.read.mistakes.length).toBe(5);
    expect(s.problems.length).toBeGreaterThanOrEqual(3);
    expect(s.problems.length).toBeLessThanOrEqual(5);
    expect(s.problems.filter((p) => p.required).length).toBe(3);
    for (const p of s.problems) {
      expect(p.key).toBe(p.lc ? `lc:${p.lc}` : `cf:${p.cf}`);
      if (p.lc) expect(p.difficulty).toBe("Easy");
      expect(p.premium).toBeFalsy();
    }
  });

  it("works as a sheet: steps are sections, so sheet ticks and progress apply", () => {
    const sheet = pathAsSheet(PATH);
    expect(sheet.sections).toHaveLength(14);
    expect(sheet.sections[3]!.problems.map((p) => p.key)).toContain("lc:two-sum");
  });
});

describe("step progress and unlocking", () => {
  it("a step needs the main video (either language) and every required problem; extras don't matter", () => {
    const s = step("a");
    const none = stepProgress(s, () => false, new Set());
    expect(none).toMatchObject({ watched: false, required: 2, requiredDone: 0, complete: false });
    const solved = (k: string) => k.includes("-r");
    expect(stepProgress(s, solved, new Set()).complete).toBe(false);
    expect(stepProgress(s, solved, new Set(["a-hi"])).complete).toBe(true);
    // An extra video alone isn't enough.
    const withExtra = { ...s, videos: { en: [video("a-en"), video("a-x", "extra")], hi: [] } };
    expect(stepProgress(withExtra, solved, new Set(["a-x"])).complete).toBe(false);
  });

  it("starts on step 1 with everything else locked", () => {
    const st = pathState(path(3), () => false, new Set(), new Map());
    expect(st.steps.map((s) => s.state)).toEqual(["current", "locked", "locked"]);
    expect(st.current).toBe(0);
  });

  it("finishing a step unlocks the next one, and flags it for its reward moment once", () => {
    const p = path(3);
    const done = (k: string) => k.startsWith("lc:s1-");
    const st = pathState(p, done, new Set(["s1-en"]), new Map());
    expect(st.steps.map((s) => s.state)).toEqual(["done", "current", "locked"]);
    expect(st.newlyDone).toEqual(["s1"]);
    // Recorded: no second reward.
    expect(pathState(p, done, new Set(["s1-en"]), new Map([["s1", 1]])).newlyDone).toEqual([]);
  });

  it("a recorded step never re-locks, even if a problem is unticked later", () => {
    const st = pathState(path(2), () => false, new Set(), new Map([["s1", 1]]));
    expect(st.steps.map((s) => s.state)).toEqual(["done", "current"]);
  });

  it("solving a locked step's problems doesn't skip ahead: steps unlock in order", () => {
    const st = pathState(path(3), (k) => k.startsWith("lc:s2-"), new Set(["s2-en"]), new Map());
    expect(st.steps.map((s) => s.state)).toEqual(["current", "locked", "locked"]);
    expect(st.newlyDone).toEqual([]);
  });

  it("the whole path done leaves no current step", () => {
    const st = pathState(path(2), () => true, new Set(["s1-en", "s2-en"]), new Map());
    expect(st.current).toBeNull();
    expect(st.doneCount).toBe(2);
  });
});

describe("the Start here line", () => {
  const s = step("h", 3);
  it("says 'Watch N min · then solve K problems' before the video", () => {
    expect(nextAction(stepProgress(s, () => false, new Set()), mainVideo(s, "en"))).toEqual({ label: "Watch 12 min · then solve 3 problems", button: "Start the lesson" });
  });
  it("counts down the problems after the video", () => {
    const p = stepProgress(s, (k) => k === "lc:h-r0", new Set(["h-en"]));
    expect(nextAction(p, mainVideo(s, "en")).label).toBe("Solve 2 problems");
  });
  it("falls back to the other language's main video when a step has none in yours", () => {
    const enOnly = { ...s, videos: { en: [video("e")], hi: [] } };
    expect(mainVideo(enOnly, "hi")?.id).toBe("e");
  });
});
