import type { SyncStatus } from "@/data/syncStore";
import type { Streak } from "@/engine/activity";
import { STATUS_UNLOCK_STEPS } from "@/engine/learn";
import { LABELS, updatedAgo } from "@/lib/glossary";

/**
 * What the top bar shows (v1.4), and the words on each control. Every control has a visible label
 * or a tooltip; nothing is a bare icon or an en dash.
 * - Smart (v1.4 polish): search and Update. Today's goals, the streak and the level live on Today
 *   and Progress, so the top bar no longer repeats them.
 * - Beginner: search and "Step X of 14". The streak and level join after Step 3, and only once
 *   they exist (a beginner without an account has no synced activity, so no streak).
 */
export type TopBarItem = "search" | "step" | "update" | "streak" | "level";

export function topBarItems(a: { mode: "smart" | "beginner"; stepsDone: number; hasStreak: boolean; hasLevel: boolean }): TopBarItem[] {
  if (a.mode === "smart") return ["search", "update"];
  const out: TopBarItem[] = ["search", "step"];
  if (a.stepsDone >= STATUS_UNLOCK_STEPS) {
    if (a.hasStreak) out.push("streak");
    if (a.hasLevel) out.push("level");
  }
  return out;
}

/** "Step 3 of 14", or "All 14 steps done". `current` is the 0-based current step. */
export const stepLabel = (current: number | null, total: number) => (current === null ? `All ${total} steps done` : `Step ${current + 1} of ${total}`);

/** "3 days", "1 day", "No streak yet" (no data), "No streak" (it ended). */
export function streakLabel(streak: Streak | null): string {
  if (!streak) return "No streak yet";
  if (streak.current === 0) return "No streak";
  return `${streak.current} ${streak.current === 1 ? "day" : "days"}`;
}

/** "Level 7", or "No level yet" before any XP. */
export const levelLabel = (level: number | null) => (level === null ? "No level yet" : `Level ${level}`);

/**
 * The Update control's words (v1.4 polish): a status in plain text beside a labelled button, and a
 * failure says which site failed instead of a bare warning icon.
 */
export function updateStatus(
  status: SyncStatus,
  a: { failed: readonly string[]; ago: string | null },
): { text: string; button: string; tone: "muted" | "warning" } {
  switch (status) {
    case "syncing":
      return { text: LABELS.updating, button: LABELS.update, tone: "muted" };
    case "idle":
      return { text: LABELS.notUpdated, button: LABELS.update, tone: "muted" };
    case "offline":
      return { text: "Offline, showing saved data", button: "Retry", tone: "muted" };
    case "partial":
      return { text: `${a.failed.join(" and ") || "Update"} didn't update`, button: "Retry", tone: "warning" };
    case "ok":
      return { text: a.ago ? updatedAgo(a.ago) : LABELS.updated, button: LABELS.update, tone: "muted" };
  }
}
