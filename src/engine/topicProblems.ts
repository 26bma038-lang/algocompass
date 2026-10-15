import type { CfSubmission, LcDifficulty, LcProblemMeta, LcRecentAc } from "@/data/types";
import { topicsForTags } from "./topics";

export interface CfSolvedProblem {
  key: string;
  contestId: number | null;
  index: string;
  name: string;
  rating: number | null;
  solvedAt: number;
  /** Judged submissions before the first accept. */
  triesBeforeAc: number;
}

export interface CfAttemptedProblem {
  key: string;
  contestId: number | null;
  index: string;
  name: string;
  rating: number | null;
  attempts: number;
  lastVerdict: string;
  lastAttemptAt: number;
}

export interface LcSolvedProblem {
  slug: string;
  title: string;
  difficulty: LcDifficulty;
  solvedAt: number;
  /** Marked solved by hand (LeetCode didn't report it). */
  manual?: boolean;
}

export interface TopicProblems {
  cfSolved: CfSolvedProblem[];
  /** Attempted on Codeforces, never accepted: upsolve candidates. */
  cfAttempted: CfAttemptedProblem[];
  /** Only LeetCode solves we can name (your recent ACs). Older ones exist only as tag counts. */
  lcSolved: LcSolvedProblem[];
}

export interface TopicProblemsInput {
  cfSubmissions: readonly CfSubmission[];
  lcRecentAc: readonly LcRecentAc[];
  lcProblems: readonly LcProblemMeta[];
  /** LeetCode problems marked solved by hand, with their curated topics. */
  manualLc?: readonly { slug: string; title: string; difficulty: LcDifficulty; topics: readonly string[]; solvedAt: number }[];
}

/** Verdicts that say something about the solution (same rule as strength scoring). */
const judged = (v: string | null): v is string => v !== null && v !== "COMPILATION_ERROR" && v !== "TESTING" && v !== "SKIPPED";

/** Your problems in one topic: solved on CF and LC (newest first) and CF problems still open (most recent first). */
export function topicProblems(topicId: string, input: TopicProblemsInput): TopicProblems {
  const byProblem = new Map<string, CfSubmission[]>();
  for (const s of input.cfSubmissions) {
    if (!topicsForTags(s.tags, "cf").includes(topicId)) continue;
    byProblem.set(s.problemKey, [...(byProblem.get(s.problemKey) ?? []), s]);
  }

  const cfSolved: CfSolvedProblem[] = [];
  const cfAttempted: CfAttemptedProblem[] = [];
  for (const [key, subs] of byProblem) {
    const sorted = [...subs].sort((a, b) => a.createdAt - b.createdAt);
    const first = sorted[0]!;
    const base = { key, contestId: first.contestId, index: first.problemIndex, name: first.problemName, rating: first.problemRating };
    const firstAc = sorted.find((s) => s.verdict === "OK");
    if (firstAc) {
      const tries = sorted.filter((s) => s.createdAt < firstAc.createdAt && judged(s.verdict)).length;
      cfSolved.push({ ...base, solvedAt: firstAc.createdAt, triesBeforeAc: tries });
      continue;
    }
    const tries = sorted.filter((s) => judged(s.verdict));
    const last = tries[tries.length - 1];
    if (!last) continue; // only compile errors: not a real attempt
    cfAttempted.push({ ...base, attempts: tries.length, lastVerdict: last.verdict ?? "", lastAttemptAt: last.createdAt });
  }

  const meta = new Map(input.lcProblems.map((p) => [p.slug, p]));
  const lcFirst = new Map<string, LcRecentAc>();
  for (const r of input.lcRecentAc) {
    const prev = lcFirst.get(r.slug);
    if (!prev || r.timestamp < prev.timestamp) lcFirst.set(r.slug, r);
  }
  const lcSolved: LcSolvedProblem[] = [];
  for (const r of lcFirst.values()) {
    const m = meta.get(r.slug);
    if (!m || !topicsForTags(m.tags, "lc").includes(topicId)) continue;
    lcSolved.push({ slug: r.slug, title: r.title, difficulty: m.difficulty, solvedAt: r.timestamp });
  }
  for (const m of input.manualLc ?? []) {
    if (lcFirst.has(m.slug) || !m.topics.includes(topicId)) continue;
    lcSolved.push({ slug: m.slug, title: m.title, difficulty: m.difficulty, solvedAt: m.solvedAt, manual: true });
  }

  return {
    cfSolved: cfSolved.sort((a, b) => b.solvedAt - a.solvedAt),
    cfAttempted: cfAttempted.sort((a, b) => b.lastAttemptAt - a.lastAttemptAt),
    lcSolved: lcSolved.sort((a, b) => b.solvedAt - a.solvedAt),
  };
}

/** "WRONG_ANSWER" → "Wrong answer". */
export function verdictLabel(v: string): string {
  const short: Record<string, string> = {
    WRONG_ANSWER: "Wrong answer",
    TIME_LIMIT_EXCEEDED: "Time limit",
    MEMORY_LIMIT_EXCEEDED: "Memory limit",
    RUNTIME_ERROR: "Runtime error",
    IDLENESS_LIMIT_EXCEEDED: "Idleness limit",
    CHALLENGED: "Hacked",
  };
  return short[v] ?? v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
}
