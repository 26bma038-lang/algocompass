import type { CfProblem, CfSubmission } from "@/data/types";
import { contestDivision } from "./contests";
import { TOPIC_BY_ID, topicsForTags } from "./topics";

/**
 * Virtual contests (v1.7): a past Codeforces round, on your own, timed at its real length. Pure.
 * There are no standings and no rank here: only what you did, from your own synced submissions.
 */

export interface VirtualProblem {
  index: string;
  name: string;
  rating: number | null;
  tags: string[];
}

export interface VirtualRow {
  id: number;
  contestId: number;
  name: string;
  startedAt: number;
  durationSeconds: number;
  /** Set when you ended it early ("I'm done"). */
  endedAt: number | null;
  problems: VirtualProblem[];
}

export type Division = "div2" | "div3" | "div4";
export const DIVISIONS: readonly { id: Division; label: string }[] = [
  { id: "div2", label: "Div. 2" },
  { id: "div3", label: "Div. 3" },
  { id: "div4", label: "Div. 4" },
];

/** A round with fewer problems than this in the problemset is a paired round's half (its shared problems sit under the other id). */
export const MIN_VIRTUAL_PROBLEMS = 4;

/** Div. 2 (Educational ones too), 3 or 4; combined Div. 1 + 2 rounds and the rest are none of these. */
export function divisionOf(name: string): Division | null {
  const label = contestDivision({ platform: "cf", name });
  if (label === "Div. 2" || label === "Educational · Div. 2") return "div2";
  if (label === "Div. 3") return "div3";
  if (label === "Div. 4") return "div4";
  return null;
}

const byIndex = (a: { index: string }, b: { index: string }) => a.index.localeCompare(b.index, "en", { numeric: true });

export interface VirtualCandidate {
  contestId: number;
  name: string;
  startTime: number;
  durationSeconds: number;
  problems: VirtualProblem[];
}

/**
 * Finished rounds of one division you've never touched: no submission in the round, not a round you
 * took part in, never done as a virtual. Only rounds whose whole problem list is in the problemset.
 * Newest first.
 */
export function virtualCandidates(input: {
  rounds: readonly { contestId: number; name: string; startTime: number; durationSeconds: number }[];
  problems: readonly CfProblem[];
  /** Contest ids with any submission of yours, any result, or an earlier virtual. */
  attempted: ReadonlySet<number>;
  division: Division;
  now: number;
}): VirtualCandidate[] {
  const byContest = new Map<number, VirtualProblem[]>();
  for (const p of input.problems) {
    if (p.contestId === null) continue;
    const list = byContest.get(p.contestId) ?? [];
    list.push({ index: p.index, name: p.name, rating: p.rating, tags: p.tags });
    byContest.set(p.contestId, list);
  }
  const out: VirtualCandidate[] = [];
  for (const r of input.rounds) {
    if (r.startTime + r.durationSeconds > input.now || input.attempted.has(r.contestId)) continue;
    if (divisionOf(r.name) !== input.division) continue;
    const problems = byContest.get(r.contestId);
    if (!problems || problems.length < MIN_VIRTUAL_PROBLEMS) continue;
    out.push({ ...r, problems: [...problems].sort(byIndex) });
  }
  return out.sort((a, b) => b.startTime - a.startTime);
}

/** When the virtual stops counting: the round's length, or earlier if you ended it. */
export const virtualEndsAt = (v: Pick<VirtualRow, "startedAt" | "durationSeconds" | "endedAt">) =>
  Math.min(v.startedAt + v.durationSeconds, v.endedAt ?? Number.POSITIVE_INFINITY);

export const isRunning = (v: Pick<VirtualRow, "startedAt" | "durationSeconds" | "endedAt">, now: number) => now < virtualEndsAt(v);

export interface VirtualProblemResult extends VirtualProblem {
  /** First accepted submission inside the window, or null. */
  solvedAt: number | null;
  /** Seconds from the start to that solve. */
  elapsed: number | null;
  /** Seconds since the previous solve (or the start): the time this one took. */
  took: number | null;
  /** Rejected tries before the solve (or all of them, unsolved). Compilation errors don't count. */
  wrongTries: number;
}

export interface VirtualResult {
  problems: VirtualProblemResult[];
  solved: number;
  missedTopics: { id: string; name: string; count: number }[];
}

export function virtualResult(v: VirtualRow, submissions: readonly CfSubmission[]): VirtualResult {
  const end = virtualEndsAt(v);
  const inWindow = submissions
    .filter((s) => s.contestId === v.contestId && s.createdAt >= v.startedAt && s.createdAt < end && s.verdict !== null)
    .sort((a, b) => a.createdAt - b.createdAt);
  const rows = [...v.problems].sort(byIndex).map((p) => {
    const mine = inWindow.filter((s) => s.problemIndex === p.index);
    const ok = mine.find((s) => s.verdict === "OK");
    const before = ok ? mine.filter((s) => s.createdAt < ok.createdAt) : mine;
    const wrongTries = before.filter((s) => s.verdict !== "OK" && s.verdict !== "COMPILATION_ERROR" && s.verdict !== "TESTING").length;
    return { ...p, solvedAt: ok?.createdAt ?? null, elapsed: ok ? ok.createdAt - v.startedAt : null, took: null as number | null, wrongTries };
  });
  // "Took" = the gap since the solve before it, in the order you solved them.
  let prev = v.startedAt;
  for (const r of [...rows].filter((r) => r.solvedAt !== null).sort((a, b) => a.solvedAt! - b.solvedAt!)) {
    r.took = r.solvedAt! - prev;
    prev = r.solvedAt!;
  }
  const counts = new Map<string, number>();
  for (const r of rows) if (r.solvedAt === null) for (const t of topicsForTags(r.tags, "cf")) counts.set(t, (counts.get(t) ?? 0) + 1);
  const missedTopics = [...counts]
    .map(([id, count]) => ({ id, name: TOPIC_BY_ID.get(id)?.name ?? id, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  return { problems: rows, solved: rows.filter((r) => r.solvedAt !== null).length, missedTopics };
}

/** "1:05:09" / "12:04" for a countdown or an elapsed time. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** "14 min", "1 h 5 min". */
export function minutesWords(seconds: number): string {
  const m = Math.max(0, Math.round(seconds / 60));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
