import { useQuery } from "@tanstack/react-query";
import { invoke, isTauri } from "@tauri-apps/api/core";
import { buildShareWeek, type ShareWeek } from "@/engine/shareCard";
import { getRepo } from "./syncStore";
import type { CfUser } from "./types";

/** "Share my week" (v1.7): the card's numbers from your synced data, read when the panel opens. */
export function useShareWeek(enabled: boolean) {
  return useQuery({
    queryKey: ["db", "share-week"],
    enabled,
    queryFn: async (): Promise<ShareWeek> => {
      const repo = await getRepo();
      const [cfProfile, ratingHistory, cfSubmissions, lcRecentAc, lcProblems, manualSolves, activity] = await Promise.all([
        repo.getProfile<CfUser>("cf"),
        repo.getCfRatingHistory(),
        repo.getCfSubmissions(),
        repo.getLcRecentAc(),
        repo.getLcProblems(),
        repo.getManualSolves(),
        repo.getDailyActivity(),
      ]);
      return buildShareWeek({ cfUser: cfProfile?.data ?? null, ratingHistory, cfSubmissions, lcRecentAc, lcProblems, manualSolves, activity, now: Math.floor(Date.now() / 1000) });
    },
  });
}

/**
 * Saves the PNG where you choose. Desktop: the native Save dialog, opened and written by Rust
 * (`save_png`), so the page never gets file access; returns the path, or null when cancelled.
 * Browser (`npm run dev`): an ordinary download. Nothing is uploaded anywhere.
 */
export async function savePng(blob: Blob, fileName: string): Promise<string | null> {
  if (isTauri()) {
    const bytes = Array.from(new Uint8Array(await blob.arrayBuffer()));
    return invoke<string | null>("save_png", { fileName, bytes });
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return fileName;
}
