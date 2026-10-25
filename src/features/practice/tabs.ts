import type { SegmentedTab } from "@/components/SegmentedTabs";
import { LABELS } from "@/lib/glossary";

/**
 * Practice's tabs per mode (v1.4). Smart: Today's problems (`/practice`, also `/practice/mix`) and
 * Sheets (the list and every sheet page). Beginner: none. Practice is the problems from your lessons,
 * and the sheets are a quiet card under them, so nothing competes with the next lesson problem.
 */
export function practiceTabs(mode: "smart" | "beginner"): SegmentedTab[] {
  if (mode === "beginner") return [];
  return [
    { to: "/practice", label: LABELS.todaysProblems, end: true, activeOn: ["/practice/mix"] },
    { to: "/practice/sheets", label: LABELS.sheets },
  ];
}

/** What `/practice` shows: today's problems in smart mode, the lesson problems in Beginner mode. */
export const practiceIndexFor = (mode: "smart" | "beginner") => (mode === "beginner" ? "lessons" : "mix");
