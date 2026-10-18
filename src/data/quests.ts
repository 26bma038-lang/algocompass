import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { weekCounts, weekEnd, weekStart } from "@/engine/goals";
import {
  evaluateQuests,
  generateQuests,
  newlyCompleted,
  sheetQuest,
  type SheetMembers,
  type QuestMixItem,
  type QuestState,
  type SolveEvent,
} from "@/engine/quests";
import type { ResolvedMixItem } from "@/engine/recommender";
import { TOPIC_BY_ID, topicsForTags } from "@/engine/topics";
import { notify } from "@/lib/desktop";
import { LC_CURATED } from "./catalog";
import { improvedTopics, ratingAt, ratingChange, strengthsAt } from "@/engine/review";
import { readPrefs, usePrefs, type AppPrefs } from "./prefs";
import { buildSolveIndex, isSheetId, loadSheet, PATH_SHEET_ID, viewOf } from "./sheets";
import { topicReportQuery } from "./queries";
import { queryClient } from "./queryClient";
import { useLocalDay, useMixOfTheDay } from "./recommendations";
import type { Repo } from "./repo";
import { getRepo, useSyncStore } from "./syncStore";
import type { LcProfile, ManualSolve, Platform, StoredQuest } from "./types";
import { useUiStore } from "./uiStore";

/** Quests, XP, weekly goals and manual solve marks, fed from the SQLite cache. Keys start with "db". */

const CURATED = new Map(LC_CURATED.map((p) => [p.slug, p]));
const topicName = (id: string) => TOPIC_BY_ID.get(id)?.name ?? id;

/** Local midnight → next local midnight for a YYYY-MM-DD day. */
export function dayRange(day: string): [number, number] {
  const [y, m, d] = day.split("-").map(Number) as [number, number, number];
  return [new Date(y, m - 1, d).getTime() / 1000, new Date(y, m - 1, d + 1).getTime() / 1000];
}

/**
 * Every problem first accepted in [from, to): Codeforces ACs, LeetCode recent ACs and manual marks.
 * "First" means within the range, so re-solving an old problem today counts for today's quests.
 */
export async function solvesBetween(repo: Repo, from: number, to: number): Promise<SolveEvent[]> {
  const [subs, lcRecent, lcMeta, manual] = await Promise.all([repo.getCfSubmissions(), repo.getLcRecentAc(), repo.getLcProblems(), repo.getManualSolves()]);
  const out = new Map<string, SolveEvent>();
  const add = (e: SolveEvent) => {
    const k = `${e.platform}:${e.problemId}`;
    const prev = out.get(k);
    if (!prev || e.at < prev.at) out.set(k, e);
  };
  for (const s of subs) {
    if (s.verdict !== "OK" || s.createdAt < from || s.createdAt >= to) continue;
    add({ platform: "cf", problemId: s.problemKey, at: s.createdAt, topics: topicsForTags(s.tags, "cf"), rating: s.problemRating });
  }
  const meta = new Map(lcMeta.map((p) => [p.slug, p]));
  for (const r of lcRecent) {
    if (r.timestamp < from || r.timestamp >= to) continue;
    const tags = meta.get(r.slug)?.tags;
    const topics = tags ? topicsForTags(tags, "lc") : (CURATED.get(r.slug)?.topics ?? []);
    add({ platform: "lc", problemId: r.slug, at: r.timestamp, topics, rating: null });
  }
  for (const m of manual) {
    if (m.solvedAt < from || m.solvedAt >= to) continue;
    const topics = m.platform === "lc" ? (CURATED.get(m.problemId)?.topics ?? (m.topicId ? [m.topicId] : [])) : m.topicId ? [m.topicId] : [];
    add({ platform: m.platform, problemId: m.problemId, at: m.solvedAt, topics, rating: null });
  }
  // Sheet problems ticked by hand that aren't on LeetCode or Codeforces (GFG, takeUforward…). LeetCode
  // and Codeforces ticks are already in manual_solves above; bulk imports never count as today's work.
  for (const t of await repo.getSheetTicks()) {
    if (t.state !== "done" || t.source !== "manual" || t.at < from || t.at >= to) continue;
    if (t.key.startsWith("lc:") || t.key.startsWith("cf:")) continue;
    add({ platform: "sheet", problemId: t.key, at: t.at, topics: [], rating: null });
  }
  return [...out.values()];
}

/** The sheet today's sheet quest comes from: the one you follow, or the Beginner Path in Beginner mode. */
export function questSheetId(prefs: Pick<AppPrefs, "mode" | "followedSheet">): string | null {
  const id = prefs.followedSheet ?? (prefs.mode === "beginner" ? PATH_SHEET_ID : null);
  return isSheetId(id) ? id : null;
}

/**
 * Keeps today's sheet quest in line with the sheet you follow: added when you follow one, dropped
 * when you stop (unless it's already done, which stays earned).
 */
async function reconcileSheetQuest(repo: Repo, day: string, stored: StoredQuest[]): Promise<StoredQuest[]> {
  const prefs = await readPrefs();
  const want = questSheetId(prefs);
  const have = stored.find((q) => q.kind === "sheet");
  if (have?.completedAt) return stored;
  if (have && have.sheetId === want) return stored;
  if (have) await repo.deleteOpenQuest(day, have.id);
  if (want) {
    const view = viewOf(await loadSheet(want), await buildSolveIndex(repo), new Map());
    await repo.addQuest(day, sheetQuest({ id: want, short: view.sheet.short, nextKey: view.next?.problem.key ?? null }));
  }
  return repo.getQuests(day);
}

/** Problem keys of each sheet a quest points at, loaded once per evaluation. */
async function sheetMembers(quests: readonly StoredQuest[]): Promise<SheetMembers> {
  const ids = [...new Set(quests.flatMap((q) => (q.sheetId && isSheetId(q.sheetId) ? [q.sheetId] : [])))];
  const sets = new Map(await Promise.all(ids.map(async (id) => [id, new Set((await loadSheet(id)).sections.flatMap((s) => s.problems.map((p) => p.key)))] as const)));
  return (id) => sets.get(id);
}

export function toQuestMix(items: readonly ResolvedMixItem[]): QuestMixItem[] {
  return items
    .filter((i) => i.rec !== null)
    .map((i) => ({ platform: i.platform, problemId: i.problemId, topicId: i.topicId, rating: i.rec?.platform === "cf" ? i.rec.rating : null }));
}

/**
 * The mix quests are built from. Beginner mode gets none of the mix's topic quests: its day is the
 * Beginner Path (the sheet quest) plus the consistency quest, so nothing competes with Start here.
 */
async function questMix(items: readonly ResolvedMixItem[]): Promise<QuestMixItem[]> {
  return (await readPrefs()).mode === "beginner" ? [] : toQuestMix(items);
}

export interface TodayQuests {
  day: string;
  quests: QuestState[];
  done: number;
  total: number;
}

/** Today's quests: created from the mix on first open of the day, then evaluated against today's solves. */
export function useTodayQuests() {
  const day = useLocalDay();
  const mix = useMixOfTheDay();
  const syncing = useSyncStore((s) => s.syncing);
  return useQuery({
    // `syncing` is in the key: a sync invalidates queries before it clears the flag, so without it the
    // post-sync refetch could still see "syncing" and cache "no quests" for the day.
    queryKey: ["db", "quests", day, mix.data?.generatedAt ?? null, syncing],
    enabled: mix.data !== undefined,
    placeholderData: (prev) => prev,
    queryFn: async (): Promise<TodayQuests | null> => {
      const repo = await getRepo();
      let stored = await repo.getQuests(day);
      if (stored.length === 0) {
        // No mix yet (first sync still running): no quests rather than quests built on half the data.
        if (!mix.data || syncing) return null;
        await repo.saveQuests(day, generateQuests(await questMix(mix.data.items), topicName));
        stored = await repo.getQuests(day);
      }
      stored = await reconcileSheetQuest(repo, day, stored);
      const [from, to] = dayRange(day);
      const quests = evaluateQuests(stored, await solvesBetween(repo, from, to), await sheetMembers(stored));
      return { day, quests, done: quests.filter((q) => q.done).length, total: quests.length };
    },
  });
}

/** After "New mix": rewrite today's open quests so they point at the new problems. */
export async function regenerateOpenQuests(day: string, items: readonly ResolvedMixItem[]) {
  await (await getRepo()).saveQuests(day, generateQuests(await questMix(items), topicName));
}

/**
 * Records quests the moment the data shows them done (after a sync or a manual mark): stores
 * completion, queues the reward moment and sends the "quest complete" notification. Mounted once.
 */
export function useQuestWatcher() {
  const { data } = useTodayQuests();
  const client = useQueryClient();
  const busy = useRef(false);
  useEffect(() => {
    if (!data || busy.current) return;
    const fresh = newlyCompleted(data.quests);
    if (!fresh.length) return;
    busy.current = true;
    void (async () => {
      try {
        const repo = await getRepo();
        const now = Math.floor(Date.now() / 1000);
        for (const q of fresh) await repo.completeQuest(data.day, q.id, now);
        useUiStore.getState().queueReward(fresh.map((q) => q.id));
        const prefs = await readPrefs();
        if (prefs.notify.quests) {
          const doneNow = data.quests.filter((q) => q.done).length;
          for (const q of fresh) {
            void notify(`Quest complete: +${q.xp} XP`, `${q.title}. ${doneNow} of ${data.total} quests done today.`);
          }
        }
        await client.invalidateQueries({ queryKey: ["db", "quests"] });
        await client.invalidateQueries({ queryKey: ["db", "progression"] });
      } finally {
        busy.current = false;
      }
    })();
  }, [data, client]);
}

/** This week's counts toward the goals set in Settings. */
export function useWeeklyGoals() {
  const prefs = usePrefs();
  const day = useLocalDay();
  return useQuery({
    queryKey: ["db", "goals", day],
    queryFn: async () => {
      const repo = await getRepo();
      const [cfSubmissions, lcRecentAc, manualSolves, ratingHistory, contestResults, lcContests] = await Promise.all([
        repo.getCfSubmissions(),
        repo.getLcRecentAc(),
        repo.getManualSolves(),
        repo.getCfRatingHistory(),
        repo.getContestResults(),
        repo.getLcContestHistory(),
      ]);
      const from = weekStart(new Date());
      const to = weekEnd(from);
      return { from, to, counts: weekCounts({ cfSubmissions, lcRecentAc, manualSolves, ratingHistory, contestResults, lcContests }, from, to) };
    },
    select: (d) => ({ ...d, goals: prefs.data?.goals ?? null }),
  });
}

export function useManualSolves() {
  return useQuery({ queryKey: ["db", "manual"], queryFn: async () => (await getRepo()).getManualSolves() });
}

export interface MarkVars {
  platform: Platform;
  problemId: string;
  title: string;
  topicId: string | null;
}

/** "Mark as solved" (LeetCode). Saved in SQLite; counts as solved everywhere. Undo in the toast. */
export function useMarkSolved() {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ["db"] });
  return useMutation({
    mutationFn: async (v: MarkVars) => {
      const m: ManualSolve = { ...v, solvedAt: Math.floor(Date.now() / 1000) };
      await (await getRepo()).addManualSolve(m);
      return m;
    },
    onSuccess: async (m) => {
      await refresh();
      toast(`Marked ${m.title} as solved`, {
        id: `manual-${m.platform}-${m.problemId}`,
        description: "It counts for today's quests and won't be recommended again.",
        action: {
          label: "Undo",
          onClick: () => {
            void getRepo()
              .then((repo) => repo.removeManualSolve(m.platform, m.problemId))
              .then(refresh);
          },
        },
      });
    },
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/** Everything the weekly review shows, for the week so far (Monday 00:00 → now). */
export function useWeeklyReview(enabled: boolean) {
  const day = useLocalDay();
  return useQuery({
    queryKey: ["db", "weekly-review", day],
    enabled,
    queryFn: async () => {
      const repo = await getRepo();
      const report = await queryClient.fetchQuery(topicReportQuery);
      const [cfSubmissions, lcRecentAc, lcProblems, lcTagCounts, lcProfile, manualSolves, ratingHistory, contestResults, lcContests, activity] = await Promise.all([
        repo.getCfSubmissions(),
        repo.getLcRecentAc(),
        repo.getLcProblems(),
        repo.getLcTagCounts(),
        repo.getProfile<LcProfile>("lc"),
        repo.getManualSolves(),
        repo.getCfRatingHistory(),
        repo.getContestResults(),
        repo.getLcContestHistory(),
        repo.getDailyActivity(),
      ]);
      const from = weekStart(new Date());
      const to = weekEnd(from);
      const prevFrom = weekStart(new Date((from - 3 * 86_400) * 1000));
      const input = { cfSubmissions, lcRecentAc, manualSolves, ratingHistory, contestResults, lcContests };
      const before = strengthsAt(
        { now: from, cfRating: null, cfSubmissions, lcSolved: lcProfile?.data.solved ?? null, lcTagCounts, lcProblems, lcRecentAc },
        from,
        ratingAt(ratingHistory, from),
      );
      const activeDays = new Set(activity.filter((a) => a.count > 0 && a.day >= localDayKey(from) && a.day < localDayKey(to)).map((a) => a.day)).size;
      return {
        from,
        to,
        counts: weekCounts(input, from, to),
        lastWeek: weekCounts(input, prevFrom, from),
        improved: improvedTopics(before, report.topics),
        rating: ratingChange(ratingHistory, from, to),
        activeDays,
      };
    },
  });
}

function localDayKey(t: number): string {
  const d = new Date(t * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
