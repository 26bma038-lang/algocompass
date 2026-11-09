import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cleanHandle, personStats, type PersonStats } from "@/engine/friends";
import { refreshFriend } from "./friendsRefresh";
import type { FriendRow } from "./repo";
import { getFriendAdapters, getRepo } from "./syncStore";
import type { CfUser, LcProfile } from "./types";

/** Progress → Friends (v1.7): you and the friends you added, from public profiles, stored only here. */

const nowS = () => Math.floor(Date.now() / 1000);

export interface FriendsView {
  you: PersonStats;
  youHandles: { cf: string | null; lc: string | null };
  friends: FriendRow[];
}

export function useFriends() {
  return useQuery({
    queryKey: ["db", "friends"],
    queryFn: async (): Promise<FriendsView> => {
      const repo = await getRepo();
      const [cfProfile, lcProfile, subs, recent, activity, friends] = await Promise.all([
        repo.getProfile<CfUser>("cf"),
        repo.getProfile<LcProfile>("lc"),
        repo.getCfSubmissions(),
        repo.getLcRecentAc(),
        repo.getDailyActivity(),
        repo.getFriends(),
      ]);
      // You, counted exactly as a friend is (the same function), from your synced data.
      const you = personStats({
        cf: cfProfile ? { user: cfProfile.data, submissions: subs, complete: true } : null,
        lc: lcProfile ? { profile: lcProfile.data, recent } : null,
        activity,
        now: nowS(),
      });
      return { you, youHandles: { cf: cfProfile?.handle ?? null, lc: lcProfile?.handle ?? null }, friends };
    },
  });
}

/** Adds a friend after checking each handle exists (through the adapters), then reads their profiles. */
export function useAddFriend() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ cf, lc }: { cf: string; lc: string }) => {
      const cfHandle = cleanHandle(cf);
      const lcHandle = cleanHandle(lc);
      if (!cfHandle && !lcHandle) throw new Error("Add a Codeforces handle, a LeetCode username, or both.");
      const repo = await getRepo();
      const existing = await repo.getFriends();
      const same = (a: string | null, b: string) => !!a && !!b && a.toLowerCase() === b.toLowerCase();
      if (existing.some((f) => same(f.cfHandle, cfHandle) || same(f.lcHandle, lcHandle))) throw new Error("That friend is already on your list.");
      const adapters = getFriendAdapters();
      const errors: string[] = [];
      const fail = (site: string) => (e: unknown) => (errors.push(`${site}: ${e instanceof Error ? e.message : String(e)}.`), null);
      // Each site's own spelling of the name is the one kept.
      const cfName = cfHandle ? await adapters.cf.getUser(cfHandle).then((u) => u.handle, fail("Codeforces")) : null;
      const lcName = lcHandle ? await adapters.lc.getProfile(lcHandle).then((p) => p.username, fail("LeetCode")) : null;
      if (errors.length) throw new Error(`${errors.join(" ")} Check the spelling, or try again when you're online.`);
      const now = nowS();
      const id = await repo.addFriend(cfName, lcName, now);
      const row = (await repo.getFriends()).find((f) => f.id === id)!;
      await refreshFriend(repo, adapters, row, now);
      return cfName ?? lcName ?? "";
    },
    onSuccess: async (name) => {
      await client.invalidateQueries({ queryKey: ["db", "friends"] });
      toast(`Added ${name}`, { id: `friend-${name}` });
    },
  });
}

export function useRemoveFriend() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => (await getRepo()).removeFriend(id),
    onSuccess: () => client.invalidateQueries({ queryKey: ["db", "friends"] }),
  });
}
