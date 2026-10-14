import { useQuery } from "@tanstack/react-query";
import type { TableName } from "./repo";
import { getRepo } from "./syncStore";

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

export function useTopicReport() {
  return useQuery({
    queryKey: ["db", "topic-report"],
    queryFn: async () => {
      const { buildTopicReport } = await import("@/engine/report");
      return buildTopicReport(await getRepo());
    },
  });
}
