import type { SegmentedTab } from "@/components/SegmentedTabs";
import { LABELS } from "@/lib/glossary";

/**
 * Progress's tabs. v1.4: Overview (badges are a card on it, and "See all" opens `/progress/badges`
 * under the same tab) and Topics (a list first; `/progress/topics/map` is the Skill Tree, under the
 * same tab). v1.7 added Your notes and Friends. v1.8: Your notes moved to Practice (they're about
 * problems; `/progress/notes` redirects), and Friends shows only when there's someone to compare:
 * always in smart mode, and in Beginner mode once you've entered a handle (the route always works).
 */
export function progressTabs(showFriends: boolean): SegmentedTab[] {
  return [
    { to: "/progress", label: "Overview", end: true, activeOn: ["/progress/badges", "/progress/achievements"] },
    { to: "/progress/topics", label: LABELS.topics },
    ...(showFriends ? [{ to: "/progress/friends", label: LABELS.friends }] : []),
  ];
}

/** Friends has something to show: smart mode (a Codeforces handle is required there), or a beginner with a handle. */
export const friendsTabShown = (mode: "smart" | "beginner", handles: { codeforces: string; leetcode: string } | null | undefined) =>
  mode === "smart" || !!handles?.codeforces || !!handles?.leetcode;

/**
 * The "Continue today's practice" button beside Progress's tabs (v1.4 polish): smart mode goes to
 * today's problems; a beginner goes straight back into the current lesson (Learn once the path is done).
 */
export function continuePractice(mode: "smart" | "beginner", currentLesson: string | null): { to: string; label: string } {
  if (mode === "smart") return { to: "/practice", label: LABELS.continuePractice };
  return { to: currentLesson ?? "/learn", label: LABELS.continuePractice };
}

export const BADGES_PATH = "/progress/badges";
export const TOPICS_MAP_PATH = "/progress/topics/map";
