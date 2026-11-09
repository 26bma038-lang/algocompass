import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildPlan, contestsThisMonth, planLineNow, planWeeks, type RatedSolve, type RatingGoal, type RatingPlan, type PlanWeek } from "@/engine/ratingGoal";
import { readPref, writePref } from "./settings";
import { getRepo } from "./syncStore";
import type { CfUser } from "./types";

/** Rating goal plan (v1.7): the goal is a setting (`ratingGoal`); the plan is worked out from your synced history. */

const KEY = "ratingGoal";
const nowS = () => Math.floor(Date.now() / 1000);

function isGoal(v: unknown): v is RatingGoal {
  const g = v as RatingGoal | null;
  return !!g && typeof g.target === "number" && typeof g.by === "number" && typeof g.setAt === "number" && (g.startRating === null || typeof g.startRating === "number");
}

export interface RatingGoalView {
  goal: RatingGoal | null;
  current: number | null;
  plan: RatingPlan | null;
  weeks: PlanWeek[];
  contestsThisMonth: number;
  planLine: number | null;
  hasHandle: boolean;
}

export function useRatingGoal() {
  return useQuery({
    queryKey: ["db", "rating-goal"],
    queryFn: async (): Promise<RatingGoalView> => {
      const repo = await getRepo();
      const [saved, profile, history, subs, manual] = await Promise.all([
        readPref<unknown>(KEY),
        repo.getProfile<CfUser>("cf"),
        repo.getCfRatingHistory(),
        repo.getCfSubmissions(),
        repo.getManualSolves(),
      ]);
      const goal = isGoal(saved) ? saved : null;
      const current = profile?.data.rating ?? null;
      // Each Codeforces problem once, at its first accepted solve, with the problem's own rating.
      const first = new Map<string, RatedSolve>();
      for (const s of subs) {
        if (s.verdict !== "OK") continue;
        const prev = first.get(s.problemKey);
        if (!prev || s.createdAt < prev.at) first.set(s.problemKey, { at: s.createdAt, rating: s.problemRating });
      }
      for (const m of manual) if (m.platform === "cf" && !first.has(m.problemId)) first.set(m.problemId, { at: m.solvedAt, rating: null });
      const solves = [...first.values()];
      const now = nowS();
      const plan = goal ? buildPlan(goal, current, history, solves, now) : null;
      return {
        goal,
        current,
        plan,
        weeks: goal && plan ? planWeeks(goal, history, solves, plan.problemsPerWeek, now) : [],
        contestsThisMonth: contestsThisMonth(history, now),
        planLine: goal ? planLineNow(goal, now) : null,
        hasHandle: profile !== null,
      };
    },
  });
}

/** Sets (or replaces) the goal: a target and a day ("YYYY-MM-DD", counted to the end of that day). */
export function useSaveRatingGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ target, day }: { target: number; day: string }) => {
      const [y, m, d] = day.split("-").map(Number);
      const by = Math.floor(new Date(y!, m! - 1, d! + 1).getTime() / 1000) - 1;
      const profile = await (await getRepo()).getProfile<CfUser>("cf");
      const goal: RatingGoal = { target, by, setAt: nowS(), startRating: profile?.data.rating ?? null };
      await writePref(KEY, goal);
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "rating-goal"] }),
  });
}

export function useClearRatingGoal() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => writePref(KEY, null),
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "rating-goal"] }),
  });
}
