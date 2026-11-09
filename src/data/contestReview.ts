import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildContestReviews } from "@/engine/contestReview";
import { getRepo } from "./syncStore";

/** Contests → Contest review (v1.7): every Codeforces round you took part in, reviewed. */
export function useContestReviews() {
  return useQuery({
    queryKey: ["db", "contest-reviews"],
    queryFn: async () => {
      const repo = await getRepo();
      const [results, ratingHistory, problems, subs, manual] = await Promise.all([
        repo.getContestResults(),
        repo.getCfRatingHistory(),
        repo.getCfProblems(),
        repo.getCfSubmissions(),
        repo.getManualSolves(),
      ]);
      const tags = new Map(problems.map((p) => [p.key, p.tags]));
      const solvedKeys = new Set<string>();
      for (const s of subs) if (s.verdict === "OK") solvedKeys.add(`cf:${s.problemKey}`);
      for (const m of manual) if (m.platform === "cf") solvedKeys.add(`cf:${m.problemId}`);
      return buildContestReviews({ results, ratingHistory, tags, solvedKeys });
    },
  });
}

/** Opening a "Fix next" problem keeps it in the revision queue as "needed help" (sync does this for new rounds too). */
export function useFlagFixNext() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (keys: string[]) => (await getRepo()).flagNeededHelp(keys, Math.floor(Date.now() / 1000)),
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "revisions"] }),
  });
}
