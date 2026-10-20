import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DEFAULT_GOALS, type WeeklyGoals } from "@/engine/goals";
import { readPref, writePref } from "./settings";

/** User preferences beyond handles: weekly goals and notifications. Kept in tauri-plugin-store. */

export interface NotifyPrefs {
  /** 1 hour and 10 minutes before contests marked "I'll attend". */
  contests: boolean;
  /** Evening "streak at risk" reminder, only while a streak is running. */
  streak: boolean;
  /** Local "HH:MM". */
  streakTime: string;
  /** When a daily quest completes. */
  quests: boolean;
}

/**
 * v1.3: "beginner" = new to DSA (the Beginner Path leads, handles optional); "smart" = the
 * recommendation-led app from before. Installs from before v1.3 have no saved mode and stay smart.
 */
export type AppMode = "smart" | "beginner";
export type VideoLang = "en" | "hi";

export interface AppPrefs {
  goals: WeeklyGoals;
  notify: NotifyPrefs;
  mode: AppMode;
  /** Language of lesson videos (English or Hindi). */
  videoLang: VideoLang;
  /** The sheet you follow: pinned first in Sheets and shown on Today. null = none. */
  followedSheet: string | null;
}

export const DEFAULT_PREFS: AppPrefs = {
  goals: DEFAULT_GOALS,
  notify: { contests: true, streak: true, streakTime: "20:00", quests: true },
  mode: "smart",
  videoLang: "en",
  followedSheet: null,
};

const KEY = "prefs";
export const prefsKey = ["settings", "prefs"] as const;

/** Saved prefs merged over defaults, so new fields get a value on old installs. */
export async function readPrefs(): Promise<AppPrefs> {
  const saved = await readPref<Partial<AppPrefs>>(KEY);
  return {
    goals: { ...DEFAULT_PREFS.goals, ...saved?.goals },
    notify: { ...DEFAULT_PREFS.notify, ...saved?.notify },
    mode: saved?.mode === "beginner" ? "beginner" : "smart",
    videoLang: saved?.videoLang === "hi" ? "hi" : "en",
    followedSheet: typeof saved?.followedSheet === "string" ? saved.followedSheet : null,
  };
}

/** Saves some prefs over the current ones (read fresh, so two quick changes don't overwrite each other). */
export async function updatePrefs(patch: Partial<AppPrefs>): Promise<AppPrefs> {
  const next = { ...(await readPrefs()), ...patch };
  await writePref(KEY, next);
  return next;
}

export function usePrefs() {
  return useQuery({ queryKey: prefsKey, queryFn: readPrefs, staleTime: Infinity });
}

export function useSavePrefs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (next: AppPrefs) => {
      await writePref(KEY, next);
      return next;
    },
    onSuccess: (saved) => {
      client.setQueryData(prefsKey, saved);
      // Goals feed Progress → Overview; notification settings feed the reminder schedule.
      void client.invalidateQueries({ queryKey: ["db", "goals"] });
    },
  });
}

/** Changes a few prefs (mode, video language, followed sheet) and refreshes what depends on them. */
export function useUpdatePrefs() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updatePrefs,
    onSuccess: (saved) => {
      client.setQueryData(prefsKey, saved);
      // The followed sheet feeds Today's card and its quest; the mode decides what Today shows.
      void client.invalidateQueries({ queryKey: ["db"] });
    },
  });
}

