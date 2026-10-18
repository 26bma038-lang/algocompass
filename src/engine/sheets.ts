import type { LcDifficulty } from "@/data/types";

/**
 * Sheets (v1.3): curated problem lists (Striver A2Z, NeetCode 150, …) and their progress. Pure: the
 * data layer hands in what's been solved and ticked; nothing here reads the database.
 *
 * Every sheet problem has a canonical `key` ("lc:two-sum", "cf:4-A", "gfg:…", "tuf:…") shared by all
 * sheets that list it, so one solve ticks it everywhere.
 */

export interface SheetLinks {
  tuf?: string;
  gfg?: string;
  code360?: string;
  /** A free alternative for a LeetCode Premium problem (NeetCode links one, e.g. LintCode). */
  free?: string;
  other?: string;
}

export interface SheetProblem {
  key: string;
  title: string;
  /** Sub-section inside the section (A2Z's "FAQs (Medium)"), when the source has one. */
  sub?: string;
  difficulty: LcDifficulty | null;
  /** Unified topic ids, the section's topic first. */
  topics: string[];
  /** LeetCode slug. */
  lc?: string;
  /** Codeforces problem key, "contestId-index". */
  cf?: string;
  premium?: boolean;
  links?: SheetLinks;
  /** The source's own wording when the platform's title differs. */
  sourceTitle?: string;
}

export interface SheetSection {
  title: string;
  problems: SheetProblem[];
}

export interface Sheet {
  id: string;
  name: string;
  short: string;
  creator: string;
  sourceUrl: string;
  /** What a section is called in the UI: "Step", "Day", "Section", "Topic". */
  sectionLabel: string;
  fetched: string;
  status: "complete" | "partial";
  notes: string[];
  sections: SheetSection[];
}

// ---------- ticks ----------

export type TickSource = "auto" | "manual" | "bulk";

/** A tick set by hand (sheet_ticks). */
export interface TickRow {
  key: string;
  state: "done" | "undone";
  source: "manual" | "bulk";
  at: number;
}

/** What's been solved and ticked, by problem key. Times are epoch seconds. */
export interface SolveIndex {
  /** LeetCode slug → latest accepted solve seen. */
  lc: ReadonlyMap<string, number>;
  /** Codeforces "contestId-index" → latest accepted submission. */
  cf: ReadonlyMap<string, number>;
  /** "lc:slug" / "cf:id" → when it was marked solved by hand (manual_solves, the "Mark solved" store). */
  manual: ReadonlyMap<string, number>;
  ticks: ReadonlyMap<string, TickRow>;
}

export interface ProblemStatus {
  done: boolean;
  source: TickSource | null;
  at: number | null;
}

const NOT_DONE: ProblemStatus = { done: false, source: null, at: null };

/** The latest platform solve for a key, or null. Only LeetCode and Codeforces keys can tick themselves. */
export function autoSolvedAt(key: string, idx: SolveIndex): number | null {
  if (key.startsWith("lc:")) return idx.lc.get(key.slice(3)) ?? null;
  if (key.startsWith("cf:")) return idx.cf.get(key.slice(3)) ?? null;
  return null;
}

/**
 * Whether a sheet problem is done, and why:
 * - unticked by hand → not done, unless a platform shows a solve newer than the untick;
 * - a platform solve (sync) → done, "auto";
 * - ticked by hand or by "Mark sections done" → done, "manual" / "bulk";
 * - marked solved elsewhere in the app (manual_solves) → done, "manual".
 */
export function problemStatus(key: string, idx: SolveIndex): ProblemStatus {
  const auto = autoSolvedAt(key, idx);
  const tick = idx.ticks.get(key);
  if (tick?.state === "undone") return auto !== null && auto > tick.at ? { done: true, source: "auto", at: auto } : NOT_DONE;
  if (auto !== null) return { done: true, source: "auto", at: auto };
  if (tick?.state === "done") return { done: true, source: tick.source, at: tick.at };
  const manual = idx.manual.get(key);
  if (manual !== undefined) return { done: true, source: "manual", at: manual };
  return NOT_DONE;
}

// ---------- progress ----------

export interface Progress {
  done: number;
  total: number;
  /** Whole percent, floored, so 100 only when everything is done. */
  pct: number;
}

const progressOf = (done: number, total: number): Progress => ({ done, total, pct: total ? Math.floor((done / total) * 100) : 0 });

export interface SheetProgress extends Progress {
  sections: Progress[];
  bySource: Record<TickSource, number>;
}

/** Distinct problems in a list (a problem listed twice in one section counts once). */
export function distinctKeys(problems: readonly SheetProblem[]): string[] {
  return [...new Set(problems.map((p) => p.key))];
}

/** Progress over distinct problems: per section and for the whole sheet (a problem in two sections counts once there). */
export function sheetProgress(sheet: Sheet, isDone: (key: string) => ProblemStatus): SheetProgress {
  const bySource: Record<TickSource, number> = { auto: 0, manual: 0, bulk: 0 };
  const sections = sheet.sections.map((s) => {
    const keys = distinctKeys(s.problems);
    return progressOf(keys.filter((k) => isDone(k).done).length, keys.length);
  });
  const keys = distinctKeys(sheet.sections.flatMap((s) => s.problems));
  let done = 0;
  for (const k of keys) {
    const st = isDone(k);
    if (!st.done) continue;
    done++;
    if (st.source) bySource[st.source]++;
  }
  return { ...progressOf(done, keys.length), sections, bySource };
}

/** Distinct problem keys in sections [from, to] (0-based, inclusive): "I've finished Steps 1–5". */
export function sectionKeys(sheet: Sheet, from: number, to: number): string[] {
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.min(sheet.sections.length - 1, Math.max(from, to));
  return distinctKeys(sheet.sections.slice(lo, hi + 1).flatMap((s) => s.problems));
}

// ---------- smart next ----------

/** How many unsolved problems ahead "Next in this sheet" looks at. Small, so it never skips far ahead. */
export const NEXT_WINDOW = 8;
/** How much a weak topic counts against sheet order (order alone is worth 0 to 1). */
export const WEAK_WEIGHT = 0.6;

export interface NextPick {
  problem: SheetProblem;
  sectionIndex: number;
  /** The weak topic that moved this problem up, or null when it's simply next in order. */
  weakTopic: string | null;
}

/**
 * "Next in this sheet": the best unsolved problem, by sheet order weighted toward your weak topics.
 * It looks at the next NEXT_WINDOW unsolved problems in order; each scores 1 → 0 by position, plus
 * WEAK_WEIGHT × the weakness (0 = strong, 1 = weakest) of its weakest topic. Ties keep sheet order.
 * `weakness` comes from the topic engine; with no data every topic is 0 and this is plain order.
 */
export function nextInSheet(
  sheet: Sheet,
  isDone: (key: string) => boolean,
  weakness: ReadonlyMap<string, number> = new Map(),
  skip: ReadonlySet<string> = new Set(),
): NextPick | null {
  const window: { problem: SheetProblem; sectionIndex: number }[] = [];
  const seen = new Set<string>();
  outer: for (const [sectionIndex, s] of sheet.sections.entries()) {
    for (const problem of s.problems) {
      if (seen.has(problem.key) || skip.has(problem.key) || isDone(problem.key)) continue;
      seen.add(problem.key);
      window.push({ problem, sectionIndex });
      if (window.length >= NEXT_WINDOW) break outer;
    }
  }
  let best: NextPick | null = null;
  let bestScore = -Infinity;
  for (const [i, c] of window.entries()) {
    let weakTopic: string | null = null;
    let weak = 0;
    for (const t of c.problem.topics) {
      const w = weakness.get(t) ?? 0;
      if (w > weak) {
        weak = w;
        weakTopic = t;
      }
    }
    const score = 1 - i / NEXT_WINDOW + WEAK_WEIGHT * weak;
    if (score > bestScore + 1e-9) {
      bestScore = score;
      best = { ...c, weakTopic: i === 0 ? null : weakTopic };
    }
  }
  return best;
}
