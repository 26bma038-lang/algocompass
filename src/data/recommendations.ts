import { useEffect, useState } from "react";
import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createRecommender, type Recommender, type ResolvedMixItem } from "@/engine/recommender";
import { bandFrequency } from "@/engine/standing";
import type { CfUser, DailyMix, FeedbackKind, MixItem, Platform, RecFeedback } from "./types";
import { LC_CURATED } from "./catalog";
import { topicReportQuery } from "./queries";
import { getRepo, useSyncStore } from "./syncStore";
import { localDay } from "./sync";

/**
 * Recommender hooks. The engine is pure; this file feeds it from the SQLite cache and stores
 * what it needs to remember (feedback, today's mix). Keys start with "db", so every sync
 * recomputes them, and problems you've solved drop out on their own.
 */

export const recommenderQuery = queryOptions({
  queryKey: ["db", "recommender"],
  // The result holds functions; structural sharing only makes sense for plain JSON.
  structuralSharing: false,
  queryFn: async ({ client }): Promise<Recommender> => {
    const repo = await getRepo();
    // fetchQuery, not ensureQueryData: after a sync invalidates the report, this waits for the fresh one.
    const report = await client.fetchQuery(topicReportQuery);
    const [cfProfile, cfProblems, cfSubmissions, contestTimes, lcRecentAc, feedback, manual, upsolveQueue] = await Promise.all([
      repo.getProfile<CfUser>("cf"),
      repo.getCfProblems(),
      repo.getCfSubmissions(),
      repo.getCfContestTimes(),
      repo.getLcRecentAc(),
      repo.getFeedback(),
      repo.getManualSolves(),
      repo.getUpsolveQueue(),
    ]);
    const cfRating = cfProfile?.data.rating ?? null;
    return createRecommender({
      now: Math.floor(Date.now() / 1000),
      cfRating,
      topics: report.topics,
      frequency: bandFrequency(cfProblems, cfRating),
      cfProblems,
      cfSubmissions,
      contestTimes,
      lcCurated: LC_CURATED,
      // Manual marks count as solved: LeetCode only shows the 20 most recent solves.
      lcSolved: new Set([...lcRecentAc.map((r) => r.slug), ...manual.filter((m) => m.platform === "lc").map((m) => m.problemId)]),
      feedback,
      upsolveQueue,
    });
  },
});

export function useRecommender() {
  return useQuery(recommenderQuery);
}

/** Today's local date (YYYY-MM-DD), updating at midnight so the mix rolls over on its own. */
export function useLocalDay(): string {
  const [day, setDay] = useState(() => localDay(Date.now() / 1000));
  useEffect(() => {
    const now = new Date();
    const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
    const t = window.setTimeout(() => setDay(localDay(Date.now() / 1000)), midnight.getTime() - now.getTime());
    return () => window.clearTimeout(t);
  }, [day]);
  return day;
}

export interface MixOfTheDay {
  day: string;
  generatedAt: number;
  items: ResolvedMixItem[];
}

/**
 * Loads today's mix, creating it on first open of the day and swapping out items you gave feedback
 * on. Returns null when there's no mix yet and `canCreate` is false (mid-sync, where the data may be
 * half-written and the mix would be frozen for the whole day).
 */
async function loadMix(rec: Recommender, day: string, canCreate: boolean): Promise<MixOfTheDay | null> {
  const repo = await getRepo();
  let stored: DailyMix | null = await repo.getDailyMix(day);
  if (!stored || stored.items.length === 0) {
    if (!canCreate) return null;
    stored = { day, generatedAt: Math.floor(Date.now() / 1000), items: rec.generateMix() };
    if (stored.items.length) await repo.saveDailyMix(stored);
  }
  const { items, changed } = rec.refreshMix(stored.items);
  if (changed) await repo.saveDailyMix({ ...stored, items: items.map(({ platform, problemId, topicId }) => ({ platform, problemId, topicId })) });
  return { day, generatedAt: stored.generatedAt, items };
}

export function useMixOfTheDay() {
  const day = useLocalDay();
  const rec = useRecommender();
  const syncing = useSyncStore((s) => s.syncing);
  return useQuery({
    queryKey: ["db", "mix", day, syncing],
    enabled: rec.data !== undefined,
    queryFn: () => loadMix(rec.data!, day, !syncing),
    placeholderData: (prev) => prev,
  });
}

/** "New mix": replaces today's mix with problems that weren't in it. */
export function useReshuffleMix() {
  const client = useQueryClient();
  const day = useLocalDay();
  return useMutation({
    mutationFn: async () => {
      const [repo, rec] = await Promise.all([getRepo(), client.fetchQuery(recommenderQuery)]);
      const current = await repo.getDailyMix(day);
      const avoid = new Set(current?.items.map((i) => i.problemId) ?? []);
      let items: MixItem[] = rec.generateMix(avoid);
      // Out of fresh problems: start over rather than show an empty mix.
      if (items.length === 0) items = rec.generateMix();
      await repo.saveDailyMix({ day, generatedAt: Math.floor(Date.now() / 1000), items });
      // Open quests follow the new mix; completed ones stay earned.
      const { regenerateOpenQuests } = await import("./quests");
      await regenerateOpenQuests(day, items.map((i) => ({ ...i, rec: rec.resolve(i), done: false })));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "mix"] }),
  });
}

export interface FeedbackVars {
  platform: Platform;
  problemId: string;
  topicId: string;
  kind: FeedbackKind;
  /** Problem name for the confirmation toast. */
  label: string;
}

const FEEDBACK_TOAST: Record<FeedbackKind, (label: string, platform: Platform) => string> = {
  skip: (label) => `Skipped ${label}`,
  too_easy: (_, p) => (p === "cf" ? "Noted. Harder Codeforces problems for this topic" : "Noted. Harder LeetCode problems for this topic"),
  too_hard: (_, p) => (p === "cf" ? "Noted. Easier Codeforces problems for this topic" : "Noted. Easier LeetCode problems for this topic"),
};

/** Skip / Too easy / Too hard. Persists in SQLite, refreshes recommendations, offers Undo. */
export function useRecFeedback() {
  const client = useQueryClient();
  const refresh = () =>
    Promise.all([client.invalidateQueries({ queryKey: ["db", "recommender"] }), client.invalidateQueries({ queryKey: ["db", "mix"] })]);
  return useMutation({
    mutationFn: async (v: FeedbackVars): Promise<RecFeedback> => {
      const f: RecFeedback = { platform: v.platform, problemId: v.problemId, topicId: v.topicId, kind: v.kind, createdAt: Math.floor(Date.now() / 1000) };
      await (await getRepo()).addFeedback(f);
      return f;
    },
    onSuccess: async (f, v) => {
      await refresh();
      toast(FEEDBACK_TOAST[v.kind](v.label, v.platform), {
        id: `feedback-${f.platform}-${f.problemId}`,
        description: v.kind === "skip" ? "It won't be recommended again." : "This one is hidden, and the topic's range moved a step.",
        action: {
          label: "Undo",
          onClick: () => {
            void getRepo()
              .then((repo) => repo.removeFeedback(f))
              .then(refresh);
          },
        },
      });
    },
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}
