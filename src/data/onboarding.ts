import { useQuery } from "@tanstack/react-query";
import { AdapterError } from "@/adapters/http";
import type { Platform } from "./types";
import { readSavedHandles, resolveHandles, writeHandles, type Handles } from "./settings";
import { getRepo } from "./syncStore";

/** First launch: whether to show the welcome screen, and checking handles against the platforms. */

export const handlesStateKey = ["settings", "handles-state"] as const;

/** `data === null` → show onboarding. */
export function useHandlesState() {
  return useQuery({
    queryKey: handlesStateKey,
    staleTime: Infinity,
    queryFn: async () => {
      return resolveHandles({ readSaved: readSavedHandles, write: writeHandles, repo: await getRepo() });
    },
  });
}

// ---------- checking handles against the platforms ----------

export type HandleCheck =
  | { status: "ok"; handle: string }
  | { status: "skipped" }
  | { status: "not-found" | "offline" | "error"; message: string };

const SITE: Record<Platform, string> = { cf: "Codeforces", lc: "LeetCode" };

/** Turns an adapter failure into words for the form: what's wrong and what to do. */
export function describeFailure(platform: Platform, handle: string, e: unknown): HandleCheck {
  if (e instanceof AdapterError && e.kind === "not-found") {
    return {
      status: "not-found",
      message:
        platform === "cf"
          ? `No Codeforces user "${handle}". Check the spelling: it's the name on your profile URL.`
          : `No LeetCode user "${handle}". Use the username from leetcode.com/u/<username>, not your display name.`,
    };
  }
  if (e instanceof AdapterError && e.kind === "network") {
    return { status: "offline", message: `Couldn't reach ${SITE[platform]}. Check your connection and try again.` };
  }
  const detail = e instanceof Error ? e.message : String(e);
  return { status: "error", message: `${SITE[platform]} didn't answer properly (${detail}). Try again in a minute.` };
}

export interface HandleCheckers {
  cf: (handle: string) => Promise<{ handle: string }>;
  lc: (username: string) => Promise<{ username: string }>;
}

/** Checks both handles in parallel. An empty LeetCode username is skipped (it's optional). */
export async function checkHandles(h: Handles, check: HandleCheckers): Promise<{ cf: HandleCheck; lc: HandleCheck }> {
  const cfHandle = h.codeforces.trim();
  const lcHandle = h.leetcode.trim();
  const [cf, lc] = await Promise.all([
    check.cf(cfHandle).then(
      (u): HandleCheck => ({ status: "ok", handle: u.handle }),
      (e) => describeFailure("cf", cfHandle, e),
    ),
    lcHandle
      ? check.lc(lcHandle).then(
          (u): HandleCheck => ({ status: "ok", handle: u.username }),
          (e) => describeFailure("lc", lcHandle, e),
        )
      : Promise.resolve<HandleCheck>({ status: "skipped" }),
  ]);
  return { cf, lc };
}
