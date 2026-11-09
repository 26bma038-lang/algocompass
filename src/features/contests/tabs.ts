import type { SegmentedTab } from "@/components/SegmentedTabs";
import { LABELS } from "@/lib/glossary";

/**
 * Contests' tabs (v1.8), each its own route: Upcoming (the next round first), Your rounds (the
 * review cards and every past round) and Virtual contest. A running virtual contest leads all three.
 */
export const CONTESTS_TABS: readonly SegmentedTab[] = [
  { to: "/contests", label: LABELS.upcoming, end: true },
  { to: "/contests/rounds", label: LABELS.yourRounds },
  { to: "/contests/virtual", label: LABELS.virtualContest },
];
