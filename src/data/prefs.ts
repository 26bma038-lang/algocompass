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

export interface AppPrefs {
  goals: WeeklyGoals;
  notify: NotifyPrefs;
}

export const DEFAULT_PREFS: AppPrefs = {
  goals: DEFAULT_GOALS,
  notify: { contests: true, streak: true, streakTime: "20:00", quests: true },
};

const KEY = "prefs";
export const prefsKey = ["settings", "prefs"] as const;

/** Saved prefs merged over defaults, so new fields get a value on old installs. */
export async function readPrefs(): Promise<AppPrefs> {
  const saved = await readPref<Partial<AppPrefs>>(KEY);
  return {
    goals: { ...DEFAULT_PREFS.goals, ...saved?.goals },
    notify: { ...DEFAULT_PREFS.notify, ...saved?.notify },
  };
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
      // Goals feed the Quests screen; notification settings feed the reminder schedule.
      void client.invalidateQueries({ queryKey: ["db", "goals"] });
    },
  });
}

