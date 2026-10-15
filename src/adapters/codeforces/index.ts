import type { CfContestStanding, CfProblem, CfRatingChange, CfSubmission, CfUser, Contest, ContestPhase } from "@/data/types";
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

interface RawContestSubmission extends RawSubmission {
  author: { participantType: string };
}

/** Which submissions are "you in the contest": live, or out of competition. Virtual and practice don't count. */
const PARTICIPATION = new Set(["CONTESTANT", "OUT_OF_COMPETITION"]);

/**
 * Your part in one contest from contest.status (your submissions there). Codeforces only serves
 * full standings now (megabytes per round), so the problem list comes from the problemset cache.
 */
export function toStanding(contestId: number, problems: readonly CfProblem[], subs: readonly RawContestSubmission[]): CfContestStanding {
  const mine = subs.filter((x) => PARTICIPATION.has(x.author.participantType));
  const known = new Map(problems.map((p) => [p.index, p]));
  // Problems you submitted to that the cache doesn't know yet (a round from today).
  for (const x of mine) {
    if (!known.has(x.problem.index)) {
      known.set(x.problem.index, { key: problemKey({ ...x.problem, contestId }), contestId, index: x.problem.index, name: x.problem.name, rating: x.problem.rating ?? null, tags: x.problem.tags ?? [], solvedCount: null });
    }
  }
  const type = mine.some((x) => x.author.participantType === "CONTESTANT") ? "CONTESTANT" : (mine[0]?.author.participantType ?? null);
  return {
    contestId,
    problems: [...known.values()],
    me: type ? { rank: 0, participantType: type, solvedIndices: [...new Set(mine.filter((x) => x.verdict === "OK").map((x) => x.problem.index))] } : null,
  };
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

  /** What you did in one contest (null `me` if you didn't take part). `problems` = the contest's problems from the cache. */
  async getContestStanding(contestId: number, handle: string, problems: readonly CfProblem[]): Promise<CfContestStanding> {
    const subs = await this.client.call<RawContestSubmission[]>("contest.status", { contestId, handle });
    return toStanding(contestId, problems, subs);
  }

  async getContests(): Promise<Contest[]> {
    const rows = await this.client.call<RawContest[]>("contest.list", { gym: false });
    return rows.map(toContest);
  }
}
