import { queryOptions, useQuery } from "@tanstack/react-query";
import type { TableName } from "./repo";
import type { CfUser } from "./types";
import { getRepo } from "./syncStore";
import { topicProblems } from "@/engine/topicProblems";

/** Read hooks over the local SQLite cache. Every key starts with "db" so a sync invalidates them all. */

export function useTableCounts() {
  return useQuery({ queryKey: ["db", "counts"], queryFn: async () => (await getRepo()).tableCounts() });
}

export function useTableDump(table: TableName, limit = 50) {
  return useQuery({ queryKey: ["db", "dump", table, limit], queryFn: async () => (await getRepo()).dumpTable(table, limit) });
}

export function useSyncLog(limit = 40) {
  return useQuery({ queryKey: ["db", "sync-log", limit], queryFn: async () => (await getRepo()).getSyncLog(limit) });
}

export const topicReportQuery = queryOptions({
  queryKey: ["db", "topic-report"],
  queryFn: async () => {
    const { buildTopicReport } = await import("@/engine/report");
    return buildTopicReport(await getRepo());
  },
});

export function useTopicReport() {
  return useQuery(topicReportQuery);
}

/** Your solved and still-open problems in one topic (feeds Topic Detail). */
export function useTopicProblems(topicId: string | null) {
  return useQuery({
    queryKey: ["db", "topic-problems", topicId],
    enabled: topicId !== null,
    queryFn: async () => {
      const repo = await getRepo();
      const [cfSubmissions, lcRecentAc, lcProblems] = await Promise.all([repo.getCfSubmissions(), repo.getLcRecentAc(), repo.getLcProblems()]);
      return topicProblems(topicId!, { cfSubmissions, lcRecentAc, lcProblems });
    },
  });
}

export function useHomeData() {
  return useQuery({
    queryKey: ["db", "home"],
    queryFn: async () => {
      const repo = await getRepo();
      const now = Math.floor(Date.now() / 1000);
      const [cfProfile, ratingHistory, submissions, lcStats, lcContests, activity, contests] = await Promise.all([
        repo.getProfile<CfUser>("cf"),
        repo.getCfRatingHistory(),
        repo.getCfSubmissions(),
        repo.getLcStats(),
        repo.getLcContestHistory(),
        repo.getDailyActivity(),
        repo.getContests(now),
      ]);
      const solvedKeys = new Set(submissions.filter((s) => s.verdict === "OK").map((s) => s.problemKey));
      return {
        cf: cfProfile?.data ?? null,
        cfUpdatedAt: cfProfile?.updatedAt ?? null,
        ratingHistory,
        cfSolved: solvedKeys.size,
        lcStats,
        lcContests,
        activity,
        upcoming: contests.filter((c) => c.phase !== "finished"),
      };
    },
  });
}
