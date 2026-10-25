import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CONTESTS_MILESTONE_STEP } from "@/engine/learn";
import { pathState, type BeginnerPath, type PathState } from "@/engine/path";
import { problemStatus } from "@/engine/sheets";
import { readPrefs } from "./prefs";
import { buildSolveIndex } from "./sheets";
import { getRepo } from "./syncStore";
import { useUiStore } from "./uiStore";

/** The Beginner Path (v1.3): lessons in src/data/path/beginner-path.json, progress from SQLite. */

let pathPromise: Promise<BeginnerPath> | null = null;
export function loadPath(): Promise<BeginnerPath> {
  pathPromise ??= import("./path/beginner-path.json").then((m) => m.default as unknown as BeginnerPath);
  return pathPromise;
}

export interface PathView extends PathState {
  path: BeginnerPath;
  watched: ReadonlySet<string>;
  isDone: (key: string) => boolean;
}

export const pathKey = ["db", "path"] as const;

export function usePath() {
  return useQuery({
    queryKey: pathKey,
    structuralSharing: false,
    queryFn: async (): Promise<PathView> => {
      const repo = await getRepo();
      const [path, idx, watchedMap, recorded] = await Promise.all([loadPath(), buildSolveIndex(repo), repo.getWatchedVideos(), repo.getPathSteps()]);
      const watched = new Set(watchedMap.keys());
      const isDone = (key: string) => problemStatus(key, idx).done;
      return { ...pathState(path, isDone, watched, recorded), path, watched, isDone };
    },
  });
}

/** "Mark as watched" on any lesson or resource video. */
export function useSetWatched() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: async ({ videoId, watched }: { videoId: string; watched: boolean }) => {
      await (await getRepo()).setVideoWatched(videoId, watched, Math.floor(Date.now() / 1000));
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["db"] }),
    onError: (e) => toast.error("Couldn't save that", { description: e instanceof Error ? e.message : String(e) }),
  });
}

export function useWatchedVideos() {
  return useQuery({ queryKey: ["db", "watched"], queryFn: async () => (await getRepo()).getWatchedVideos() });
}

/**
 * Records path steps the moment the data shows them done (main video watched + required problems
 * solved): stores them so they never re-lock, queues the restrained reward moment on the step, and
 * says what unlocked. Mounted once in the app shell.
 */
export function usePathWatcher() {
  const { data } = usePath();
  const client = useQueryClient();
  const busy = useRef(false);
  useEffect(() => {
    if (!data || busy.current || data.newlyDone.length === 0) return;
    busy.current = true;
    void (async () => {
      try {
        await (await getRepo()).recordPathSteps(data.newlyDone, Math.floor(Date.now() / 1000));
        useUiStore.getState().queueReward(data.newlyDone.map((id) => `path:${id}`));
        const last = data.newlyDone[data.newlyDone.length - 1]!;
        const i = data.path.steps.findIndex((s) => s.id === last);
        const next = data.path.steps[i + 1];
        // Beginner mode: finishing Recursion is the "ready for contests" milestone (Contests joins the sidebar).
        const contests = data.newlyDone.includes(CONTESTS_MILESTONE_STEP) && (await readPrefs()).mode === "beginner";
        toast(`Step ${i + 1} done: ${data.path.steps[i]!.title}`, {
          id: `path-${last}`,
          description: [
            next ? `Step ${i + 2}, ${next.title}, is unlocked.` : "That's the whole Beginner Path. Pick a sheet to keep going.",
            contests ? "You're ready for contests: Contests is now in the sidebar." : "",
          ]
            .filter(Boolean)
            .join(" "),
        });
        await client.invalidateQueries({ queryKey: pathKey });
        // "Finish today's lesson step" (a beginner's goal) counts recorded steps.
        await client.invalidateQueries({ queryKey: ["db", "quests"] });
      } finally {
        busy.current = false;
      }
    })();
  }, [data, client]);
}
