import { useEffect } from "react";
import { useHomeData } from "@/data/queries";
import { applyRankAccent, bandForRating, FALLBACK_RANK_TOKEN } from "@/lib/rank";

/** Points the Rank Aura at the user's real Codeforces rank once it's known (Earned Light Rule). */
export function useRankAccent(): number | null {
  const { data } = useHomeData();
  const rating = data?.cf ? (data.cf.rating ?? 0) : null;
  useEffect(() => {
    if (rating === null) {
      applyRankAccent(FALLBACK_RANK_TOKEN, null);
      return;
    }
    const { current, next } = bandForRating(rating);
    applyRankAccent(current.token, next?.token ?? null);
  }, [rating]);
  return data?.cf?.rating ?? null;
}
