import { createElement, useEffect, useRef } from "react";
import { queryOptions, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { ACHIEVEMENT_BY_ID, evaluateAchievements, type AchievementDef, type AchievementState } from "@/engine/achievements";
import { mergeActivity } from "@/engine/activity";
import { summarizeXp, xpEvents, type XpSummary } from "@/engine/xp";
import { AchievementBadge } from "@/features/achievements/AchievementBadge";
import { notify } from "@/lib/desktop";
import { bandForRating, RANK_BANDS } from "@/lib/rank";
import { LC_CURATED } from "./catalog";
import { topicReportQuery } from "./queries";
import { dayRange } from "./quests";
import { readPref, writePref } from "./settings";
import { queryClient } from "./queryClient";
import { getRepo, useSyncStore } from "./syncStore";
import type { CfUser, LcProfile } from "./types";
import { useUiStore } from "./uiStore";
import { localDay } from "./sync";

/**
 * Levels and achievements, recomputed from the whole cached history (so the first run is
 * retroactive). Keys start with "db": every sync recomputes them.
 */

export interface AchievementView extends AchievementState {
  def: AchievementDef;
  /** Earned according to the rules but not recorded yet: the watcher announces these. */
  fresh: boolean;
}

export interface Progression {
  xp: XpSummary;
  achievements: AchievementView[];
  /** Current CF rating (null before the first sync), for rank promotions. */
  cfRating: number | null;
  hasData: boolean;
}

const LC_DIFFICULTY = new Map(LC_CURATED.map((p) => [p.slug, p.difficulty]));

export const progressionQuery = queryOptions({
  queryKey: ["db", "progression"],
  queryFn: async ({ client }): Promise<Progression> => {
    const repo = await getRepo();
    const report = await client.fetchQuery(topicReportQuery);
    const [cfProfile, lcProfile, cfSubmissions, ratingHistory, contestResults, lcRecentAc, lcProblems, lcContests, manualSolves, completedQuests, questDays, activity, queue, recorded] =
      await Promise.all([
        repo.getProfile<CfUser>("cf"),
        repo.getProfile<LcProfile>("lc"),
        repo.getCfSubmissions(),
        repo.getCfRatingHistory(),
        repo.getContestResults(),
        repo.getLcRecentAc(),
        repo.getLcProblems(),
        repo.getLcContestHistory(),
        repo.getManualSolves(),
        repo.getCompletedQuests(),
        repo.getQuestDays(),
        repo.getDailyActivity(),
        repo.getUpsolveQueue(),
        repo.getAchievements(),
      ]);
    const activeDays = [...mergeActivity(activity).values()].filter((d) => d.total > 0).map((d) => d.day);
    const upsolveQueue = new Set(queue.map((q) => q.problemKey));
    const lcSolved = lcProfile?.data.solved ?? null;
    const [from, to] = dayRange(localDay(Date.now() / 1000));
    const xp = summarizeXp(
      xpEvents({
        cfSubmissions, ratingHistory, contestResults, lcRecentAc, lcProblems, lcSolved, lcContests, manualSolves,
        lcDifficulty: LC_DIFFICULTY, completedQuests, activeDays, upsolveQueue,
      }),
      from,
      to,
    );
    const states = evaluateAchievements({
      cfSubmissions, ratingHistory, contestResults, cfMaxRating: cfProfile?.data.maxRating ?? null,
      lcRecentAc, lcProblems, lcSolved, lcContests, manualSolves, lcDifficulty: LC_DIFFICULTY,
      questDays, activeDays,
      topics: report.hasData ? report.topics : null,
      blindSpots: report.hasData ? report.standing.blindSpots.length : null,
      upsolveQueue,
    });
    const achievements = states.map((s): AchievementView => {
      const rec = recorded.get(s.id);
      return {
        ...s,
        def: ACHIEVEMENT_BY_ID.get(s.id)!,
        // Once recorded, it stays earned with the date it was first seen.
        unlocked: s.unlocked || rec !== undefined,
        at: rec ? (rec.unlockedAt ?? s.at) : s.at,
        fresh: s.unlocked && rec === undefined,
      };
    });
    return { xp, achievements, cfRating: cfProfile?.data.rating ?? null, hasData: report.hasData };
  },
});

export function useProgression() {
  return useQuery(progressionQuery);
}

/** What the watcher remembers between launches. */
interface Seen {
  level: number | null;
  /** Index into RANK_BANDS. */
  rank: number | null;
}
const SEEN_KEY = "progression-seen";
/** Unlocks announced one toast each; beyond this they're batched. */
const MAX_TOASTS = 3;

const rankIndex = (rating: number) => RANK_BANDS.indexOf(bandForRating(rating).current);

/**
 * Announces progress once it's real: records new achievements (toast, plus a Windows notification
 * while the app sits in the tray), and starts the level-up and rank-up moments. The very first
 * run records everything silently: your past is a baseline, not 20 popups.
 */
export function useProgressionWatcher() {
  const { data } = useProgression();
  const syncing = useSyncStore((s) => s.syncing);
  const busy = useRef(false);
  useEffect(() => {
    if (!data || !data.hasData || syncing || busy.current) return;
    busy.current = true;
    void (async () => {
      try {
        const repo = await getRepo();
        const now = Math.floor(Date.now() / 1000);
        const seen = await readPref<Seen>(SEEN_KEY);
        const fresh = data.achievements.filter((a) => a.fresh);
        const level = data.xp.level;
        const rank = data.cfRating !== null ? rankIndex(data.cfRating) : null;

        if (fresh.length) await repo.recordAchievements(fresh.map((a) => ({ id: a.id, unlockedAt: seen ? (a.at ?? now) : a.at })), now);

        if (seen) {
          const hidden = document.visibilityState === "hidden";
          // A handful at most, one by one; more than that (e.g. a rebuilt cache) is one summary, not a flood.
          if (fresh.length > MAX_TOASTS) {
            const titles = fresh.map((a) => a.def.title);
            toast(`${fresh.length} badges earned`, {
              id: "ach-batch",
              description: `${titles.slice(0, 4).join(", ")}${titles.length > 4 ? ` and ${titles.length - 4} more` : ""}.`,
              icon: createElement(AchievementBadge, { icon: "medal", unlocked: true, size: "sm" }),
              duration: 8000,
              classNames: { icon: "!h-7 !w-7 !mr-1" },
              action: { label: "View", onClick: () => (window.location.hash = "#/progress/badges") },
            });
            if (hidden) void notify(`${fresh.length} badges earned`, titles.join(", "));
          }
          for (const a of fresh.length > MAX_TOASTS ? [] : fresh) {
            toast(`Badge earned: ${a.def.title}`, {
              id: `ach-${a.id}`,
              description: a.def.hint,
              icon: createElement(AchievementBadge, { icon: a.def.icon, unlocked: true, size: "sm" }),
              duration: 6000,
              // Sonner's icon slot is 16px; the badge plate is 28px.
              classNames: { icon: "!h-7 !w-7 !mr-1" },
            });
            if (hidden) void notify(`Badge earned: ${a.def.title}`, a.def.hint);
          }
          const ui = useUiStore.getState();
          if (rank !== null && seen.rank !== null && rank > seen.rank) {
            ui.startCeremony({ kind: "rank", from: seen.rank, to: rank, preview: false });
            if (hidden) void notify(`Promoted to ${RANK_BANDS[rank]!.label}`, "Your Rank Aura changed color. Open AlgoCompass to see it.");
          } else if (level !== null && seen.level !== null && level > seen.level) {
            ui.startCeremony({ kind: "level", level, title: data.xp.title ?? "" });
            if (hidden) void notify(`Level ${level}: ${data.xp.title}`, "You levelled up.");
          }
        }
        // Remember the highest seen (a rating drop isn't a demotion ceremony, just quiet).
        await writePref<Seen>(SEEN_KEY, {
          level: Math.max(level ?? 0, seen?.level ?? 0) || null,
          rank: rank === null ? (seen?.rank ?? null) : Math.max(rank, seen?.rank ?? rank),
        });
        // Recorded now: refetch so they stop counting as fresh.
        if (fresh.length) await queryClient.invalidateQueries({ queryKey: ["db", "progression"] });
      } finally {
        busy.current = false;
      }
    })();
  }, [data, syncing]);
}
