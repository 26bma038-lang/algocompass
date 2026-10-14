import { useEffect } from "react";
import { create } from "zustand";
import { toast } from "sonner";
import { CodeforcesAdapter } from "@/adapters/codeforces";
import { LeetCodeAdapter } from "@/adapters/leetcode";
import { getDb } from "./db";
import { queryClient } from "./queryClient";
import { Repo } from "./repo";
import { readHandles } from "./settings";
import { syncAll, type SyncResult } from "./sync";

export const SYNC_INTERVAL_MS = 2 * 60 * 60 * 1000;

// One adapter instance per app so the CF rate-limit queue is shared by every caller.
const cf = new CodeforcesAdapter();
const lc = new LeetCodeAdapter();

let repoPromise: Promise<Repo> | null = null;
export function getRepo(): Promise<Repo> {
  repoPromise ??= getDb().then((db) => new Repo(db));
  return repoPromise;
}

interface SyncState {
  syncing: boolean;
  lastResult: SyncResult | null;
  lastFinishedAt: number | null;
  run: (opts?: { forceProblemset?: boolean }) => Promise<void>;
}

const PLATFORM_NAME = { cf: "Codeforces", lc: "LeetCode" } as const;

export const useSyncStore = create<SyncState>((set, get) => ({
  syncing: false,
  lastResult: null,
  lastFinishedAt: null,
  run: async (opts) => {
    if (get().syncing) return;
    set({ syncing: true });
    try {
      const [repo, handles] = await Promise.all([getRepo(), readHandles()]);
      const result = await syncAll({ repo, cf, lc, handles, forceProblemset: opts?.forceProblemset });
      set({ lastResult: result, lastFinishedAt: result.finishedAt });
      for (const p of [result.cf, result.lc]) {
        if (!p.ok) {
          toast.error(`${PLATFORM_NAME[p.platform]} sync failed`, {
            id: `sync-${p.platform}`,
            description: p.errors[0] ?? "Unknown error",
          });
        }
      }
      await queryClient.invalidateQueries({ queryKey: ["db"] });
    } catch (e) {
      toast.error("Sync couldn't start", { id: "sync-start", description: (e as Error).message });
    } finally {
      set({ syncing: false });
    }
  },
}));

/** Sync on app start, then every 2 hours. Mounted once in the app shell. */
export function useSyncScheduler() {
  useEffect(() => {
    const run = () => void useSyncStore.getState().run();
    run();
    const timer = window.setInterval(run, SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, []);
}
