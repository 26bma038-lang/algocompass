import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import {
  nextInSheet,
  problemStatus,
  sheetProgress,
  type NextPick,
  type ProblemStatus,
  type Sheet,
  type SheetProblem,
  type SheetProgress,
  type SolveIndex,
  type TickRow,
} from "@/engine/sheets";
import type { TopicReport } from "@/engine/report";
import { topicReportQuery } from "./queries";
import { getRepo } from "./syncStore";
import type { Repo } from "./repo";

/**
 * Sheets (v1.3): the bundled sheets in src/data/sheets/*.json (generated from the original sources
 * by scripts/gen-sheets.mjs) plus their progress from the SQLite cache. Keys start with "db", so
 * a sync re-ticks everything on its own.
 */

/** The Beginner Path's id as a sheet (src/data/path.ts registers it). */
export const PATH_SHEET_ID = "beginner-path";

/** Display order. The Beginner Path is listed first. */
export const SHEET_IDS = ["striver-a2z", "striver-sde", "neetcode-150", "blind-75", "babbar-450"] as const;

// Each sheet is its own chunk: Today loads only the one you follow.
const LOADERS: Record<string, () => Promise<{ default: unknown }>> = {
  "striver-a2z": () => import("./sheets/striver-a2z.json"),
  "striver-sde": () => import("./sheets/striver-sde.json"),
  "neetcode-150": () => import("./sheets/neetcode-150.json"),
  "blind-75": () => import("./sheets/blind-75.json"),
  "babbar-450": () => import("./sheets/babbar-450.json"),
};

/** Extra sheets registered at runtime (the Beginner Path, built from its lessons). */
const EXTRA = new Map<string, () => Promise<Sheet>>();
export function registerSheet(id: string, load: () => Promise<Sheet>) {
  EXTRA.set(id, load);
}

const cache = new Map<string, Promise<Sheet>>();
export function loadSheet(id: string): Promise<Sheet> {
  let p = cache.get(id);
  if (!p) {
    const extra = EXTRA.get(id);
    const loader = LOADERS[id];
    if (extra) p = extra();
    else if (loader) p = loader().then((m) => m.default as Sheet);
    else return Promise.reject(new Error(`Unknown sheet "${id}"`));
    cache.set(id, p);
  }
  return p;
}

export function isSheetId(id: string | null | undefined): id is string {
  return !!id && (id in LOADERS || EXTRA.has(id));
}

export function allSheetIds(): string[] {
  return [...EXTRA.keys(), ...SHEET_IDS];
}

// ---------- what's solved ----------

/** Everything that can tick a sheet problem, from the cache. */
export async function buildSolveIndex(repo: Repo): Promise<SolveIndex> {
  const [subs, recent, manual, ticks] = await Promise.all([repo.getCfSubmissions(), repo.getLcRecentAc(), repo.getManualSolves(), repo.getSheetTicks()]);
  const lc = new Map<string, number>();
  // LeetCode shows the 20 latest solves per sync; the cache keeps every one it has ever seen.
  for (const r of recent) lc.set(r.slug, Math.max(lc.get(r.slug) ?? 0, r.timestamp));
  const cf = new Map<string, number>();
  for (const s of subs) if (s.verdict === "OK") cf.set(s.problemKey, Math.max(cf.get(s.problemKey) ?? 0, s.createdAt));
  return {
    lc,
    cf,
    manual: new Map(manual.map((m) => [`${m.platform}:${m.problemId}`, m.solvedAt])),
    ticks: new Map(ticks.map((t) => [t.key, t])),
  };
}

export function useSolveIndex() {
  return useQuery({ queryKey: ["db", "solve-index"], queryFn: async () => buildSolveIndex(await getRepo()) });
}

/** How weak each topic is for "Next in this sheet": 1 = weakest, 0 = strong. Empty before any data. */
export function topicWeakness(report: TopicReport | undefined): Map<string, number> {
  const out = new Map<string, number>();
  if (!report?.hasData) return out;
  const W: Record<string, number> = { Weak: 1, Developing: 0.6, Untouched: 0.3, Locked: 0.3, Strong: 0.1, Mastered: 0 };
  for (const t of report.topics) out.set(t.topicId, W[t.status] ?? 0);
  return out;
}

export interface SheetView {
  sheet: Sheet;
  progress: SheetProgress;
  status: (key: string) => ProblemStatus;
  next: NextPick | null;
}

export function viewOf(sheet: Sheet, idx: SolveIndex, weakness: ReadonlyMap<string, number>): SheetView {
  const memo = new Map<string, ProblemStatus>();
  const status = (key: string) => {
    let s = memo.get(key);
    if (!s) memo.set(key, (s = problemStatus(key, idx)));
    return s;
  };
  return { sheet, progress: sheetProgress(sheet, status), status, next: nextInSheet(sheet, (k) => status(k).done, weakness) };
}

/** One sheet with its progress and "Next in this sheet". */
export function useSheet(id: string | null) {
  return useQuery({
    queryKey: ["db", "sheet", id],
    enabled: !!id,
    structuralSharing: false,
    queryFn: async ({ client }) => {
      const [sheet, idx, report] = await Promise.all([loadSheet(id!), buildSolveIndex(await getRepo()), client.fetchQuery(topicReportQuery)]);
      return viewOf(sheet, idx, topicWeakness(report));
    },
  });
}

/** Every sheet with its progress (the Sheets list). */
export function useSheets() {
  return useQuery({
    queryKey: ["db", "sheets"],
    structuralSharing: false,
    queryFn: async ({ client }) => {
      const [sheets, idx, report] = await Promise.all([
        Promise.all(allSheetIds().map(loadSheet)),
        buildSolveIndex(await getRepo()),
        client.fetchQuery(topicReportQuery),
      ]);
      const weak = topicWeakness(report);
      return sheets.map((s) => viewOf(s, idx, weak));
    },
  });
}

// ---------- links ----------

/** Where "Open" goes: LeetCode when the problem is there (it ticks itself), then Codeforces, then the sheet's own link. */
export function openTarget(p: SheetProblem): { url: string; site: string; autoTicks: boolean } | null {
  if (p.lc) return { url: lcProblemUrl(p.lc), site: "LeetCode", autoTicks: true };
  if (p.cf) {
    const [contest, index] = p.cf.split("-");
    const url = cfProblemUrl(Number(contest), index ?? "");
    if (url) return { url, site: "Codeforces", autoTicks: true };
  }
  const l = p.links ?? {};
  if (l.tuf) return { url: l.tuf, site: "takeUforward", autoTicks: false };
  if (l.gfg) return { url: l.gfg, site: "GeeksforGeeks", autoTicks: false };
  if (l.code360) return { url: l.code360, site: "Code360", autoTicks: false };
  if (l.other) {
    try {
      return { url: l.other, site: new URL(l.other).hostname.replace(/^www\./, ""), autoTicks: false };
    } catch {
      return null;
    }
  }
  return null;
}

// ---------- ticking ----------

const nowS = () => Math.floor(Date.now() / 1000);

/**
 * Ticks or unticks one problem by hand. A LeetCode or Codeforces problem also goes through "Mark
 * solved" (manual_solves), so it counts for quests and recommendations like a solve marked there.
 */
export async function setTicked(repo: Repo, p: SheetProblem, done: boolean, at = nowS()) {
  await repo.setSheetTicks([{ key: p.key, state: done ? "done" : "undone", source: "manual", at }]);
  const platform = p.key.startsWith("lc:") ? "lc" : p.key.startsWith("cf:") ? "cf" : null;
  if (!platform) return;
  const problemId = p.key.slice(3);
  if (done) await repo.addManualSolve({ platform, problemId, title: p.title, topicId: p.topics[0] ?? null, solvedAt: at });
  else await repo.removeManualSolve(platform, problemId);
}

export function useTickProblem() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ problem, done }: { problem: SheetProblem; done: boolean }) => {
      await setTicked(await getRepo(), problem, done);
      return { problem, done };
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db"] }),
    onError: (e) => toast.error("Couldn't save that tick", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/**
 * "Mark sections done": ticks every problem in the given keys that isn't done yet, as "bulk". Bulk
 * ticks never go to manual_solves, so an import of old solves isn't counted as today's work or XP.
 * Returns the keys it ticked (for Undo).
 */
export async function bulkTick(repo: Repo, keys: readonly string[], idx: SolveIndex, at = nowS()): Promise<string[]> {
  const fresh = keys.filter((k) => !problemStatus(k, idx).done);
  const prior = new Map(fresh.flatMap((k) => (idx.ticks.has(k) ? [[k, idx.ticks.get(k)!] as const] : [])));
  await repo.setSheetTicks(fresh.map((key): TickRow => ({ key, state: "done", source: "bulk", at })));
  bulkUndo.set(at, prior);
  return fresh;
}

/** The ticks a bulk import replaced (an earlier untick), so Undo can put them back. */
const bulkUndo = new Map<number, ReadonlyMap<string, TickRow>>();

export async function undoBulkTick(repo: Repo, keys: readonly string[], at: number) {
  await repo.deleteSheetTicks([...keys]);
  const prior = bulkUndo.get(at);
  if (prior?.size) await repo.setSheetTicks([...prior.values()]);
  bulkUndo.delete(at);
}

export function useBulkTick() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["db"] });
  return useMutation({
    mutationFn: async ({ keys, label }: { keys: readonly string[]; label: string }) => {
      const repo = await getRepo();
      const at = nowS();
      const ticked = await bulkTick(repo, keys, await buildSolveIndex(repo), at);
      return { ticked, at, label };
    },
    onSuccess: async ({ ticked, at, label }) => {
      await refresh();
      toast(ticked.length ? `Marked ${ticked.length} ${ticked.length === 1 ? "problem" : "problems"} done in ${label}` : `Everything in ${label} was already done`, {
        id: `bulk-${at}`,
        description: ticked.length ? "Imported ticks don't count as today's solves. Untick any you haven't done." : undefined,
        action: ticked.length
          ? {
              label: "Undo",
              onClick: () => {
                void getRepo()
                  .then((repo) => undoBulkTick(repo, ticked, at))
                  .then(refresh);
              },
            }
          : undefined,
      });
    },
    onError: (e) => toast.error("Couldn't mark those done", { description: e instanceof Error ? e.message : String(e) }),
  });
}

// ---------- notes ----------

export function useSheetNotes() {
  return useQuery({
    queryKey: ["db", "sheet-notes"],
    queryFn: async () => new Map((await (await getRepo()).getSheetNotes()).map((n) => [n.key, n])),
  });
}

export function useSaveNote() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ key, body }: { key: string; body: string }) => {
      await (await getRepo()).saveSheetNote(key, body, nowS());
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "sheet-notes"] }),
    onError: (e) => toast.error("Couldn't save the note", { description: e instanceof Error ? e.message : String(e) }),
  });
}
