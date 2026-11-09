import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { virtualCandidates, virtualResult, type Division, type VirtualCandidate, type VirtualResult, type VirtualRow } from "@/engine/virtual";
import { useCfProblemset } from "./cfProblemset";
import { readHandles } from "./settings";
import { getCfAdapter, getRepo } from "./syncStore";

/** Virtual contests (v1.7): the data side. Solves come from your synced Codeforces submissions only. */

const nowS = () => Math.floor(Date.now() / 1000);

export interface VirtualView {
  row: VirtualRow;
  result: VirtualResult;
}

/** Every virtual you started, newest first, each with what your submissions say you solved. */
export function useVirtuals() {
  return useQuery({
    queryKey: ["db", "virtuals"],
    queryFn: async (): Promise<VirtualView[]> => {
      const repo = await getRepo();
      const [rows, subs] = await Promise.all([repo.getVirtuals(), repo.getCfSubmissions()]);
      return rows.map((row) => ({ row, result: virtualResult(row, subs) }));
    },
  });
}

/** Past rounds of a division you could take as a virtual. */
export function useVirtualCandidates(division: Division) {
  const problemset = useCfProblemset();
  return useQuery({
    queryKey: ["db", "virtual-candidates", division, problemset.data?.fetchedAt ?? null],
    enabled: !!problemset.data,
    queryFn: async (): Promise<VirtualCandidate[]> => {
      const repo = await getRepo();
      const [rounds, subs, results, virtuals] = await Promise.all([repo.getCfRounds(), repo.getCfSubmissions(), repo.getContestResults(), repo.getVirtuals()]);
      const attempted = new Set<number>();
      for (const s of subs) if (s.contestId !== null) attempted.add(s.contestId);
      for (const r of results) if (r.participated) attempted.add(Number(r.contestId.slice(3)));
      for (const v of virtuals) attempted.add(v.contestId);
      return virtualCandidates({ rounds, problems: problemset.data?.problems ?? [], attempted, division, now: nowS() });
    },
  });
}

/**
 * Pulls your latest Codeforces submissions through the adapter (a light update, Codeforces only),
 * so solves inside a running virtual show up. Fails soft: returns false offline or on an API error.
 */
export async function checkVirtualSolves(): Promise<boolean> {
  const handle = (await readHandles()).codeforces.trim();
  if (!handle) return false;
  try {
    const subs = await getCfAdapter().getSubmissions(handle, { from: 1, count: 50 });
    await (await getRepo()).saveCfSubmissions(subs);
    return true;
  } catch {
    return false;
  }
}

export function useCheckVirtualSolves() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: checkVirtualSolves,
    onSuccess: (ok) => (ok ? client.invalidateQueries({ queryKey: ["db"] }) : undefined),
  });
}

export function useStartVirtual() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (c: VirtualCandidate) => {
      const repo = await getRepo();
      if ((await repo.getVirtuals()).some((v) => v.endedAt === null && v.startedAt + v.durationSeconds > nowS())) throw new Error("A virtual contest is already running.");
      await repo.startVirtual({ contestId: c.contestId, name: c.name, startedAt: nowS(), durationSeconds: c.durationSeconds, problems: c.problems });
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db"] }),
    onError: (e) => toast.error("Couldn't start it", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/** "I'm done": stops the clock now. A last check for solves runs first. */
export function useEndVirtual() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await checkVirtualSolves();
      await (await getRepo()).endVirtual(id, nowS());
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db"] }),
    onError: (e) => toast.error("Couldn't end it", { description: e instanceof Error ? e.message : String(e) }),
  });
}

/** Removes a virtual from your list (the round becomes pickable again if you never submitted in it). */
export function useDeleteVirtual() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await getRepo()).deleteVirtual(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["db"] }),
  });
}
