import { useQuery } from "@tanstack/react-query";
import { buildPool, type ProblemPool } from "@/engine/mustDo";
import { loadSheet, PATH_SHEET_ID, SHEET_IDS } from "./sheets";

/**
 * Must-do problems after a video (v1.6): every problem in the bundled sheets and the Beginner Path,
 * merged by key (`buildPool`). The sheets are their own lazy chunks; this loads them on the first
 * video page and keeps the pool for the session.
 */

let poolPromise: Promise<ProblemPool> | null = null;
export function loadProblemPool(): Promise<ProblemPool> {
  poolPromise ??= Promise.all([...SHEET_IDS, PATH_SHEET_ID].map(loadSheet))
    .then((sheets) => buildPool(sheets, PATH_SHEET_ID))
    .catch((e: unknown) => {
      // A failed load (a missing chunk after an update) is tried again next time.
      poolPromise = null;
      throw e;
    });
  return poolPromise;
}

export function useProblemPool() {
  return useQuery({ queryKey: ["static", "problem-pool"], queryFn: loadProblemPool, staleTime: Infinity, gcTime: Infinity, structuralSharing: false });
}
