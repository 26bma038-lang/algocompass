import { useMemo } from "react";
import { useHomeData } from "@/data/queries";
import { computeStreak, mergeActivity, type Streak } from "@/engine/activity";

/** Combined CF + LC streak from synced activity; null until anything has synced. */
export function useStreak(): Streak | null {
  const { data } = useHomeData();
  return useMemo(() => {
    if (!data || (!data.cf && !data.lcStats)) return null;
    return computeStreak(mergeActivity(data.activity), new Date());
  }, [data]);
}
