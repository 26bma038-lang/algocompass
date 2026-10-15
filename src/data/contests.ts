import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { getRepo } from "./syncStore";
import type { Contest, Platform } from "./types";

/** Contests screen data: upcoming rounds with your "I'll attend" marks, and rounds you took part in. */

export interface PastContest {
  id: string;
  platform: Platform;
  name: string;
  startTime: number;
  rank: number | null;
  /** Rating after the round and the change; null while unrated (or not rated yet). */
  newRating: number | null;
  delta: number | null;
  solved: number | null;
  total: number | null;
}

export function useContestsData() {
  return useQuery({
    queryKey: ["db", "contests-screen"],
    queryFn: async () => {
      const repo = await getRepo();
      const now = Math.floor(Date.now() / 1000);
      const [contests, attending, results, history, lcHistory] = await Promise.all([
        repo.getContests(now),
        repo.getAttending(),
        repo.getContestResults(),
        repo.getCfRatingHistory(),
        repo.getLcContestHistory(),
      ]);
      const upcoming: Contest[] = contests.filter((c) => c.phase !== "finished" && c.startTime + c.durationSeconds > now);

      const rated = new Map(history.map((h) => [`cf:${h.contestId}`, h]));
      const past: PastContest[] = [];
      const seen = new Set<string>();
      for (const r of results) {
        if (!r.participated) continue;
        const h = rated.get(r.contestId);
        seen.add(r.contestId);
        past.push({
          id: r.contestId,
          platform: "cf",
          name: h?.contestName ?? r.name,
          startTime: r.startTime,
          rank: r.rank ?? h?.rank ?? null,
          newRating: h?.newRating ?? null,
          delta: h ? h.newRating - h.oldRating : null,
          solved: r.solved,
          total: r.total,
        });
      }
      // Rated rounds not looked up yet (older than the contest calendar we keep): rank and rating only.
      for (const [id, h] of rated) {
        if (seen.has(id)) continue;
        past.push({ id, platform: "cf", name: h.contestName, startTime: h.at, rank: h.rank, newRating: h.newRating, delta: h.newRating - h.oldRating, solved: null, total: null });
      }
      lcHistory.forEach((c, i) => {
        const prev = lcHistory[i - 1];
        past.push({
          id: `lc:${c.startTime}`,
          platform: "lc",
          name: c.title,
          startTime: c.startTime,
          rank: c.ranking,
          newRating: Math.round(c.rating),
          delta: prev ? Math.round(c.rating - prev.rating) : null,
          solved: c.solved,
          total: c.total,
        });
      });
      past.sort((a, b) => b.startTime - a.startTime);
      return { upcoming, attending, past };
    },
  });
}

export function useSetAttending() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ contestId, attending }: { contestId: string; attending: boolean; name: string }) => {
      await (await getRepo()).setAttending(contestId, attending, Math.floor(Date.now() / 1000));
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["db", "contests-screen"] });
    },
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/** "2h", "2h 15m", "1h 30m". */
export function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.round((seconds % 3600) / 60);
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}
