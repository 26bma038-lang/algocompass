import type { VideoLang } from "@/data/prefs";
import type { LibraryVideo, TopicGroup } from "./learn";
import { difficultyRank, topicTier, topicsNamed, type PoolProblem, type ProblemPool } from "./mustDo";
import type { BeginnerPath } from "./path";
import { cfParts, type ProblemRef } from "./problemRef";

/**
 * "Stuck?" (v1.7): four steps, one per click, each from real data and none of them a spoiler.
 *   1. what the problem is about (its real tags, or the sheet section it's filed under)
 *   2. a verified video for that topic (src/data/resources.json, checked by check:links)
 *   3. an easier problem on the same topic (from the bundled sheets), to build up to it
 *   4. the platform's own editorial or solutions page
 * Nothing is generated: when a step has nothing real to show, it says so.
 */

export const STUCK_STEPS = ["topic", "video", "easier", "editorial"] as const;
export type StuckStepId = (typeof STUCK_STEPS)[number];

/** The button that reveals each step. */
export const STUCK_LABELS: Record<StuckStepId, string> = {
  topic: "What is it about?",
  video: "Watch a video on it",
  easier: "Try an easier one first",
  editorial: "See the editorial",
};

/** An easier problem on the problem's topic: unsolved, closest below this one, home-topic first. Null when there is none. */
export function easierProblem(pool: Pick<ProblemPool, "problems">, ref: ProblemRef, isSolved: (key: string) => boolean): PoolProblem | null {
  const topic = stuckTopic(ref);
  if (!topic) return null;
  const mine = difficultyRank(ref);
  // A problem nobody rates can't be compared: only the Easy band is offered then.
  const ceiling = Number.isFinite(mine) ? mine : 2;
  const cands = pool.problems.filter((p) => p.key !== ref.key && p.topics.includes(topic) && !isSolved(p.key) && !p.premium && difficultyRank(p) < ceiling);
  cands.sort(
    (a, b) => topicTier(a, topic) - topicTier(b, topic) || difficultyRank(b) - difficultyRank(a) || b.sheets.length - a.sheets.length || a.title.localeCompare(b.title),
  );
  return cands[0] ?? null;
}

/** Codeforces tags almost every problem carries; they say little about how to solve it. */
const BROAD_TOPICS = new Set(["implementation", "brute-force", "math"]);

/**
 * The topic Stuck? is about (v1.8): the problem's first specific topic, skipping the broad tags
 * (implementation, brute force, math) when it has another one. A Greedy + Implementation problem is
 * about greedy. Null when it has no topic at all.
 */
export function stuckTopic(ref: Pick<ProblemRef, "topics">): string | undefined {
  return ref.topics.find((t) => !BROAD_TOPICS.has(t)) ?? ref.topics[0];
}

/**
 * The video step (v1.8: only a video we're sure is about the topic). Sure means its title names the
 * topic (`topicsNamed`), or it's the Beginner Path's own lesson for that topic. Then: not watched
 * yet first, your language first, an explanation (lesson, intro, lecture) before a problem
 * walkthrough. Null when no video is sure, so the panel says so instead of offering "How to start
 * Competitive Programming?" for a greedy problem.
 */
export function stuckVideo(groups: readonly TopicGroup[], topicId: string | undefined, pathData: BeginnerPath | null, watched: ReadonlySet<string>, lang: VideoLang): LibraryVideo | null {
  if (!topicId || !pathData) return null;
  const group = groups.find((g) => g.topicId === topicId);
  if (!group) return null;
  const pathLesson = (v: LibraryVideo) => v.role === "lesson" && v.step !== undefined && pathData.steps[v.step]?.topics[0] === topicId;
  const sure = group.videos.filter((v) => topicsNamed(v.title).includes(topicId) || pathLesson(v));
  const rank = (v: LibraryVideo) => Number(watched.has(v.id)) * 4 + Number(v.lang !== lang) * 2 + Number(v.role === "walkthrough");
  return [...sure].sort((a, b) => rank(a) - rank(b))[0] ?? null;
}

export interface EditorialLink {
  label: string;
  url: string;
  /** One honest line on what's at the end of the link. */
  note: string;
}

/** The platform's own pages for a problem. LeetCode has an editorial and a solutions tab; Codeforces links its tutorial from the round's page. */
export function editorialLinks(ref: ProblemRef): EditorialLink[] {
  if (ref.lc) {
    const base = `https://leetcode.com/problems/${ref.lc}`;
    return [
      { label: "Editorial", url: `${base}/editorial/`, note: "LeetCode's own write-up. Some are Premium only." },
      { label: "Community solutions", url: `${base}/solutions/`, note: "Solutions other people posted, most voted first." },
    ];
  }
  const cf = ref.cf ? cfParts(ref.cf) : null;
  if (cf) {
    const section = cf.contestId >= 100_000 ? "gym" : "contest";
    return [{ label: "The round's page", url: `https://codeforces.com/${section}/${cf.contestId}`, note: "The tutorial is linked from the right-hand side of the round's page, when the authors wrote one." }];
  }
  return ref.url ? [{ label: "Open the problem's page", url: ref.url, note: "This problem has no editorial page of its own that we know of." }] : [];
}
