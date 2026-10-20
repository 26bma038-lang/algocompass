/**
 * Preview profiles (Debug → "Preview a fresh beginner"). The app reloads against a separate,
 * wiped database (sqlite:algocompass-preview.db; in-memory in a plain browser) and an in-memory
 * settings store, so your real data and settings are never read for writing or changed. While a
 * preview runs, nothing reaches the OS either: no reminder schedule, tray text or autostart changes.
 * Exit reloads the real app.
 */

const KEY = "algocompass:preview";

export type PreviewKind = "beginner" | "welcome";

function read(): PreviewKind | null {
  try {
    const v = sessionStorage.getItem(KEY);
    return v === "beginner" || v === "welcome" ? v : null;
  } catch {
    return null;
  }
}

/** Fixed for the life of the page: a preview starts and ends with a reload. */
export const PREVIEW: PreviewKind | null = typeof window === "undefined" ? null : read();

export function startPreview(kind: PreviewKind) {
  try {
    sessionStorage.setItem(KEY, kind);
  } catch {
    return;
  }
  window.location.hash = "#/";
  window.location.reload();
}

export function exitPreview() {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Nothing to clear.
  }
  window.location.hash = "#/debug";
  window.location.reload();
}

/**
 * The preview's settings: a fresh beginner who just finished onboarding (Beginner mode, English
 * videos, no handles, tour seen), or nothing at all for the welcome screen.
 */
export function previewSeed(kind: PreviewKind): Map<string, unknown> {
  if (kind === "welcome") return new Map();
  return new Map<string, unknown>([
    ["prefs", { mode: "beginner", videoLang: "en", followedSheet: null }],
    ["onboarded", true],
    ["handles", { codeforces: "", leetcode: "" }],
    ["tipTourSeen", 99],
  ]);
}
