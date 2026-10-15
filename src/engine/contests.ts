import type { CfContestStanding, CfProblem, CfRatingChange, CfSubmission, Contest } from "@/data/types";

/** Contest logic: which finished rounds to look up, what goes to Upsolve, and how to label a round. Pure. */

/** Unsolved problems are queued for upsolving only for rounds that ended this recently (no backfill flood). */
export const UPSOLVE_WINDOW_SECONDS = 7 * 86_400;
/** contest.standings calls per sync (the CF queue runs one call per 2s). */
export const RESULTS_PER_SYNC = 10;
/** Upsolve the next problems past what you solved: the first (solved + this many) by index. */
export const UPSOLVE_AHEAD = 2;

export interface ContestToCheck {
  contestId: number;
  name: string;
  startTime: number;
  durationSeconds: number;
}

export interface CheckInput {
  now: number;
  /** Rows of the contests table (upcoming + finished in the last 60 days). */
  contests: readonly Contest[];
  /** contest id → start and length, for every CF contest (older rounds). */
  windows: ReadonlyMap<number, { startTime: number; durationSeconds: number | null }>;
  ratingHistory: readonly CfRatingChange[];
  /** "I'll attend" ids ('cf:<id>'). */
  attending: ReadonlySet<string>;
  submissions: readonly CfSubmission[];
  /** Contests already looked up ('cf:<id>'). */
  known: ReadonlySet<string>;
}

/**
 * Finished Codeforces rounds you probably took part in and haven't been looked up yet: every rated
 * round, rounds marked "I'll attend", and rounds with a submission inside their contest window.
 * Rounds still in system testing wait for the next sync. Newest first, capped per sync.
 */
export function contestsToCheck(input: CheckInput): ContestToCheck[] {
  const table = new Map(input.contests.filter((c) => c.platform === "cf").map((c) => [Number(c.id.slice(3)), c]));
  const names = new Map(input.ratingHistory.map((h) => [h.contestId, h.contestName]));

  const windowOf = (id: number) => {
    const c = table.get(id);
    if (c) return { startTime: c.startTime, durationSeconds: c.durationSeconds };
    const w = input.windows.get(id);
    return w && w.durationSeconds !== null ? { startTime: w.startTime, durationSeconds: w.durationSeconds } : null;
  };

  const candidates = new Set<number>(input.ratingHistory.map((h) => h.contestId));
  for (const id of input.attending) if (id.startsWith("cf:")) candidates.add(Number(id.slice(3)));
  for (const s of input.submissions) {
    if (s.contestId === null) continue;
    const w = windowOf(s.contestId);
    if (w && s.createdAt >= w.startTime && s.createdAt <= w.startTime + w.durationSeconds) candidates.add(s.contestId);
  }

  const out: ContestToCheck[] = [];
  for (const id of candidates) {
    if (!Number.isInteger(id) || input.known.has(`cf:${id}`)) continue;
    const w = windowOf(id);
    if (!w || w.startTime + w.durationSeconds > input.now) continue;
    const row = table.get(id);
    if (row && row.phase !== "finished") continue; // system test still running
    out.push({ contestId: id, name: row?.name ?? names.get(id) ?? `Codeforces contest ${id}`, ...w });
  }
  return out.sort((a, b) => b.startTime - a.startTime).slice(0, RESULTS_PER_SYNC);
}

/** Index order as Codeforces lists it: A < B < B1 < B2 < C … */
const indexOrder = (a: CfProblem, b: CfProblem) => a.index.localeCompare(b.index, "en", { numeric: true });

/**
 * What to upsolve after a round: the problems you didn't solve among the first (solved + 2) by
 * index. Solved A and B → C and D. Solved A and C → B and D. Nothing when you weren't in it.
 */
export function upsolvePicks(standing: CfContestStanding): CfProblem[] {
  if (!standing.me) return [];
  const solved = new Set(standing.me.solvedIndices);
  const ordered = [...standing.problems].sort(indexOrder);
  return ordered.slice(0, solved.size + UPSOLVE_AHEAD).filter((p) => !solved.has(p.index));
}

/** "Div. 2", "Div. 1 + 2", "Educational · Div. 2", "Weekly", "Biweekly"; null when the name doesn't say. */
export function contestDivision(c: Pick<Contest, "platform" | "name">): string | null {
  if (c.platform === "lc") return /biweekly/i.test(c.name) ? "Biweekly" : /weekly/i.test(c.name) ? "Weekly" : null;
  const div = /Div\.?\s*(\d)(?:\s*\+\s*Div\.?\s*(\d)|\s*\+\s*(\d))?/i.exec(c.name);
  const label = div ? `Div. ${div[1]}${div[2] || div[3] ? ` + ${div[2] ?? div[3]}` : ""}` : null;
  if (/educational/i.test(c.name)) return label ? `Educational · ${label}` : "Educational";
  if (label) return label;
  return /global round/i.test(c.name) ? "Global" : null;
}

/** Where to register: Codeforces' registration page for upcoming CF rounds, the contest page otherwise. */
export function registerUrl(c: Pick<Contest, "id" | "platform" | "url">): string {
  return c.platform === "cf" ? `https://codeforces.com/contestRegistration/${c.id.slice(3)}` : c.url;
}
