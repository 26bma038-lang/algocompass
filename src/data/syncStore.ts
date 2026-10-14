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
/** After an offline sync, try again this soon (or as soon as the OS reports a connection). */
export const OFFLINE_RETRY_MS = 5 * 60 * 1000;

// One adapter instance per app so the CF rate-limit queue is shared by every caller.
const cf = new CodeforcesAdapter();
const lc = new LeetCodeAdapter();

let repoPromise: Promise<Repo> | null = null;
export function getRepo(): Promise<Repo> {
  repoPromise ??= getDb().then((db) => new Repo(db));
  return repoPromise;
}

/** What the top-bar sync control shows. "offline" is calm: cached data stays, a retry is queued. */
export type SyncStatus = "idle" | "syncing" | "ok" | "partial" | "offline";

export function syncStatus(syncing: boolean, result: SyncResult | null): SyncStatus {
  if (syncing) return "syncing";
  if (!result) return "idle";
  const platforms = [result.cf, result.lc];
  if (platforms.some((p) => p.offline)) return "offline";
  return platforms.every((p) => p.ok) ? "ok" : "partial";
}

let offlineRetry: number | null = null;
function scheduleOfflineRetry(run: () => void) {
  if (offlineRetry !== null) return;
  offlineRetry = window.setTimeout(() => {
    offlineRetry = null;
    run();
  }, OFFLINE_RETRY_MS);
}
function cancelOfflineRetry() {
  if (offlineRetry !== null) window.clearTimeout(offlineRetry);
  offlineRetry = null;
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
    cancelOfflineRetry();
    try {
      const [repo, handles] = await Promise.all([getRepo(), readHandles()]);
      const result = await syncAll({ repo, cf, lc, handles, forceProblemset: opts?.forceProblemset });
      set({ lastResult: result, lastFinishedAt: result.finishedAt });
      for (const p of [result.cf, result.lc]) {
        // Offline isn't an error worth a toast: the top bar says "Offline, will retry".
        if (!p.ok && !p.offline) {
          toast.error(`${PLATFORM_NAME[p.platform]} sync failed`, {
            id: `sync-${p.platform}`,
            description: p.errors[0] ?? "Unknown error",
          });
        }
      }
      if (result.cf.offline || result.lc.offline) scheduleOfflineRetry(() => void get().run());
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
    // Back online after an offline sync: retry right away instead of waiting out the timer.
    const onOnline = () => {
      const { syncing, lastResult } = useSyncStore.getState();
      if (syncStatus(syncing, lastResult) === "offline") run();
    };
    window.addEventListener("online", onOnline);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("online", onOnline);
      cancelOfflineRetry();
    };
  }, []);
}
