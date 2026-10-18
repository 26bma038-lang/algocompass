import type { BeginnerPath, PathState, PathStep, StepProgress, VideoLang } from "./path";

/**
 * Learn (v1.3): every verified video in one library, grouped by unified topic, plus the logic that
 * picks what "Continue learning" resumes and what a lesson's one Next button does. Pure: the data
 * layer hands in the catalog, the path, what's watched and the topic engine's weakness.
 */

export type LibraryRole = "lesson" | "lesson-extra" | "intro" | "lecture" | "walkthrough";

export interface LibraryVideo {
  /** YouTube video id. */
  id: string;
  lang: VideoLang;
  role: LibraryRole;
  minutes: number;
  title: string;
  channel: string;
  /** Beginner Path step index (0-based) for lesson videos. */
  step?: number;
}

export interface TopicGroup {
  topicId: string;
  name: string;
  videos: LibraryVideo[];
}

/** The catalog's shape for a topic video (src/data/resources.json `videos`). */
export interface CatalogVideo {
  id: string;
  lang: VideoLang;
  role: "intro" | "lecture" | "walkthrough";
  minutes: number;
  title: string;
  channel: string;
}

/** Library order inside a topic: the lesson's main video, then intro, lecture, walkthrough, lesson extras. */
const ROLE_ORDER: Record<LibraryRole, number> = { lesson: 0, intro: 1, lecture: 2, walkthrough: 3, "lesson-extra": 4 };

/**
 * Every video, once per topic it teaches. Beginner Path videos join each of their step's topics (so
 * Basics shows under Implementation and Math); topic videos come from the catalog. A video listed
 * by both keeps its lesson role. Topics with no video are left out.
 */
export function buildLibrary(
  topics: readonly { id: string; name: string }[],
  catalog: Readonly<Record<string, { videos?: readonly CatalogVideo[] } | undefined>>,
  path: BeginnerPath | null,
): TopicGroup[] {
  const byTopic = new Map<string, Map<string, LibraryVideo>>();
  const add = (topicId: string, v: LibraryVideo) => {
    const m = byTopic.get(topicId) ?? new Map<string, LibraryVideo>();
    byTopic.set(topicId, m);
    const had = m.get(v.id);
    if (!had || ROLE_ORDER[v.role] < ROLE_ORDER[had.role]) m.set(v.id, v);
  };
  path?.steps.forEach((s, i) => {
    for (const lang of ["en", "hi"] as const) {
      for (const v of s.videos[lang]) {
        const lv: LibraryVideo = { id: v.id, lang, role: v.role === "main" ? "lesson" : "lesson-extra", minutes: v.minutes, title: v.title, channel: v.channel, step: i };
        for (const t of s.topics) add(t, lv);
      }
    }
  });
  for (const t of topics) for (const v of catalog[t.id]?.videos ?? []) add(t.id, { ...v });
  return topics.flatMap((t) => {
    const vids = [...(byTopic.get(t.id)?.values() ?? [])];
    if (!vids.length) return [];
    vids.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role] || (a.step ?? 99) - (b.step ?? 99));
    return [{ topicId: t.id, name: t.name, videos: vids }];
  });
}

/** Distinct videos in the library (a video under two topics counts once). */
export function libraryVideoCount(groups: readonly TopicGroup[]): number {
  return new Set(groups.flatMap((g) => g.videos.map((v) => v.id))).size;
}

/**
 * Topic order. Smart mode: weakest first (weakness 1 = weakest, from the topic engine), ties in
 * catalog order. Beginner mode: the Beginner Path's topics in step order, then the rest.
 */
export function orderGroups(
  groups: readonly TopicGroup[],
  mode: "smart" | "beginner",
  weakness: ReadonlyMap<string, number>,
  path: BeginnerPath | null,
): TopicGroup[] {
  const pos = new Map(groups.map((g, i) => [g.topicId, i]));
  if (mode === "beginner") {
    const pathOrder = new Map<string, number>();
    // Step order, then the step's own topic order (Basics teaches implementation, then math).
    path?.steps.forEach((s, i) => s.topics.forEach((t, j) => !pathOrder.has(t) && pathOrder.set(t, i * 100 + j)));
    const rank = (id: string) => pathOrder.get(id) ?? 100_000 + pos.get(id)!;
    return [...groups].sort((a, b) => rank(a.topicId) - rank(b.topicId));
  }
  return [...groups].sort((a, b) => (weakness.get(b.topicId) ?? 0) - (weakness.get(a.topicId) ?? 0) || pos.get(a.topicId)! - pos.get(b.topicId)!);
}

export interface LibraryFilter {
  /** "all" or one language. */
  lang: "all" | VideoLang;
  query: string;
  /** Only this topic, or null for every topic. */
  topic: string | null;
  unwatchedOnly: boolean;
}

const norm = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");

/**
 * Applies the toolbar. Search matches topic names (the whole topic stays) and video titles and
 * channels (just those videos). Empty groups drop out.
 */
export function filterLibrary(groups: readonly TopicGroup[], f: LibraryFilter, watched: ReadonlySet<string>): TopicGroup[] {
  const words = norm(f.query).split(/\s+/).filter(Boolean);
  const has = (text: string) => words.every((w) => norm(text).includes(w));
  return groups.flatMap((g) => {
    if (f.topic && g.topicId !== f.topic) return [];
    const topicHit = words.length > 0 && has(`${g.name} ${g.topicId.replace(/-/g, " ")}`);
    const videos = g.videos.filter(
      (v) => (f.lang === "all" || v.lang === f.lang) && (!f.unwatchedOnly || !watched.has(v.id)) && (words.length === 0 || topicHit || has(`${v.title} ${v.channel}`)),
    );
    return videos.length ? [{ ...g, videos }] : [];
  });
}

/** Where a video lives in the library: its first topic (in catalog order). */
export function findVideo(groups: readonly TopicGroup[], id: string): { video: LibraryVideo; group: TopicGroup } | null {
  for (const g of groups) {
    const video = g.videos.find((v) => v.id === id);
    if (video) return { video, group: g };
  }
  return null;
}

/** What you last opened in Learn (stored as a setting; epoch seconds). */
export interface LearnHistory {
  lesson: { stepId: string; at: number } | null;
  video: { id: string; at: number } | null;
  /** Lessons whose Read part you've been through (it has no other record). */
  read: string[];
}

export const EMPTY_HISTORY: LearnHistory = { lesson: null, video: null, read: [] };

export type ContinueTarget =
  | { kind: "lesson"; stepIndex: number; fresh: boolean }
  | { kind: "video"; videoId: string; topicId: string }
  | { kind: "done" };

/**
 * "Continue learning": the most recent of your last lesson and last video. A lesson that's since
 * been finished (or is locked) resumes at the current step instead. With no history, Beginner mode
 * (or no topic data) starts the path; smart mode starts the weakest topic's first unwatched video.
 */
export function continueLearning(args: {
  history: LearnHistory;
  path: PathState;
  pathData: BeginnerPath;
  groups: readonly TopicGroup[];
  mode: "smart" | "beginner";
  weakness: ReadonlyMap<string, number>;
  watched: ReadonlySet<string>;
  lang: VideoLang;
}): ContinueTarget {
  const { history, path, pathData, groups, mode, weakness, watched, lang } = args;
  const pathTarget = (): ContinueTarget => (path.current === null ? { kind: "done" } : { kind: "lesson", stepIndex: path.current, fresh: false });
  const lessonAt = history.lesson?.at ?? -1;
  const videoAt = history.video?.at ?? -1;
  if (history.video && videoAt > lessonAt) {
    const found = findVideo(groups, history.video.id);
    if (found) return { kind: "video", videoId: found.video.id, topicId: found.group.topicId };
  }
  if (history.lesson) {
    const i = pathData.steps.findIndex((s) => s.id === history.lesson!.stepId);
    if (i >= 0 && path.steps[i]?.state === "current") return { kind: "lesson", stepIndex: i, fresh: false };
    return pathTarget();
  }
  // Nothing opened yet.
  const weakest = mode === "smart" && weakness.size > 0 ? orderGroups(groups, "smart", weakness, pathData)[0] : undefined;
  if (weakest && (weakness.get(weakest.topicId) ?? 0) > 0) {
    const pick = weakest.videos.find((v) => v.lang === lang && !watched.has(v.id)) ?? weakest.videos.find((v) => !watched.has(v.id));
    if (pick) return { kind: "video", videoId: pick.id, topicId: weakest.topicId };
  }
  return path.current === null ? { kind: "done" } : { kind: "lesson", stepIndex: path.current, fresh: path.doneCount === 0 && !path.steps[path.current]!.watched };
}

/** The Beginner Path step that unlocks Contests in Beginner mode: Recursion (step 9). */
export const CONTESTS_MILESTONE_STEP = "recursion";

/** Beginner mode shows Contests once the milestone step is done (recorded steps never re-lock). */
export function contestsReady(path: Pick<PathState, "steps"> | undefined): boolean {
  return path?.steps.some((s) => s.step.id === CONTESTS_MILESTONE_STEP && s.state === "done") ?? false;
}

/** A lesson problem, as the Next button needs it. */
export interface FlowProblem {
  key: string;
  title: string;
  required: boolean;
}

export type LessonStage = "watch" | "read" | "solve" | "done";

export type LessonNext =
  | { kind: "watch"; label: string }
  | { kind: "read"; label: string }
  | { kind: "open"; problem: FlowProblem; index: number; of: number; label: string }
  | { kind: "solved"; problem: FlowProblem; index: number; of: number; label: string }
  | { kind: "next-step"; step: PathStep; label: string }
  | { kind: "finish"; label: string };

/**
 * The lesson's one Next button: mark the video watched → done reading → open the first unsolved
 * required problem → "I solved it" → the next problem → … → "Next step: <name>". `opened` is the
 * problems opened from the button in this visit, so the button can ask whether you solved it.
 */
export function lessonNext(args: {
  progress: Pick<StepProgress, "watched">;
  read: boolean;
  stepDone: boolean;
  problems: readonly FlowProblem[];
  isDone: (key: string) => boolean;
  opened: ReadonlySet<string>;
  nextStep: PathStep | null;
}): LessonNext {
  const { progress, read, stepDone, problems, isDone, opened, nextStep } = args;
  const required = problems.filter((p) => p.required);
  const left = required.filter((p) => !isDone(p.key));
  if (stepDone || (progress.watched && left.length === 0)) {
    return nextStep ? { kind: "next-step", step: nextStep, label: `Next step: ${nextStep.title}` } : { kind: "finish", label: "Pick a sheet to keep going" };
  }
  if (!progress.watched) return { kind: "watch", label: "I've watched the video" };
  if (!read) return { kind: "read", label: "I've read it" };
  const p = left[0]!;
  const index = required.indexOf(p);
  if (opened.has(p.key)) return { kind: "solved", problem: p, index, of: required.length, label: `I solved ${p.title}` };
  return { kind: "open", problem: p, index, of: required.length, label: `Open problem ${index + 1} of ${required.length}: ${p.title}` };
}

/** Which of Watch, Read and Solve are checked. Done steps check all three. */
export function lessonChecks(p: Pick<StepProgress, "watched" | "required" | "requiredDone">, read: boolean, stepDone: boolean) {
  return {
    watch: stepDone || p.watched,
    read: stepDone || read,
    solve: stepDone || p.requiredDone >= p.required,
  };
}

/** The stage the stepper highlights. */
export function lessonStage(next: LessonNext): LessonStage {
  if (next.kind === "watch") return "watch";
  if (next.kind === "read") return "read";
  if (next.kind === "open" || next.kind === "solved") return "solve";
  return "done";
}
