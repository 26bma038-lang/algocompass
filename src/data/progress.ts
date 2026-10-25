import { useQuery } from "@tanstack/react-query";
import { weekEnd, weekStart } from "@/engine/goals";
import { weekDays } from "@/engine/progress";
import { solvesBetween } from "./quests";
import { useLocalDay } from "./recommendations";
import { getRepo } from "./syncStore";

/**
 * "Your week" (Progress → Overview in Beginner mode, v1.4): which days had any practice, counted from
 * everything a beginner does without an account too: problems solved or ticked, lesson videos
 * watched and steps finished. Keys start with "db", so a tick or an update refreshes it.
 */
export function useYourWeek() {
  const day = useLocalDay();
  return useQuery({
    queryKey: ["db", "your-week", day],
    queryFn: async () => {
      const repo = await getRepo();
      const from = weekStart(new Date());
      const to = weekEnd(from);
      const [solves, watched, steps] = await Promise.all([solvesBetween(repo, from, to), repo.getWatchedVideos(), repo.getPathSteps()]);
      const inWeek = (t: number) => t >= from && t < to;
      const stepTimes = [...steps.values()].filter(inWeek);
      const times = [...solves.map((s) => s.at), ...[...watched.values()].filter(inWeek), ...stepTimes];
      const days = weekDays(from, times);
      return { from, days, activeDays: days.filter(Boolean).length, solved: solves.length, steps: stepTimes.length };
    },
  });
}
