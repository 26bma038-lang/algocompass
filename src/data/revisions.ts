import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { afterReview, dueRevisions, type DueRevision, type RevisionRecord, type RevisionSolve } from "@/engine/revision";
import { topicsForTags } from "@/engine/topics";
import { LC_CURATED } from "./catalog";
import type { Repo } from "./repo";
import { readPref, writePref } from "./settings";
import { getRepo } from "./syncStore";

/** The revision queue's data side: solves with titles, the saved records, and the review actions. */

const SINCE_KEY = "revisionSince";
const nowS = () => Math.floor(Date.now() / 1000);
const CURATED = new Map(LC_CURATED.map((p) => [p.slug, p]));

/**
 * The first launch with the queue counts as day one: only problems solved from then on come back.
 * (An old solve history would otherwise flood the first day.)
 */
export async function revisionSince(): Promise<number> {
  const saved = await readPref<number>(SINCE_KEY);
  if (typeof saved === "number" && Number.isFinite(saved)) return saved;
  const now = nowS();
  await writePref(SINCE_KEY, now);
  return now;
}

/** Every problem solved since `since`, with its title and first solve time. */
export async function revisionSolves(repo: Repo, since: number): Promise<RevisionSolve[]> {
  const [subs, lcRecent, lcMeta, manual] = await Promise.all([repo.getCfSubmissions(), repo.getLcRecentAc(), repo.getLcProblems(), repo.getManualSolves()]);
  const out = new Map<string, RevisionSolve>();
  const add = (s: RevisionSolve) => {
    const prev = out.get(s.key);
    if (!prev || s.at < prev.at) out.set(s.key, s);
  };
  for (const s of subs) {
    if (s.verdict !== "OK" || s.createdAt < since) continue;
    add({ key: `cf:${s.problemKey}`, platform: "cf", problemId: s.problemKey, title: s.problemName, topicId: topicsForTags(s.tags, "cf")[0] ?? null, at: s.createdAt });
  }
  const meta = new Map(lcMeta.map((p) => [p.slug, p]));
  for (const r of lcRecent) {
    if (r.timestamp < since) continue;
    const tags = meta.get(r.slug)?.tags;
    const topic = (tags ? topicsForTags(tags, "lc") : (CURATED.get(r.slug)?.topics ?? []))[0] ?? null;
    add({ key: `lc:${r.slug}`, platform: "lc", problemId: r.slug, title: r.title, topicId: topic, at: r.timestamp });
  }
  for (const m of manual) {
    if (m.solvedAt < since || (m.platform !== "lc" && m.platform !== "cf")) continue;
    add({ key: `${m.platform}:${m.problemId}`, platform: m.platform, problemId: m.problemId, title: m.title, topicId: m.topicId, at: m.solvedAt });
  }
  return [...out.values()];
}

/** Everything due for review right now (at most five), most overdue first. */
export function useDueRevisions() {
  return useQuery({
    queryKey: ["db", "revisions", "due"],
    queryFn: async (): Promise<DueRevision[]> => {
      const repo = await getRepo();
      const since = await revisionSince();
      const [solves, records] = await Promise.all([revisionSolves(repo, since), repo.getRevisions()]);
      return dueRevisions({ solves, records, now: nowS(), since });
    },
    refetchInterval: 10 * 60 * 1000,
  });
}

/** "I solved it again" (stillHard = false) or "Still hard" on a due problem. */
export function useReviewRevision() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ due, stillHard }: { due: DueRevision; stillHard: boolean }) => {
      const repo = await getRepo();
      const prev = (await repo.getRevisions()).find((r) => r.key === due.key);
      const next = afterReview(due.at, prev, due.key, nowS(), stillHard);
      await repo.saveRevision(next, nowS());
      return { due, stillHard };
    },
    onSuccess: async ({ due, stillHard }) => {
      await client.invalidateQueries({ queryKey: ["db", "revisions"] });
      toast(stillHard ? `${due.title} comes back in 3 days` : `Reviewed ${due.title}`, { id: `review-${due.key}` });
    },
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/** "I needed help with this one": it will come back after 3 days instead of 7 once it's solved. */
export function useNeededHelp() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ key }: { key: string }) => {
      const repo = await getRepo();
      const prev: RevisionRecord | undefined = (await repo.getRevisions()).find((r) => r.key === key);
      await repo.saveRevision({ key, neededHelp: true, stage: prev?.stage ?? 0, nextAt: prev?.nextAt ?? null }, nowS());
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["db", "revisions"] });
      toast("Noted. It will come back in 3 days once it's solved.");
    },
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}
