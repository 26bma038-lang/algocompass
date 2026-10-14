import type { CfProblem, CfRatingChange, CfSubmission, CfUser, Contest, ContestPhase } from "@/data/types";
import { CodeforcesClient, type CfClientOptions } from "./client";

// Raw response shapes: private to this adapter.
interface RawUser {
  handle: string;
  rating?: number;
  maxRating?: number;
  rank?: string;
  maxRank?: string;
  avatar?: string;
  titlePhoto?: string;
  registrationTimeSeconds: number;
}
interface RawRatingChange {
  contestId: number;
  contestName: string;
  rank: number;
  oldRating: number;
  newRating: number;
  ratingUpdateTimeSeconds: number;
}
interface RawProblem {
  contestId?: number;
  problemsetName?: string;
  index: string;
  name: string;
  rating?: number;
  tags?: string[];
}
interface RawSubmission {
  id: number;
  contestId?: number;
  creationTimeSeconds: number;
  problem: RawProblem;
  programmingLanguage: string;
  verdict?: string;
}
interface RawProblemStat {
  contestId?: number;
  index: string;
  solvedCount: number;
}
interface RawContest {
  id: number;
  name: string;
  phase: string;
  durationSeconds: number;
  startTimeSeconds?: number;
}

export function problemKey(p: { contestId?: number; problemsetName?: string; index: string }): string {
  if (p.contestId !== undefined) return `${p.contestId}-${p.index}`;
  return `${p.problemsetName ?? "ps"}-${p.index}`;
}

export const toUser = (u: RawUser): CfUser => ({
  handle: u.handle,
  rating: u.rating ?? null,
  maxRating: u.maxRating ?? null,
  rank: u.rank ?? null,
  maxRank: u.maxRank ?? null,
  avatar: u.titlePhoto ?? u.avatar ?? null,
  registeredAt: u.registrationTimeSeconds,
});

export const toRatingChange = (r: RawRatingChange): CfRatingChange => ({
  contestId: r.contestId,
  contestName: r.contestName,
  rank: r.rank,
  oldRating: r.oldRating,
  newRating: r.newRating,
  at: r.ratingUpdateTimeSeconds,
});

export const toSubmission = (s: RawSubmission): CfSubmission => ({
  id: s.id,
  problemKey: problemKey(s.problem),
  contestId: s.problem.contestId ?? s.contestId ?? null,
  problemIndex: s.problem.index,
  problemName: s.problem.name,
  problemRating: s.problem.rating ?? null,
  tags: s.problem.tags ?? [],
  verdict: s.verdict ?? null,
  createdAt: s.creationTimeSeconds,
  language: s.programmingLanguage,
});

const PHASES: Record<string, ContestPhase> = {
  BEFORE: "upcoming",
  CODING: "running",
  PENDING_SYSTEM_TEST: "running",
  SYSTEM_TEST: "running",
  FINISHED: "finished",
};

export const toContest = (c: RawContest): Contest => ({
  id: `cf:${c.id}`,
  platform: "cf",
  name: c.name,
  startTime: c.startTimeSeconds ?? 0,
  durationSeconds: c.durationSeconds,
  phase: PHASES[c.phase] ?? "finished",
  url: `https://codeforces.com/contests/${c.id}`,
});

/** Codeforces adapter (official API). The only module that knows CF response shapes. */
export class CodeforcesAdapter {
  private readonly client: CodeforcesClient;

  constructor(options: CfClientOptions = {}) {
    this.client = new CodeforcesClient(options);
  }

  async getUser(handle: string): Promise<CfUser> {
    const [user] = await this.client.call<RawUser[]>("user.info", { handles: handle });
    if (!user) throw new Error(`Codeforces returned no user for ${handle}`);
    return toUser(user);
  }

  async getRatingHistory(handle: string): Promise<CfRatingChange[]> {
    const rows = await this.client.call<RawRatingChange[]>("user.rating", { handle });
    return rows.map(toRatingChange);
  }

  /** Newest first. Omit `count` to fetch the full history. */
  async getSubmissions(handle: string, page?: { from: number; count: number }): Promise<CfSubmission[]> {
    const rows = await this.client.call<RawSubmission[]>("user.status", {
      handle,
      from: page?.from,
      count: page?.count,
    });
    return rows.map(toSubmission);
  }

  async getProblemset(): Promise<CfProblem[]> {
    const res = await this.client.call<{ problems: RawProblem[]; problemStatistics: RawProblemStat[] }>(
      "problemset.problems",
    );
    const solved = new Map(res.problemStatistics.map((s) => [problemKey(s), s.solvedCount]));
    return res.problems.map((p) => {
      const key = problemKey(p);
      return {
        key,
        contestId: p.contestId ?? null,
        index: p.index,
        name: p.name,
        rating: p.rating ?? null,
        tags: p.tags ?? [],
        solvedCount: solved.get(key) ?? null,
      };
    });
  }

  async getContests(): Promise<Contest[]> {
    const rows = await this.client.call<RawContest[]>("contest.list", { gym: false });
    return rows.map(toContest);
  }
}
