import type { CfProblem, CfSubmission, LcDifficulty, MixItem, Platform, RecFeedback } from "@/data/types";
import { STATUS_THRESHOLDS, UNRATED_BASELINE, type TopicStatus, type TopicStrength } from "./strength";
import { TOPIC_BY_ID, topicsForTags } from "./topics";

/*
 * The recommender: what to study next and which problems to do. LeetCode is where a topic is
 * learned, Codeforces where it's sharpened (PRODUCT.md), so every topic is in one of two modes and
 * gets problems from the matching platform. Pure: all data comes in through `RecommenderInput`.
 */

// ---------- tunables ----------

/** A topic moves from Learn to Sharpen after this many solves in it. */
export const LEARN_SOLVES_TO_SHARPEN = 5;
/** Sharpen problems are rated from your (rounded) rating up to this much above it. */
export const SHARPEN_SPAN = 200;
/** Codeforces rates problems in steps of 100. */
export const RATING_STEP = 100;
/** One "Too easy" / "Too hard" press moves that topic's window by this much (LC: one level). */
export const FEEDBACK_STEP = 100;
export const OFFSET_LIMITS = { min: -300, max: 400 } as const;
/** The lowest Codeforces problem rating. */
export const MIN_CF_RATING = 800;
/** Prefer problems from contests in the last ~2 years (closer to today's style). */
export const RECENT_SECONDS = 2 * 365 * 86_400;
/** Days without practice stop adding urgency past this. */
export const STALE_DAYS_CAP = 60;
/** Mix of the Day: Codeforces sharpen problems + LeetCode learn problems. */
export const MIX_SIZE = { cf: 3, lc: 2 } as const;

const DAY = 86_400;

// ---------- types ----------

export type TopicMode = "learn" | "sharpen";

/** One problem from src/data/lc_lists.json. */
export interface CuratedLcProblem {
  slug: string;
  title: string;
  difficulty: LcDifficulty;
  /** The learning path it belongs to. */
  topic: string;
  /** Path topic first, then every topic LeetCode's tags map to. */
  topics: string[];
  list: string;
  /** 1-based place in its path (Easy → Medium → Hard). */
  order: number;
}

export interface RecommenderInput {
  now: number; // epoch seconds
  cfRating: number | null;
  topics: readonly TopicStrength[];
  /** Share of CF problems near your rating that carry each topic (engine/standing.ts). */
  frequency: ReadonlyMap<string, number>;
  cfProblems: readonly CfProblem[];
  cfSubmissions: readonly CfSubmission[];
  /** CF contest id → start time. Missing contests simply don't count as recent. */
  contestTimes: ReadonlyMap<number, number>;
  lcCurated: readonly CuratedLcProblem[];
  /** LeetCode slugs you've solved (as far as LeetCode lets us see). */
  lcSolved: ReadonlySet<string>;
  feedback: readonly RecFeedback[];
}

export interface CfRec {
  platform: "cf";
  id: string; // problem key
  contestId: number;
  index: string;
  name: string;
  rating: number;
  topics: string[];
  /** The topic it was recommended for. */
  topicId: string;
  /** From a contest in the last ~2 years. */
  recent: boolean;
  /** Contest start (epoch seconds), when known. */
  contestStart: number | null;
}

export interface LcRec {
  platform: "lc";
  id: string; // slug
  title: string;
  difficulty: LcDifficulty;
  topics: string[];
  topicId: string;
  list: string;
  order: number;
  /** True when this is the topic's own learning path (not a cross-listed problem). */
  onPath: boolean;
}

export type Rec = CfRec | LcRec;

export interface UpsolveRec {
  platform: "cf";
  id: string;
  contestId: number | null;
  index: string;
  name: string;
  rating: number | null;
  topics: string[];
  attempts: number;
  lastVerdict: string;
  lastAttemptAt: number;
}

export interface TopicPlan {
  topicId: string;
  name: string;
  score: number;
  status: TopicStatus;
  mode: TopicMode;
  /** Codeforces has tags for it, so it can be sharpened there. */
  canSharpen: boolean;
  /** There's a curated LeetCode path for it. */
  canLearn: boolean;
  /** Solves counted toward Sharpen (max of LC and CF solves) and the target. */
  readiness: { solves: number; needed: number };
  /** Rating window for Codeforces problems, after feedback. */
  window: { lo: number; hi: number; offset: number };
  /** LeetCode difficulty level 0 (all Easy) … 3 (Medium/Hard), after feedback. */
  lcLevel: number;
  frequency: number;
  daysSince: number | null;
  /** Higher = study sooner. Zero for topics that aren't candidates for Next Topic. */
  priority: number;
  /** One sentence on why it's ranked where it is. */
  why: string;
}

export interface ResolvedMixItem extends MixItem {
  rec: Rec | null;
  done: boolean;
}

// ---------- helpers ----------

const pct = (x: number) => `${Math.round(x * 100)}%`;
const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));
const fbKey = (platform: Platform, id: string) => `${platform}:${id}`;
const judged = (v: string | null) => v !== null && v !== "COMPILATION_ERROR" && v !== "TESTING" && v !== "SKIPPED";
const DIFF_RANK: Record<LcDifficulty, number> = { Easy: 0, Medium: 1, Hard: 2 };

/** Round to Codeforces' 100-steps: 1008 → 1000, 1050 → 1100. */
export const roundToStep = (rating: number) => Math.round(rating / RATING_STEP) * RATING_STEP;

/** Learn while the topic is new to you, Sharpen once you've got some reps in it. */
export function topicMode(t: Pick<TopicStrength, "lcSolved" | "cfSolved">, canLearn: boolean, canSharpen: boolean): TopicMode {
  if (!canSharpen) return "learn"; // Codeforces has no tag for it
  if (!canLearn) return "sharpen"; // no LeetCode path (constructive, interactive-on-CF, flows…)
  return Math.max(t.lcSolved, t.cfSolved) >= LEARN_SOLVES_TO_SHARPEN ? "sharpen" : "learn";
}

/** LeetCode difficulty level from strength: Easy first while Weak, more Mediums as it grows. */
export function baseLcLevel(score: number): number {
  if (score < STATUS_THRESHOLDS.developing) return 0;
  if (score < STATUS_THRESHOLDS.strong) return 1;
  if (score < STATUS_THRESHOLDS.mastered) return 2;
  return 3;
}

/** Which difficulty to take next at each level (cycled), and where to fall back when one runs out. */
const LEVEL_PATTERN: Record<number, { pattern: LcDifficulty[]; fallback: LcDifficulty[] }> = {
  0: { pattern: ["Easy"], fallback: ["Easy", "Medium", "Hard"] },
  1: { pattern: ["Easy", "Medium"], fallback: ["Easy", "Medium", "Hard"] },
  2: { pattern: ["Medium", "Medium", "Hard"], fallback: ["Medium", "Hard", "Easy"] },
  3: { pattern: ["Medium", "Hard"], fallback: ["Hard", "Medium", "Easy"] },
};

/** Sum of ±steps from "Too easy" / "Too hard" on one topic and platform, clamped. */
export function feedbackOffset(feedback: readonly RecFeedback[], topicId: string, platform: Platform): number {
  let steps = 0;
  for (const f of feedback) {
    if (f.topicId !== topicId || f.platform !== platform) continue;
    if (f.kind === "too_easy") steps++;
    else if (f.kind === "too_hard") steps--;
  }
  return clamp(steps * FEEDBACK_STEP, OFFSET_LIMITS.min, OFFSET_LIMITS.max);
}

/** "Sorting appears in 15% of problems at your rating and you haven't practiced it in 40 days." */
export function whySentence(t: TopicStrength, frequency: number, daysSince: number | null): string {
  const share = `${t.name} appears in ${pct(frequency)} of problems at your rating`;
  if (t.solvedCount === 0) return `${share} and you haven't solved one yet.`;
  if (daysSince === null) return `${share} and it's at ${t.score}/100.`;
  if (daysSince >= 14) return `${share} and you haven't practiced it in ${daysSince} days.`;
  if (t.struggleRate !== null && t.struggleRate >= 0.4 && t.cfJudged >= 4) {
    return `${share} and ${pct(t.struggleRate)} of your Codeforces submissions there aren't accepted.`;
  }
  return t.score < STATUS_THRESHOLDS.strong ? `${share} and it's only at ${t.score}/100.` : `${share} and it isn't Mastered yet (${t.score}/100).`;
}

// ---------- the recommender ----------

export interface Recommender {
  /** Every topic's plan, in display order. */
  plans: ReadonlyMap<string, TopicPlan>;
  /** Next Topic candidates (unlocked, not mastered, common at your rating), best first. */
  ranked: readonly TopicPlan[];
  nextTopic: TopicPlan | null;
  /** LeetCode problems to learn a topic, in learning order. `avoid` = ids to leave out. */
  learn(topicId: string, limit?: number, avoid?: ReadonlySet<string>): LcRec[];
  /** Unsolved, untried Codeforces problems in the topic's window, best first. */
  sharpen(topicId: string, limit?: number, avoid?: ReadonlySet<string>): CfRec[];
  /** Codeforces problems you tried and never got accepted, easiest first. */
  upsolve(): UpsolveRec[];
  /** A fresh Mix of the Day. `avoid` = problem ids to leave out (e.g. the previous mix). */
  generateMix(avoid?: ReadonlySet<string>): MixItem[];
  /**
   * Today's stored mix against current data: solved items stay (marked done), items you gave
   * feedback on are replaced. `changed` says whether it needs saving.
   */
  refreshMix(items: readonly MixItem[]): { items: ResolvedMixItem[]; changed: boolean };
  resolve(item: MixItem): Rec | null;
  isSolved(platform: Platform, id: string): boolean;
}

export function createRecommender(input: RecommenderInput): Recommender {
  const { now } = input;
  const rating = input.cfRating ?? UNRATED_BASELINE;

  // ---- what you've done ----
  const cfSolved = new Set<string>();
  const cfTried = new Map<string, CfSubmission[]>();
  for (const s of input.cfSubmissions) {
    if (s.verdict === "OK") cfSolved.add(s.problemKey);
    else if (judged(s.verdict)) cfTried.set(s.problemKey, [...(cfTried.get(s.problemKey) ?? []), s]);
  }
  const cfAttempted = new Set([...cfTried.keys()].filter((k) => !cfSolved.has(k)));
  const dismissed = new Set(input.feedback.map((f) => fbKey(f.platform, f.problemId)));
  const isSolved = (platform: Platform, id: string) => (platform === "cf" ? cfSolved.has(id) : input.lcSolved.has(id));

  // ---- problem pools ----
  const cfByKey = new Map<string, CfProblem>();
  const cfByTopic = new Map<string, CfProblem[]>();
  for (const p of input.cfProblems) {
    if (p.rating === null || p.contestId === null || p.contestId >= 100_000) continue; // unrated / gym
    if (p.tags.includes("*special")) continue; // April Fools and other one-offs
    cfByKey.set(p.key, p);
    for (const id of topicsForTags(p.tags, "cf")) cfByTopic.set(id, [...(cfByTopic.get(id) ?? []), p]);
  }
  const lcBySlug = new Map<string, CuratedLcProblem>();
  const lcByTopic = new Map<string, CuratedLcProblem[]>();
  for (const p of input.lcCurated) {
    if (!lcBySlug.has(p.slug)) lcBySlug.set(p.slug, p);
    for (const id of p.topics) lcByTopic.set(id, [...(lcByTopic.get(id) ?? []), p]);
  }

  // ---- plans ----
  const plans = new Map<string, TopicPlan>();
  for (const t of input.topics) {
    const topic = TOPIC_BY_ID.get(t.topicId);
    const canSharpen = (topic?.cfTags.length ?? 0) > 0;
    const canLearn = (lcByTopic.get(t.topicId) ?? []).some((p) => p.topic === t.topicId);
    const cfOffset = feedbackOffset(input.feedback, t.topicId, "cf");
    const lo = clamp(roundToStep(rating) + cfOffset, MIN_CF_RATING, 3500 - SHARPEN_SPAN);
    const lcOffset = feedbackOffset(input.feedback, t.topicId, "lc");
    const frequency = input.frequency.get(t.topicId) ?? 0;
    const daysSince = t.lastPracticedAt === null ? null : Math.max(0, Math.floor((now - t.lastPracticedAt) / DAY));
    const candidate = t.status !== "Locked" && t.status !== "Mastered" && frequency > 0;
    // Untried and undated topics count as fully stale. Weakness is squared so a weak topic beats a
    // merely common one: Greedy at 55 in 42% of problems shouldn't outrank Sorting at 32 in 15%.
    const staleDays = daysSince === null ? STALE_DAYS_CAP : Math.min(daysSince, STALE_DAYS_CAP);
    const weakness = 1 - t.score / 100;
    const priority = candidate ? frequency * weakness * weakness * (1 + staleDays / STALE_DAYS_CAP) : 0;
    plans.set(t.topicId, {
      topicId: t.topicId,
      name: t.name,
      score: t.score,
      status: t.status,
      mode: topicMode(t, canLearn, canSharpen),
      canSharpen,
      canLearn,
      readiness: { solves: Math.max(t.lcSolved, t.cfSolved), needed: LEARN_SOLVES_TO_SHARPEN },
      window: { lo, hi: lo + SHARPEN_SPAN, offset: cfOffset },
      lcLevel: clamp(baseLcLevel(t.score) + lcOffset / FEEDBACK_STEP, 0, 3),
      frequency,
      daysSince,
      priority,
      why: whySentence(t, frequency, daysSince),
    });
  }
  const ranked = [...plans.values()]
    .filter((p) => p.priority > 0)
    .sort((a, b) => b.priority - a.priority || a.score - b.score || a.topicId.localeCompare(b.topicId));

  const toCfRec = (p: CfProblem, topicId: string): CfRec => {
    const start = input.contestTimes.get(p.contestId!);
    return {
      platform: "cf",
      id: p.key,
      contestId: p.contestId!,
      index: p.index,
      name: p.name,
      rating: p.rating!,
      topics: topicsForTags(p.tags, "cf"),
      topicId,
      recent: start !== undefined && now - start <= RECENT_SECONDS,
      contestStart: start ?? null,
    };
  };

  const toLcRec = (p: CuratedLcProblem, topicId: string): LcRec => ({
    platform: "lc",
    id: p.slug,
    title: p.title,
    difficulty: p.difficulty,
    topics: p.topics,
    topicId,
    list: p.list,
    order: p.order,
    onPath: p.topic === topicId,
  });

  function sharpen(topicId: string, limit = 10, avoid: ReadonlySet<string> = new Set()): CfRec[] {
    const plan = plans.get(topicId);
    if (!plan?.canSharpen) return [];
    const { lo, hi } = plan.window;
    const target = lo + SHARPEN_SPAN / 2; // just above you: 1008 → window 1000–1200, aim 1100
    const recs = (cfByTopic.get(topicId) ?? [])
      .filter((p) => p.rating! >= lo && p.rating! <= hi)
      .filter((p) => !cfSolved.has(p.key) && !cfAttempted.has(p.key) && !dismissed.has(fbKey("cf", p.key)) && !avoid.has(p.key))
      .map((p) => ({ rec: toCfRec(p, topicId), focus: 1 / Math.max(1, topicsForTags(p.tags, "cf").length), solved: p.solvedCount ?? 0 }));
    recs.sort(
      (a, b) =>
        Number(b.rec.recent) - Number(a.rec.recent) ||
        Math.abs(a.rec.rating - target) - Math.abs(b.rec.rating - target) ||
        b.focus - a.focus || // problems mostly about this topic first
        b.solved - a.solved || // then well-trodden ones (clear statements, editorials)
        b.rec.contestId - a.rec.contestId ||
        a.rec.index.localeCompare(b.rec.index),
    );
    return recs.slice(0, limit).map((r) => r.rec);
  }

  function learn(topicId: string, limit = 10, avoid: ReadonlySet<string> = new Set()): LcRec[] {
    const plan = plans.get(topicId);
    if (!plan) return [];
    const open = (p: CuratedLcProblem) => !input.lcSolved.has(p.slug) && !dismissed.has(fbKey("lc", p.slug)) && !avoid.has(p.slug);
    const all = lcByTopic.get(topicId) ?? [];
    // The topic's own path (in its order) first, then problems cross-listed from other paths.
    const own = all.filter((p) => p.topic === topicId).sort((a, b) => a.order - b.order);
    const ownSlugs = new Set(own.map((p) => p.slug));
    const cross = [...new Map(all.filter((p) => !ownSlugs.has(p.slug)).map((p) => [p.slug, p])).values()].sort(
      (a, b) => DIFF_RANK[a.difficulty] - DIFF_RANK[b.difficulty] || a.order - b.order,
    );

    const { pattern, fallback } = LEVEL_PATTERN[plan.lcLevel] ?? LEVEL_PATTERN[0]!;
    const out: LcRec[] = [];
    for (const group of [own.filter(open), cross.filter(open)]) {
      const queues: Record<LcDifficulty, CuratedLcProblem[]> = { Easy: [], Medium: [], Hard: [] };
      for (const p of group) queues[p.difficulty].push(p);
      for (let i = 0; out.length < limit; i++) {
        const want = pattern[i % pattern.length]!;
        const from = queues[want].length ? want : fallback.find((d) => queues[d].length);
        if (!from) break;
        out.push(toLcRec(queues[from].shift()!, topicId));
      }
    }
    return out;
  }

  function upsolve(): UpsolveRec[] {
    const out: UpsolveRec[] = [];
    for (const key of cfAttempted) {
      if (dismissed.has(fbKey("cf", key))) continue;
      const subs = [...cfTried.get(key)!].sort((a, b) => a.createdAt - b.createdAt);
      const last = subs[subs.length - 1]!;
      out.push({
        platform: "cf",
        id: key,
        contestId: last.contestId,
        index: last.problemIndex,
        name: last.problemName,
        rating: last.problemRating ?? cfByKey.get(key)?.rating ?? null,
        topics: topicsForTags(last.tags, "cf"),
        attempts: subs.length,
        lastVerdict: last.verdict ?? "",
        lastAttemptAt: last.createdAt,
      });
    }
    return out.sort((a, b) => (a.rating ?? Infinity) - (b.rating ?? Infinity) || b.lastAttemptAt - a.lastAttemptAt);
  }

  /**
   * Topics to draw LeetCode learn problems from: the first ranked topic still in Learn mode (Next
   * Topic itself when it is), then the rest of the ranking, then LeetCode-only topics by weakness.
   */
  function learnTopicOrder(): string[] {
    const order: string[] = [];
    const push = (id: string) => {
      if (!order.includes(id)) order.push(id);
    };
    for (const p of ranked) if (p.mode === "learn") push(p.topicId);
    for (const p of ranked) push(p.topicId);
    // Topics Codeforces doesn't tag (arrays, stacks, heaps…) still need learning on LeetCode.
    const rest = [...plans.values()]
      .filter((p) => p.canLearn && p.status !== "Locked" && p.status !== "Mastered")
      .sort((a, b) => a.score - b.score || a.topicId.localeCompare(b.topicId));
    for (const p of rest) push(p.topicId);
    return order;
  }

  /** Topics for Codeforces slots: ones already in Sharpen mode first (you've learned them), then the rest. */
  const sharpenOrder = () => [...ranked.filter((p) => p.canSharpen && p.mode === "sharpen"), ...ranked.filter((p) => p.canSharpen && p.mode === "learn")];

  function pickCf(used: Set<string>, preferTopic?: string): MixItem | null {
    const topics = [...(preferTopic ? [preferTopic] : []), ...sharpenOrder().map((p) => p.topicId)];
    for (const id of topics) {
      const rec = sharpen(id, 1, used)[0];
      if (rec) return { platform: "cf", problemId: rec.id, topicId: id };
    }
    return null;
  }

  function pickLc(used: Set<string>, preferTopic?: string): MixItem | null {
    for (const id of [...(preferTopic ? [preferTopic] : []), ...learnTopicOrder()]) {
      const rec = learn(id, 1, used)[0];
      if (rec) return { platform: "lc", problemId: rec.id, topicId: id };
    }
    return null;
  }

  function generateMix(avoid: ReadonlySet<string> = new Set()): MixItem[] {
    const used = new Set(avoid);
    const take = (item: MixItem | null) => {
      if (item) used.add(item.problemId);
      return item;
    };
    // Codeforces: one problem from each of the weakest topics in Sharpen mode, then a second round if short.
    const cf: MixItem[] = [];
    const sharpenable = sharpenOrder();
    for (let round = 0; round < MIX_SIZE.cf && cf.length < MIX_SIZE.cf; round++) {
      for (const p of sharpenable) {
        if (cf.length >= MIX_SIZE.cf) break;
        const rec = sharpen(p.topicId, 1, used)[0];
        if (rec) cf.push(take({ platform: "cf", problemId: rec.id, topicId: p.topicId })!);
      }
      if (!sharpenable.length) break;
    }
    // LeetCode: learn problems for Next Topic (or the first topic in line that has any left).
    const lc: MixItem[] = [];
    for (const id of learnTopicOrder()) {
      for (const rec of learn(id, MIX_SIZE.lc - lc.length, used)) lc.push(take({ platform: "lc", problemId: rec.id, topicId: id })!);
      if (lc.length >= MIX_SIZE.lc) break;
    }
    return [...cf, ...lc];
  }

  function resolve(item: MixItem): Rec | null {
    if (item.platform === "cf") {
      const p = cfByKey.get(item.problemId);
      return p ? toCfRec(p, item.topicId) : null;
    }
    const p = lcBySlug.get(item.problemId);
    return p ? toLcRec(p, item.topicId) : null;
  }

  function refreshMix(items: readonly MixItem[]): { items: ResolvedMixItem[]; changed: boolean } {
    const used = new Set(items.map((i) => i.problemId));
    let changed = false;
    const out: ResolvedMixItem[] = [];
    for (const item of items) {
      const done = isSolved(item.platform, item.problemId);
      // Feedback on an unsolved item swaps it for the next one in line (same platform, same topic first).
      if (!done && dismissed.has(fbKey(item.platform, item.problemId))) {
        const next = item.platform === "cf" ? pickCf(used, item.topicId) : pickLc(used, item.topicId);
        changed = true;
        if (!next) continue; // nothing left to offer: the slot goes away
        used.add(next.problemId);
        out.push({ ...next, rec: resolve(next), done: false });
        continue;
      }
      out.push({ ...item, rec: resolve(item), done });
    }
    return { items: out, changed };
  }

  return {
    plans,
    ranked,
    nextTopic: ranked[0] ?? null,
    learn,
    sharpen,
    upsolve,
    generateMix,
    refreshMix,
    resolve,
    isSolved,
  };
}

