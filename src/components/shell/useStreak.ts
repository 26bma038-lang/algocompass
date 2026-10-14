import { useMemo } from "react";
import { useHomeData } from "@/data/queries";
import { computeStreak, mergeActivity, type Streak } from "@/engine/activity";

/**
 * One flame rule for every flame in the app:
 * - "lit": practiced today (ember fill)
 * - "pending": a streak is running but nothing yet today (ember outline; breathes from 8pm)
 * - "none": no streak / no data (Dusk outline)
 */
export type FlameState = "lit" | "pending" | "none";

export function flameState(streak: Streak | null): FlameState {
  if (!streak) return "none";
  if (streak.activeToday) return "lit";
  return streak.current > 0 ? "pending" : "none";
}

/** True when the streak would break tonight (8pm or later, nothing done yet). */
export const streakAtRisk = (streak: Streak | null, now = new Date()) =>
  flameState(streak) === "pending" && now.getHours() >= 20;

/** Combined CF + LC streak from synced activity; null until anything has synced. */
export function useStreak(): Streak | null {
  const { data } = useHomeData();
  return useMemo(() => {
    if (!data || (!data.cf && !data.lcStats)) return null;
    return computeStreak(mergeActivity(data.activity), new Date());
  }, [data]);
}
