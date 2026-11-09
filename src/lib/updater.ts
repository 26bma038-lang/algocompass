import { isTauri } from "@tauri-apps/api/core";
import { create } from "zustand";
import { readPref, writePref } from "@/data/settings";
import { PREVIEW } from "./sandbox";

/**
 * App updates (v1.7): tauri-plugin-updater reads the signed latest.json from the newest GitHub
 * release. The check is quiet (once a day, never a dialog); a found update downloads in the
 * background and a banner offers the restart. Every call is a no-op in a plain browser.
 */

export const DAY_MS = 24 * 60 * 60 * 1000;
const CHECKED_KEY = "updateCheckedAt";

/** Pure: is a daily check due? A missing or future timestamp counts as due. */
export function updateCheckDue(lastCheckedAt: number | null, now: number): boolean {
  if (lastCheckedAt === null || !Number.isFinite(lastCheckedAt) || lastCheckedAt > now) return true;
  return now - lastCheckedAt >= DAY_MS;
}

export type UpdateStatus =
  | { kind: "idle" }
  | { kind: "checking" }
  | { kind: "uptodate" }
  | { kind: "downloading"; version: string }
  | { kind: "ready"; version: string }
  | { kind: "error"; message: string };

interface UpdaterState {
  status: UpdateStatus;
  set: (s: UpdateStatus) => void;
}

export const useUpdaterStore = create<UpdaterState>((set) => ({ status: { kind: "idle" }, set: (status) => set({ status }) }));

type Pending = { install: () => Promise<void> };
let pending: Pending | null = null;
let running: Promise<void> | null = null;

/**
 * Checks for an update. `quiet` (the daily check) stays silent when there is nothing new or the
 * network is down; the Settings button passes quiet = false and shows both outcomes.
 */
export function checkForUpdate({ quiet }: { quiet: boolean }): Promise<void> {
  if (!isTauri() || PREVIEW) return Promise.resolve();
  if (running) return running;
  const { set, status } = useUpdaterStore.getState();
  if (status.kind === "ready" || status.kind === "downloading") return Promise.resolve();
  running = (async () => {
    if (!quiet) set({ kind: "checking" });
    try {
      const { check } = await import("@tauri-apps/plugin-updater");
      const update = await check();
      await writePref(CHECKED_KEY, Date.now());
      if (!update) {
        set(quiet ? { kind: "idle" } : { kind: "uptodate" });
        return;
      }
      set({ kind: "downloading", version: update.version });
      await update.download();
      pending = { install: () => update.install() };
      set({ kind: "ready", version: update.version });
    } catch (e) {
      // An offline or rate-limited check is not worth interrupting anyone for.
      set(quiet ? { kind: "idle" } : { kind: "error", message: e instanceof Error ? e.message : String(e) });
    } finally {
      running = null;
    }
  })();
  return running;
}

/** The daily check: runs when the last one is over a day old. */
export async function maybeCheckDaily(): Promise<void> {
  const last = await readPref<number>(CHECKED_KEY).catch(() => null);
  if (updateCheckDue(typeof last === "number" ? last : null, Date.now())) await checkForUpdate({ quiet: true });
}

/** Installs the downloaded update and restarts the app. */
export async function restartToUpdate(): Promise<void> {
  if (!pending) return;
  try {
    await pending.install();
    const { relaunch } = await import("@tauri-apps/plugin-process");
    await relaunch();
  } catch (e) {
    useUpdaterStore.getState().set({ kind: "error", message: e instanceof Error ? e.message : String(e) });
  }
}
