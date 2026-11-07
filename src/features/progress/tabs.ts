import type { SegmentedTab } from "@/components/SegmentedTabs";
import { LABELS } from "@/lib/glossary";

/**
 * Progress's two tabs (v1.4, was three): Overview (badges are a card on it, and "See all" opens
 * `/progress/badges` under the same tab) and Topics (a list first; `/progress/topics/map` is the
 * Skill Tree, under the same tab).
 */
export const PROGRESS_TABS: readonly SegmentedTab[] = [
  { to: "/progress", label: "Overview", end: true, activeOn: ["/progress/badges", "/progress/achievements"] },
  { to: "/progress/topics", label: LABELS.topics },
];

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
