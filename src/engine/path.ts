import type { Sheet, SheetProblem } from "./sheets";

/**
 * The Beginner Path (v1.3): AlgoCompass's own sheet. Fourteen steps, each a lesson: Watch (a main
 * video in your language, plus extras), Read (five lines on the pattern), Solve (3 to 5 easy
 * problems). A step is done when its main video is watched (in either language) and its required
 * problems are solved; that unlocks the next one. Pure: the data layer hands in what's solved and watched.
 */

export type VideoLang = "en" | "hi";

export interface PathVideo {
  /** YouTube video id. */
  id: string;
  role: "main" | "extra";
  minutes: number;
  /** Exactly as YouTube's oEmbed reports them (filled by scripts/fill-media.mjs). */
  title: string;
  channel: string;
}

export interface PathProblem extends SheetProblem {
  required: boolean;
  /** Codeforces rating, for CF problems. */
  rating?: number | null;
}

export interface PathStep {
  id: string;
  title: string;
  subtitle: string;
  /** Unified topic ids this step teaches (keeps the topic engine and Topics map consistent). */
  topics: string[];
  read: { when: string; idea: string[]; mistakes: string[] };
  videos: Record<VideoLang, PathVideo[]>;
  problems: PathProblem[];
}

export interface BeginnerPath {
  id: string;
  name: string;
  short: string;
  creator: string;
  steps: PathStep[];
}

/** The path as a sheet (steps are its sections), so sheet progress, ticks and quests work on it unchanged. */
export function pathAsSheet(path: BeginnerPath): Sheet {
  return {
    id: path.id,
    name: path.name,
    short: path.short,
    creator: path.creator,
    sourceUrl: "https://github.com/26bma038-lang/algocompass",
    sectionLabel: "Step",
    fetched: "",
    status: "complete",
    notes: [],
    sections: path.steps.map((s) => ({ title: s.title, problems: s.problems })),
  };
}

/** The main video for a language, falling back to the other language when a step has none. */
export function mainVideo(step: PathStep, lang: VideoLang): PathVideo | null {
  const other: VideoLang = lang === "en" ? "hi" : "en";
  return step.videos[lang].find((v) => v.role === "main") ?? step.videos[other].find((v) => v.role === "main") ?? null;
}

export interface StepProgress {
  /** A main video (either language) is marked watched. */
  watched: boolean;
  required: number;
  requiredDone: number;
  /** Every problem in the step, required or not. */
  solved: number;
  total: number;
  /** Watched and every required problem solved (now). */
  complete: boolean;
}

export function stepProgress(step: PathStep, isDone: (key: string) => boolean, watched: ReadonlySet<string>): StepProgress {
  const mains = [...step.videos.en, ...step.videos.hi].filter((v) => v.role === "main");
  const w = mains.some((v) => watched.has(v.id));
  const req = step.problems.filter((p) => p.required);
  const reqDone = req.filter((p) => isDone(p.key)).length;
  return {
    watched: w,
    required: req.length,
    requiredDone: reqDone,
    solved: step.problems.filter((p) => isDone(p.key)).length,
    total: step.problems.length,
    complete: w && reqDone === req.length,
  };
}

export type StepState = "done" | "current" | "locked";

export interface PathState {
  steps: (StepProgress & { step: PathStep; state: StepState })[];
  /** Index of the step to work on now, or null when the whole path is done. */
  current: number | null;
  doneCount: number;
  /** Steps complete by the data now but not yet recorded: they get the reward moment once. */
  newlyDone: string[];
}

/**
 * Where you are on the path. A step counts as done once recorded (it never re-locks if you untick a
 * problem later) or when it's complete now. Steps unlock in order: the first not-done step is the
 * current one, and everything after it is locked.
 */
export function pathState(path: BeginnerPath, isDone: (key: string) => boolean, watched: ReadonlySet<string>, recorded: ReadonlyMap<string, number>): PathState {
  let current: number | null = null;
  const newlyDone: string[] = [];
  const steps = path.steps.map((step, i) => {
    const p = stepProgress(step, isDone, watched);
    const done = recorded.has(step.id) || (current === null && p.complete);
    if (done && !recorded.has(step.id)) newlyDone.push(step.id);
    let state: StepState;
    if (done && current === null) state = "done";
    else if (current === null) {
      current = i;
      state = "current";
    } else state = "locked";
    return { ...p, step, state };
  });
  return { steps, current, doneCount: steps.filter((s) => s.state === "done").length, newlyDone };
}

export interface NextAction {
  /** "Watch 12 min · then solve 2 problems" */
  label: string;
  /** What the primary button says. */
  button: string;
}

/** The one thing to do next on a step, in words, for the Start here card. */
export function nextAction(p: StepProgress, video: PathVideo | null): NextAction {
  const left = p.required - p.requiredDone;
  const solve = left > 0 ? `solve ${left} ${left === 1 ? "problem" : "problems"}` : "";
  if (!p.watched && video) {
    return { label: solve ? `Watch ${video.minutes} min · then ${solve}` : `Watch ${video.minutes} min`, button: "Start the lesson" };
  }
  if (left > 0) return { label: solve.charAt(0).toUpperCase() + solve.slice(1), button: "Solve the problems" };
  return { label: "Step complete", button: "Open the lesson" };
}
