import type {
  CfSubmission,
  LcDifficulty,
  LcProblemMeta,
  LcRecentAc,
  LcSolvedByDifficulty,
  LcTagCount,
} from "@/data/types";
import { PREREQUISITES, TOPICS, topicsForTags, topologicalOrder } from "./topics";

/** Recency half-life for solves. */
export const HALF_LIFE_DAYS = 90;
export const LC_DIFFICULTY_WEIGHT: Record<LcDifficulty, number> = { Easy: 1, Medium: 2.5, Hard: 5 };
/**
 * LeetCode is where topics are learned, Codeforces where they're sharpened (PRODUCT.md),
 * so an LC solve counts for less strength than a CF solve at your own rating.
 */
export const LC_PLATFORM_FACTOR = 0.5;
/** Effective weighted solves at which a topic reaches ~63 (1 - 1/e). */
export const EVIDENCE_SCALE = 6;
/** Rating used when the user is unrated on Codeforces. */
export const UNRATED_BASELINE = 800;
/** Age assumed for LC solves we can't date when nothing else is known. */
const UNKNOWN_LC_AGE_DAYS = 180;

export type TopicStatus = "Mastered" | "Strong" | "Developing" | "Weak" | "Untouched" | "Locked";

export const STATUS_THRESHOLDS = { developing: 25, strong: 50, mastered: 75 } as const;
/** Mastery also needs depth: this many solves, at or above your CF rating. */
export const MASTERY_MIN_SOLVES = 15;

export interface TopicStrength {
  topicId: string;
  name: string;
  score: number; // 0–100, integer
  status: TopicStatus;
  /** Sum of weighted, decayed solves feeding the score. */
  evidence: number;
  /** The Codeforces / LeetCode parts of `evidence` (they add up to it). */
  cfEvidence: number;
  lcEvidence: number;
  solvedCount: number;
  cfSolved: number;
  lcSolved: number;
  maxCfRatingSolved: number | null;
  lastPracticedAt: number | null; // epoch seconds
  /** Share of judged CF submissions on this topic that weren't accepted (0–1), null with no attempts. */
  struggleRate: number | null;
  cfJudged: number;
}

export interface StrengthInput {
  now: number; // epoch seconds
  cfRating: number | null;
  cfSubmissions: readonly CfSubmission[];
  lcSolved: LcSolvedByDifficulty | null;
  lcTagCounts: readonly LcTagCount[];
  lcProblems: readonly LcProblemMeta[];
  lcRecentAc: readonly LcRecentAc[];
}

const DAY = 86_400;
export const decay = (ageSeconds: number) => Math.pow(0.5, Math.max(0, ageSeconds) / DAY / HALF_LIFE_DAYS);

/** Weight of solving a CF problem relative to your rating: 1 at your rating, ×2 per +300. */
export function cfDifficultyWeight(problemRating: number | null, userRating: number): number {
  const pr = problemRating ?? userRating - 100;
  return Math.min(4, Math.max(0.2, Math.pow(2, (pr - userRating) / 300)));
}

/** Verdicts that say something about the solution (compile errors and pending don't). */
const judged = (v: string | null) => v !== null && v !== "COMPILATION_ERROR" && v !== "TESTING" && v !== "SKIPPED";

export function scoreFromEvidence(evidence: number, struggleRate: number | null, judgedCount: number): number {
  const base = 100 * (1 - Math.exp(-evidence / EVIDENCE_SCALE));
  // Struggle trims up to 30%, scaled by how much evidence there is (10+ judged submissions = full effect).
  const penalty = struggleRate === null ? 0 : 0.3 * struggleRate * Math.min(1, judgedCount / 10);
  return Math.round(base * (1 - penalty));
}

interface Acc {
  evidence: number;
  cfEvidence: number;
  cfSolved: number;
  lcKnown: number;
  lcUnknown: number;
  maxCf: number | null;
  last: number | null;
  fails: number;
  oks: number;
}

export function computeTopicStrengths(input: StrengthInput): TopicStrength[] {
  const { now } = input;
  const ur = input.cfRating ?? UNRATED_BASELINE;
  const acc = new Map<string, Acc>(
    TOPICS.map((t) => [t.id, { evidence: 0, cfEvidence: 0, cfSolved: 0, lcKnown: 0, lcUnknown: 0, maxCf: null, last: null, fails: 0, oks: 0 }]),
  );
  const touch = (id: string) => acc.get(id)!;

  // ---- Codeforces: unique solved problems, weighted by difficulty and recency ----
  const firstAc = new Map<string, CfSubmission>();
  for (const s of input.cfSubmissions) {
    for (const id of topicsForTags(s.tags, "cf")) {
      if (!judged(s.verdict)) continue;
      if (s.verdict === "OK") touch(id).oks++;
      else touch(id).fails++;
    }
    if (s.verdict !== "OK") continue;
    const prev = firstAc.get(s.problemKey);
    if (!prev || s.createdAt < prev.createdAt) firstAc.set(s.problemKey, s);
  }
  for (const s of firstAc.values()) {
    const w = cfDifficultyWeight(s.problemRating, ur) * decay(now - s.createdAt);
    for (const id of topicsForTags(s.tags, "cf")) {
      const a = touch(id);
      a.evidence += w;
      a.cfEvidence += w;
      a.cfSolved++;
      if (s.problemRating !== null) a.maxCf = Math.max(a.maxCf ?? 0, s.problemRating);
      a.last = Math.max(a.last ?? 0, s.createdAt);
    }
  }

  // ---- LeetCode: dated solves where we know the problem, tag counts for the rest ----
  const meta = new Map(input.lcProblems.map((p) => [p.slug, p]));
  const firstLcAc = new Map<string, number>();
  for (const r of input.lcRecentAc) {
    if (!meta.has(r.slug)) continue;
    firstLcAc.set(r.slug, Math.min(firstLcAc.get(r.slug) ?? Infinity, r.timestamp));
  }
  const knownPerTag = new Map<string, number>();
  const knownDiff: Record<LcDifficulty, number> = { Easy: 0, Medium: 0, Hard: 0 };
  for (const [slug, ts] of firstLcAc) {
    const p = meta.get(slug)!;
    knownDiff[p.difficulty]++;
    for (const tag of p.tags) knownPerTag.set(tag, (knownPerTag.get(tag) ?? 0) + 1);
    const w = LC_DIFFICULTY_WEIGHT[p.difficulty] * decay(now - ts) * LC_PLATFORM_FACTOR;
    for (const id of topicsForTags(p.tags, "lc")) {
      const a = touch(id);
      a.evidence += w;
      a.lcKnown++;
      a.last = Math.max(a.last ?? 0, ts);
    }
  }

  // Undated remainder: average difficulty of the solves we couldn't see, aged like the oldest known one.
  const solved = input.lcSolved;
  const rest = {
    Easy: Math.max(0, (solved?.easy ?? 0) - knownDiff.Easy),
    Medium: Math.max(0, (solved?.medium ?? 0) - knownDiff.Medium),
    Hard: Math.max(0, (solved?.hard ?? 0) - knownDiff.Hard),
  };
  const restCount = rest.Easy + rest.Medium + rest.Hard;
  const avgRestWeight = restCount
    ? (rest.Easy * LC_DIFFICULTY_WEIGHT.Easy + rest.Medium * LC_DIFFICULTY_WEIGHT.Medium + rest.Hard * LC_DIFFICULTY_WEIGHT.Hard) / restCount
    : LC_DIFFICULTY_WEIGHT.Easy;
  const oldestKnown = firstLcAc.size ? Math.min(...firstLcAc.values()) : null;
  const restDecay = decay(oldestKnown !== null ? now - oldestKnown : UNKNOWN_LC_AGE_DAYS * DAY);
  // Several LC tags can map to one topic; take the max per topic so one problem isn't counted twice.
  const unknownPerTopic = new Map<string, number>();
  for (const t of input.lcTagCounts) {
    const remaining = Math.max(0, t.solved - (knownPerTag.get(t.slug) ?? 0));
    if (!remaining) continue;
    for (const id of topicsForTags([t.slug], "lc")) {
      unknownPerTopic.set(id, Math.max(unknownPerTopic.get(id) ?? 0, remaining));
    }
  }
  for (const [id, n] of unknownPerTopic) {
    const a = touch(id);
    a.lcUnknown += n;
    a.evidence += n * avgRestWeight * restDecay * LC_PLATFORM_FACTOR;
  }

  // ---- scores, then statuses in prerequisite order ----
  const result = new Map<string, TopicStrength>();
  for (const id of topologicalOrder()) {
    const topic = TOPICS.find((t) => t.id === id)!;
    const a = acc.get(id)!;
    const judgedCount = a.fails + a.oks;
    const struggleRate = judgedCount ? a.fails / judgedCount : null;
    const score = scoreFromEvidence(a.evidence, struggleRate, judgedCount);
    const solvedCount = a.cfSolved + a.lcKnown + a.lcUnknown;

    let status: TopicStatus;
    if (solvedCount === 0) {
      const prereqs = PREREQUISITES[id] ?? [];
      const blocked = prereqs.some((p) => (result.get(p)?.score ?? 0) < STATUS_THRESHOLDS.developing);
      status = blocked ? "Locked" : "Untouched";
    } else if (score >= STATUS_THRESHOLDS.mastered && solvedCount >= MASTERY_MIN_SOLVES && (input.cfRating === null || (a.maxCf ?? 0) >= input.cfRating)) {
      status = "Mastered";
    } else if (score >= STATUS_THRESHOLDS.strong) {
      status = "Strong";
    } else if (score >= STATUS_THRESHOLDS.developing) {
      status = "Developing";
    } else {
      status = "Weak";
    }

    result.set(id, {
      topicId: id,
      name: topic.name,
      score,
      status,
      evidence: Math.round(a.evidence * 100) / 100,
      cfEvidence: Math.round(a.cfEvidence * 100) / 100,
      lcEvidence: Math.round((a.evidence - a.cfEvidence) * 100) / 100,
      solvedCount,
      cfSolved: a.cfSolved,
      lcSolved: a.lcKnown + a.lcUnknown,
      maxCfRatingSolved: a.maxCf,
      lastPracticedAt: a.last,
      struggleRate: struggleRate === null ? null : Math.round(struggleRate * 100) / 100,
      cfJudged: judgedCount,
    });
  }
  // Back to display order.
  return TOPICS.map((t) => result.get(t.id)!);
}
