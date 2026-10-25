import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { buildLibrary, EMPTY_HISTORY, orderGroups, type LearnHistory, type TopicGroup } from "@/engine/learn";
import type { BeginnerPath } from "@/engine/path";
import { TOPICS } from "@/engine/topics";
import { RESOURCES } from "./catalog";
import { usePath } from "./path";
import { usePrefs } from "./prefs";
import { useTopicReport } from "./queries";
import { readPref, writePref } from "./settings";
import { topicWeakness } from "./sheets";

/**
 * Learn (v1.3): what you last opened (so "Continue learning" resumes it) and which lessons you've
 * read, kept as a setting (in memory during a Debug preview), plus the video library.
 */

const KEY = "learn";
export const learnKey = ["settings", "learn"] as const;

/** Saved history, cleaned: anything malformed reads as nothing opened yet. */
export async function readLearnHistory(): Promise<LearnHistory> {
  const saved = await readPref<Partial<LearnHistory>>(KEY);
  const lesson = saved?.lesson && typeof saved.lesson.stepId === "string" && typeof saved.lesson.at === "number" ? saved.lesson : null;
  const video = saved?.video && typeof saved.video.id === "string" && typeof saved.video.at === "number" ? saved.video : null;
  const read = Array.isArray(saved?.read) ? saved.read.filter((r): r is string => typeof r === "string") : [];
  return { lesson, video, read };
}

export type LearnEvent = { kind: "lesson"; stepId: string } | { kind: "video"; id: string } | { kind: "read"; stepId: string };

/** Applies one event (read fresh, so quick successive events don't overwrite each other). */
export async function recordLearn(e: LearnEvent, now = Math.floor(Date.now() / 1000)): Promise<LearnHistory> {
  const h = await readLearnHistory();
  const next: LearnHistory =
    e.kind === "lesson"
      ? { ...h, lesson: { stepId: e.stepId, at: now } }
      : e.kind === "video"
        ? { ...h, video: { id: e.id, at: now } }
        : { ...h, read: h.read.includes(e.stepId) ? h.read : [...h.read, e.stepId] };
  await writePref(KEY, next);
  return next;
}

export function useLearnHistory() {
  return useQuery({ queryKey: learnKey, queryFn: readLearnHistory, staleTime: Infinity, placeholderData: EMPTY_HISTORY });
}

export function useRecordLearn() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (e: LearnEvent) => recordLearn(e),
    onSuccess: (h) => client.setQueryData(learnKey, h),
  });
}

/** Every verified video, grouped by topic, in this mode's order (weakest first in smart mode). */
export function useLibrary(): { groups: TopicGroup[]; weakness: Map<string, number>; path: BeginnerPath | null; ready: boolean } {
  const path = usePath();
  const report = useTopicReport();
  const mode = usePrefs().data?.mode ?? "smart";
  const pathData = path.data?.path ?? null;
  return useMemo(() => {
    const weakness = topicWeakness(report.data);
    const groups = orderGroups(buildLibrary(TOPICS, RESOURCES, pathData), mode, weakness, pathData);
    return { groups, weakness, path: pathData, ready: pathData !== null };
  }, [report.data, mode, pathData]);
}

/** Contests' "New" badge in Beginner mode: shown from the milestone until Contests is first opened. */
const CONTESTS_SEEN_KEY = "contestsSeen";
export const contestsSeenKey = ["settings", "contestsSeen"] as const;

export function useContestsSeen() {
  return useQuery({ queryKey: contestsSeenKey, queryFn: async () => (await readPref<boolean>(CONTESTS_SEEN_KEY)) === true, staleTime: Infinity });
}

export function useMarkContestsSeen() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => writePref(CONTESTS_SEEN_KEY, true),
    onSuccess: () => client.setQueryData(contestsSeenKey, true),
  });
}

/** The lesson's "How to solve on LeetCode" guide (v1.4): open for a beginner until "Got it". */
const SOLVE_GUIDE_KEY = "solveGuideSeen";
export const solveGuideKey = ["settings", "solveGuideSeen"] as const;

export function useSolveGuideSeen() {
  return useQuery({ queryKey: solveGuideKey, queryFn: async () => (await readPref<boolean>(SOLVE_GUIDE_KEY)) === true, staleTime: Infinity });
}

export function useDismissSolveGuide() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: () => writePref(SOLVE_GUIDE_KEY, true),
    onSuccess: () => client.setQueryData(solveGuideKey, true),
  });
}
