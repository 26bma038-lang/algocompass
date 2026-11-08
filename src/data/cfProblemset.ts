import { useQuery } from "@tanstack/react-query";
import type { CfProblem } from "./types";
import type { Repo } from "./repo";
import { PROBLEMSET_TTL_SECONDS } from "./sync";
import { getCfAdapter, getRepo } from "./syncStore";

/**
 * The Codeforces problemset (v1.6, "Sharpen on Codeforces"): every problem with its tags, rating
 * and solved count, cached in SQLite (cf_problems). Fetched through the Codeforces adapter at most
 * once a day, with or without a handle (a beginner has none), and shares that day with the sync's
 * own "cf:problemset" step. Offline or on an API error it fails soft: the saved list, marked stale.
 */

export interface CfProblemsetView {
  problems: CfProblem[];
  /** When the saved list was last fetched (epoch seconds), or null if never. */
  fetchedAt: number | null;
  /** Older than a day and the refresh just failed. */
  stale: boolean;
  /** The refresh failed (offline, API error); null when it worked or wasn't needed. */
  error: string | null;
}

const KIND = "cf:problemset";

export async function ensureCfProblemset(
  repo: Repo,
  fetchProblemset: () => Promise<CfProblem[]>,
  now: () => number = () => Math.floor(Date.now() / 1000),
): Promise<CfProblemsetView> {
  const last = await repo.lastSuccess(KIND);
  const cached = await repo.getCfProblems();
  if (last !== null && now() - last < PROBLEMSET_TTL_SECONDS && cached.length) return { problems: cached, fetchedAt: last, stale: false, error: null };
  const startedAt = now();
  try {
    const problems = await fetchProblemset();
    await repo.saveCfProblems(problems);
    await repo.logSync({ platform: "cf", kind: KIND, startedAt, finishedAt: now(), status: "ok", message: null, items: problems.length });
    return { problems: await repo.getCfProblems(), fetchedAt: now(), stale: false, error: null };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await repo.logSync({ platform: "cf", kind: KIND, startedAt, finishedAt: now(), status: "error", message, items: 0 }).catch(() => undefined);
    return { problems: cached, fetchedAt: last, stale: cached.length > 0, error: message };
  }
}

export function useCfProblemset() {
  return useQuery({
    // Not under "db": ticking a problem shouldn't re-read 10,000 rows.
    queryKey: ["cf", "problemset"],
    queryFn: async () => ensureCfProblemset(await getRepo(), () => getCfAdapter().getProblemset()),
    staleTime: 60 * 60 * 1000,
    structuralSharing: false,
  });
}
