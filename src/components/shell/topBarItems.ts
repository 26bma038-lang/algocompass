import type { Streak } from "@/engine/activity";
import { STATUS_UNLOCK_STEPS } from "@/engine/learn";
import { LABELS } from "@/lib/glossary";

/**
 * What the top bar shows (v1.4), and the words on each control. Every control has a visible label
 * or a tooltip; nothing is a bare icon or an en dash.
 * - Smart: search, Update, today's goals, streak, level.
 * - Beginner: search and "Step X of 14". The streak and level join after Step 3, and only once
 *   they exist (a beginner without an account has no synced activity, so no streak).
 */
export type TopBarItem = "search" | "step" | "update" | "goals" | "streak" | "level";

export function topBarItems(a: { mode: "smart" | "beginner"; stepsDone: number; hasStreak: boolean; hasLevel: boolean }): TopBarItem[] {
  if (a.mode === "smart") return ["search", "update", "goals", "streak", "level"];
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

/** "Goals 1/3". */
export const goalsLabel = (done: number, total: number) => `${LABELS.goalsShort} ${done}/${total}`;
