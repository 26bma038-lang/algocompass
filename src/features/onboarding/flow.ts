import { lessonPath } from "@/components/shell/nav";

/**
 * First launch, as data (v1.4), so the rules are testable without rendering:
 * - New to DSA: "New to DSA?" → video language → Start lesson 1. No accounts asked; LeetCode is
 *   offered later, inside the lesson, at the moment it helps.
 * - Already practising: video language, Codeforces username (required) and LeetCode (optional),
 *   then the first update.
 */

export type OnboardingMode = "beginner" | "smart";
export type HandleField = "codeforces" | "leetcode";

// Same rules as Settings: Codeforces handles are 3–24 of letters, digits, _ . -; LeetCode letters, digits, _ -.
export const CF_HANDLE = /^[A-Za-z0-9_.-]{3,24}$/;
export const LC_HANDLE = /^[A-Za-z0-9_-]{1,40}$/;

/** What the form shows once a mode is picked. */
export function onboardingFields(mode: OnboardingMode | null): { language: boolean; handles: HandleField[] } {
  if (mode === null) return { language: false, handles: [] };
  return { language: true, handles: mode === "smart" ? ["codeforces", "leetcode"] : [] };
}

export interface OnboardingErrors {
  mode?: string;
  cf?: string;
  lc?: string;
}

/** Form errors in words. A beginner's handles are never read (the form doesn't show them). */
export function validateOnboarding(mode: OnboardingMode | null, handles: { codeforces: string; leetcode: string }): OnboardingErrors {
  if (!mode) return { mode: "Pick one to continue. You can change it later in Settings." };
  if (mode === "beginner") return {};
  const errors: OnboardingErrors = {};
  const cf = handles.codeforces.trim();
  const lc = handles.leetcode.trim();
  if (!cf) errors.cf = "Enter your Codeforces username. Smart mode is built around your rating.";
  else if (!CF_HANDLE.test(cf)) errors.cf = "Use 3–24 letters, digits, dots, hyphens or underscores.";
  if (lc && !LC_HANDLE.test(lc)) errors.lc = "Use letters, digits, hyphens or underscores.";
  return errors;
}

/** The primary button's words. */
export function primaryLabel(mode: OnboardingMode | null): string {
  return mode === "beginner" ? "Start lesson 1" : "Continue";
}

/** Where the app opens after onboarding: a beginner lands in Step 1's lesson, everyone else on Today. */
export function landingPath(mode: OnboardingMode, firstStepId: string | undefined): string {
  return mode === "beginner" && firstStepId ? lessonPath(firstStepId) : "/";
}
