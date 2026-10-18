import fs from "node:fs";
import { describe, expect, it } from "vitest";
import {
  buildLibrary,
  continueLearning,
  contestsReady,
  EMPTY_HISTORY,
  filterLibrary,
  findVideo,
  lessonChecks,
  lessonNext,
  lessonStage,
  libraryVideoCount,
  orderGroups,
  type CatalogVideo,
  type FlowProblem,
  type LearnHistory,
} from "./learn";
import { pathState, type BeginnerPath, type PathStep } from "./path";
import { TOPICS } from "./topics";

const PATH = JSON.parse(fs.readFileSync("src/data/path/beginner-path.json", "utf8")) as BeginnerPath;
const RES = JSON.parse(fs.readFileSync("src/data/resources.json", "utf8")).topics as Record<string, { videos: CatalogVideo[] }>;

const video = (id: string, role: "main" | "extra" = "main", minutes = 12) => ({ id, role, minutes, title: `Video ${id}`, channel: "Chan" });
const step = (id: string, topics: string[]): PathStep => ({
  id,
  title: id,
  subtitle: "",
  topics,
  read: { when: "", idea: ["", ""], mistakes: ["", ""] },
  videos: { en: [video(`${id}-en`), video(`${id}-en-x`, "extra")], hi: [video(`${id}-hi`)] },
  problems: [
    { key: `lc:${id}-1`, title: `${id} one`, difficulty: "Easy", topics: [], required: true },
    { key: `lc:${id}-2`, title: `${id} two`, difficulty: "Easy", topics: [], required: true },
    { key: `lc:${id}-3`, title: `${id} three`, difficulty: "Easy", topics: [], required: false },
  ],
});
const MINI: BeginnerPath = { id: "p", name: "P", short: "P", creator: "AlgoCompass", steps: [step("a", ["arrays-hashing"]), step("b", ["strings", "math"])] };
const TOPICS_MINI = [
  { id: "math", name: "Math" },
  { id: "arrays-hashing", name: "Arrays & hashing" },
  { id: "strings", name: "Strings" },
  { id: "graphs", name: "Graph traversal" },
];
const CAT = {
  strings: { videos: [{ id: "b-en", lang: "en", role: "intro", minutes: 9, title: "dupe of lesson", channel: "X" }, { id: "s1", lang: "hi", role: "lecture", minutes: 30, title: "Strings in Hindi", channel: "Luv" }] },
  graphs: { videos: [{ id: "g1", lang: "en", role: "intro", minutes: 15, title: "BFS and DFS", channel: "William Fiset" }] },
} as Record<string, { videos: CatalogVideo[] }>;

describe("the video library", () => {
  const lib = buildLibrary(TOPICS_MINI, CAT, MINI);

  it("groups lesson and topic videos by topic, in catalog order, skipping topics with none", () => {
    expect(lib.map((g) => g.topicId)).toEqual(["math", "arrays-hashing", "strings", "graphs"]);
    // A step teaching two topics lists its videos under both.
    expect(lib.find((g) => g.topicId === "math")!.videos.map((v) => v.id)).toEqual(["b-en", "b-hi", "b-en-x"]);
  });

  it("keeps a video once per topic, with its lesson role winning over the catalog's", () => {
    const strings = lib.find((g) => g.topicId === "strings")!.videos;
    expect(strings.filter((v) => v.id === "b-en")).toHaveLength(1);
    expect(strings.find((v) => v.id === "b-en")!.role).toBe("lesson");
    expect(strings.find((v) => v.id === "b-en")!.step).toBe(1);
    expect(libraryVideoCount(lib)).toBe(8);
  });

  it("covers every verified video in the real catalog and path, each with a length and channel", () => {
    const real = buildLibrary(TOPICS, RES, PATH);
    const ids = new Set([...Object.values(RES).flatMap((t) => t.videos.map((v) => v.id)), ...PATH.steps.flatMap((s) => [...s.videos.en, ...s.videos.hi].map((v) => v.id))]);
    expect(libraryVideoCount(real)).toBe(ids.size);
    for (const g of real) for (const v of g.videos) expect(v.minutes > 0 && v.channel.length > 0 && (v.lang === "en" || v.lang === "hi")).toBe(true);
  });

  it("puts weak topics first in smart mode and Beginner Path topics first in Beginner mode", () => {
    const weak = new Map([
      ["graphs", 1],
      ["strings", 0.6],
      ["math", 0.1],
    ]);
    expect(orderGroups(lib, "smart", weak, MINI).map((g) => g.topicId)).toEqual(["graphs", "strings", "math", "arrays-hashing"]);
    // No topic data: catalog order.
    expect(orderGroups(lib, "smart", new Map(), MINI).map((g) => g.topicId)).toEqual(["math", "arrays-hashing", "strings", "graphs"]);
    expect(orderGroups(lib, "beginner", weak, MINI).map((g) => g.topicId)).toEqual(["arrays-hashing", "strings", "math", "graphs"]);
  });

  it("filters by language, watched and topic, and searches topic names and video titles", () => {
    const f = { lang: "all" as const, query: "", topic: null, unwatchedOnly: false };
    expect(filterLibrary(lib, { ...f, lang: "hi" }, new Set()).flatMap((g) => g.videos.map((v) => v.lang))).not.toContain("en");
    expect(filterLibrary(lib, { ...f, topic: "graphs" }, new Set()).map((g) => g.topicId)).toEqual(["graphs"]);
    expect(filterLibrary(lib, { ...f, unwatchedOnly: true, topic: "graphs" }, new Set(["g1"]))).toEqual([]);
    // A topic name keeps the whole topic; a title or channel keeps just those videos.
    expect(filterLibrary(lib, { ...f, query: "graph" }, new Set())[0]!.videos).toHaveLength(1);
    expect(filterLibrary(lib, { ...f, query: "bfs" }, new Set()).map((g) => g.topicId)).toEqual(["graphs"]);
    expect(filterLibrary(lib, { ...f, query: "luv" }, new Set()).flatMap((g) => g.videos.map((v) => v.id))).toEqual(["s1"]);
    expect(filterLibrary(lib, { ...f, query: "nothing like this" }, new Set())).toEqual([]);
    expect(findVideo(lib, "g1")?.group.topicId).toBe("graphs");
  });
});

describe("continue learning", () => {
  const lib = buildLibrary(TOPICS_MINI, CAT, MINI);
  const state = (watched: string[] = [], solved: string[] = []) => pathState(MINI, (k) => solved.includes(k), new Set(watched), new Map());
  const args = (history: LearnHistory, mode: "smart" | "beginner" = "beginner", weakness = new Map<string, number>(), path = state()) => ({
    history,
    path,
    pathData: MINI,
    groups: lib,
    mode,
    weakness,
    watched: new Set<string>(),
    lang: "en" as const,
  });

  it("starts a new beginner on step 1", () => {
    expect(continueLearning(args(EMPTY_HISTORY))).toEqual({ kind: "lesson", stepIndex: 0, fresh: true });
  });

  it("resumes the most recent of the last lesson and the last video", () => {
    const h: LearnHistory = { lesson: { stepId: "a", at: 100 }, video: { id: "g1", at: 200 }, read: [] };
    expect(continueLearning(args(h))).toEqual({ kind: "video", videoId: "g1", topicId: "graphs" });
    expect(continueLearning(args({ ...h, lesson: { stepId: "a", at: 300 } }))).toEqual({ kind: "lesson", stepIndex: 0, fresh: false });
  });

  it("moves on to the current step once the last lesson is done", () => {
    const done = state(["a-en"], ["lc:a-1", "lc:a-2"]);
    const h: LearnHistory = { lesson: { stepId: "a", at: 100 }, video: null, read: [] };
    expect(continueLearning(args(h, "beginner", new Map(), done))).toEqual({ kind: "lesson", stepIndex: 1, fresh: false });
  });

  it("suggests the weakest topic's first video in smart mode before anything is opened", () => {
    expect(continueLearning(args(EMPTY_HISTORY, "smart", new Map([["graphs", 1]])))).toEqual({ kind: "video", videoId: "g1", topicId: "graphs" });
    // Without topic data it falls back to the path.
    expect(continueLearning(args(EMPTY_HISTORY, "smart")).kind).toBe("lesson");
  });

  it("ignores a remembered video that's no longer in the library", () => {
    expect(continueLearning(args({ lesson: null, video: { id: "gone", at: 5 }, read: [] })).kind).toBe("lesson");
  });
});

describe("the contests milestone (Beginner mode)", () => {
  const solveAll = (upTo: number) => {
    const keys = PATH.steps.slice(0, upTo).flatMap((s) => s.problems.filter((p) => p.required).map((p) => p.key));
    const watched = new Set(PATH.steps.slice(0, upTo).map((s) => s.videos.en.find((v) => v.role === "main")!.id));
    return pathState(PATH, (k) => keys.includes(k), watched, new Map());
  };

  it("is step 9, Recursion", () => {
    expect(PATH.steps[8]!.id).toBe("recursion");
  });

  it("unlocks Contests only once Recursion is done, and keeps it after an untick (recorded steps never re-lock)", () => {
    expect(contestsReady(undefined)).toBe(false);
    expect(contestsReady(solveAll(8))).toBe(false);
    expect(contestsReady(solveAll(9))).toBe(true);
    const recorded = new Map(PATH.steps.slice(0, 9).map((s) => [s.id, 1]));
    expect(contestsReady(pathState(PATH, () => false, new Set(), recorded))).toBe(true);
  });
});

describe("a lesson's Next button", () => {
  const problems: FlowProblem[] = [
    { key: "p1", title: "Two Sum", required: true },
    { key: "p2", title: "Valid Anagram", required: true },
    { key: "p3", title: "Extra", required: false },
  ];
  const next = step("n", ["strings"]);
  const flow = (o: { watched?: boolean; read?: boolean; solved?: string[]; opened?: string[]; stepDone?: boolean; nextStep?: PathStep | null }) =>
    lessonNext({
      progress: { watched: o.watched ?? false },
      read: o.read ?? false,
      stepDone: o.stepDone ?? false,
      problems,
      isDone: (k) => (o.solved ?? []).includes(k),
      opened: new Set(o.opened ?? []),
      nextStep: o.nextStep === undefined ? next : o.nextStep,
    });

  it("walks watch → read → open → solved → next problem → next step, with no choices", () => {
    expect(flow({}).kind).toBe("watch");
    expect(flow({ watched: true }).kind).toBe("read");
    expect(flow({ watched: true, read: true })).toMatchObject({ kind: "open", index: 0, of: 2, label: "Open problem 1 of 2: Two Sum" });
    expect(flow({ watched: true, read: true, opened: ["p1"] })).toMatchObject({ kind: "solved", label: "I solved Two Sum" });
    expect(flow({ watched: true, read: true, opened: ["p1"], solved: ["p1"] })).toMatchObject({ kind: "open", index: 1, label: "Open problem 2 of 2: Valid Anagram" });
    expect(flow({ watched: true, read: true, solved: ["p1", "p2"] })).toMatchObject({ kind: "next-step", label: "Next step: n" });
  });

  it("skips problems already solved (synced) and ends the path with a sheet", () => {
    expect(flow({ watched: true, read: true, solved: ["p1"] })).toMatchObject({ kind: "open", problem: { key: "p2" } });
    expect(flow({ stepDone: true, nextStep: null }).kind).toBe("finish");
    // Extra problems never block the step.
    expect(flow({ watched: true, solved: ["p1", "p2"] }).kind).toBe("next-step");
  });

  it("checks Watch, Read and Solve as they're done, and all three on a done step", () => {
    expect(lessonChecks({ watched: true, required: 2, requiredDone: 1 }, false, false)).toEqual({ watch: true, read: false, solve: false });
    expect(lessonChecks({ watched: false, required: 2, requiredDone: 0 }, false, true)).toEqual({ watch: true, read: true, solve: true });
    expect(lessonStage(flow({ watched: true }))).toBe("read");
    expect(lessonStage(flow({ watched: true, read: true }))).toBe("solve");
  });
});
