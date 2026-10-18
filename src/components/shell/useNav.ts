import { useMemo } from "react";
import { useContestsSeen } from "@/data/learn";
import { usePath } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { contestsReady } from "@/engine/learn";
import { navFor, SETTINGS_NAV, type NavItem } from "./nav";

/**
 * The sidebar for the current mode (v1.3). Beginner mode hides Contests until the Beginner Path's
 * Recursion step is done, then shows it with a "New" badge until it's opened.
 */
export function useNav(): { mode: "smart" | "beginner"; primary: NavItem[]; all: NavItem[]; contestsBadge: boolean } {
  const mode = usePrefs().data?.mode ?? "smart";
  const path = usePath().data;
  const seen = useContestsSeen().data;
  const unlocked = contestsReady(path);
  return useMemo(() => {
    const contestsBadge = mode === "beginner" && unlocked && seen === false;
    const primary = navFor(mode, { contestsUnlocked: unlocked, contestsNew: contestsBadge });
    return { mode, primary, all: [...primary, SETTINGS_NAV], contestsBadge };
  }, [mode, unlocked, seen]);
}
