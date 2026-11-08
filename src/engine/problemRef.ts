import type { LcDifficulty } from "@/data/types";
import type { DueRevision } from "./revision";
import type { Rec, UpsolveRec } from "./recommender";
import type { SheetProblem } from "./sheets";

/**
 * The small, platform-agnostic description of a problem that notes and "Stuck?" work from (v1.7),
 * whichever row it came from: a recommendation, a sheet or Beginner Path problem, or a due review.
 */
export interface ProblemRef {
  /** Canonical key ("lc:two-sum", "cf:4-A", "gfg:…"): the one notes, ticks and reviews share. */
  key: string;
  title: string;
  platform: "lc" | "cf" | "other";
  /** Unified topic ids, the most specific first. From the problem's real tags or its sheet section. */
  topics: string[];
  difficulty: LcDifficulty | null;
  rating: number | null;
  /** LeetCode slug / Codeforces "contest-index", when it has one. */
  lc?: string;
  cf?: string;
  /** Where Open goes. */
  url: string | null;
}

/** "1850-A" → { contestId: 1850, index: "A" }. */
export function cfParts(key: string): { contestId: number; index: string } | null {
  const m = /^(\d+)-(.+)$/.exec(key);
  return m ? { contestId: Number(m[1]), index: m[2]! } : null;
}

export function refFromRec(p: Rec | UpsolveRec, url: string | null): ProblemRef {
  const lead = "topicId" in p ? [p.topicId] : [];
  const topics = [...new Set([...lead, ...p.topics])];
  if (p.platform === "lc") return { key: `lc:${p.id}`, title: p.title, platform: "lc", topics, difficulty: p.difficulty, rating: null, lc: p.id, url };
  return { key: `cf:${p.id}`, title: p.name, platform: "cf", topics, difficulty: null, rating: p.rating, cf: p.id, url };
}

export function refFromSheet(p: SheetProblem, url: string | null): ProblemRef {
  return {
    key: p.key,
    title: p.title,
    platform: p.lc ? "lc" : p.cf ? "cf" : "other",
    topics: p.topics,
    difficulty: p.difficulty,
    rating: p.rating ?? null,
    lc: p.lc,
    cf: p.cf,
    url,
  };
}

export function refFromDue(d: DueRevision, url: string | null): ProblemRef {
  return {
    key: d.key,
    title: d.title,
    platform: d.platform,
    topics: d.topicId ? [d.topicId] : [],
    difficulty: null,
    rating: null,
    lc: d.platform === "lc" ? d.problemId : undefined,
    cf: d.platform === "cf" ? d.problemId : undefined,
    url,
  };
}
