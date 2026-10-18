import { create } from "zustand";
import { PREVIEW } from "./sandbox";
import { readPref, writePref } from "@/data/settings";

/**
 * Themes (v1.2 simplify): Light, Dark, or System (default), which follows the Windows light/dark
 * setting and updates live when it changes. The resolved scheme is a token set on <html data-theme>
 * (src/styles/globals.css). The Codeforces rank colour is separate (--rank) and has a darker set
 * for Light.
 */
export type ThemeId = "system" | "light" | "dark";
export type Scheme = "light" | "dark";

export const THEMES: readonly { id: ThemeId; name: string; blurb: string }[] = [
  { id: "system", name: "System", blurb: "Matches Windows" },
  { id: "light", name: "Light", blurb: "Near-black on white" },
  { id: "dark", name: "Dark", blurb: "White on near-black" },
];

export const DEFAULT_THEME: ThemeId = "system";
const MIRROR_KEY = "algocompass-theme";
const PREF_KEY = "theme";

const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

/**
 * A saved value → a theme. v1.1's Neon Arcade / Ember / Ocean (and anything unknown) become System,
 * so nobody is left on a theme that no longer exists.
 */
export function migrateTheme(saved: unknown): ThemeId {
  return isTheme(saved) ? saved : DEFAULT_THEME;
}

const darkQuery = () => (typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null);

export function systemScheme(): Scheme {
  return darkQuery()?.matches === false ? "light" : "dark";
}

export function resolveScheme(id: ThemeId, system: Scheme = systemScheme()): Scheme {
  return id === "system" ? system : id;
}

function apply(id: ThemeId) {
  const scheme = resolveScheme(id);
  const root = document.documentElement;
  root.dataset.theme = scheme;
  // Native form controls and scrollbars follow too.
  root.style.colorScheme = scheme;
  useSchemeStore.setState({ scheme });
}

/** Before the first render (main.tsx): the localStorage mirror, so there's no flash of the wrong theme. */
export function initTheme(): ThemeId {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(MIRROR_KEY);
  } catch {
    // Storage blocked: the default theme.
  }
  const id = migrateTheme(raw);
  if (raw !== null && raw !== id) {
    try {
      localStorage.setItem(MIRROR_KEY, id);
    } catch {
      // The store below still persists it.
    }
  }
  apply(id);
  // Windows switched light/dark: follow it live while the theme is System.
  darkQuery()?.addEventListener("change", () => {
    if (useThemeStore.getState().theme === "system") apply("system");
  });
  // The settings store is the source of truth; reconcile once it loads, migrating old theme ids.
  void readPref<string>(PREF_KEY).then((stored) => {
    if (stored === null) return;
    const next = migrateTheme(stored);
    if (next !== stored) void writePref(PREF_KEY, next);
    if (next !== useThemeStore.getState().theme) useThemeStore.getState().setTheme(next);
  });
  return id;
}

interface ThemeState {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: DEFAULT_THEME,
  setTheme: (id) => {
    apply(id);
    set({ theme: id });
    // A preview profile keeps its theme to itself (its settings live in memory).
    if (!PREVIEW) {
      try {
        localStorage.setItem(MIRROR_KEY, id);
      } catch {
        // The store below still persists it.
      }
    }
    void writePref(PREF_KEY, id);
  },
}));

/** The scheme actually showing ("light" | "dark"), for code that can't use CSS variables. */
export const useSchemeStore = create<{ scheme: Scheme }>(() => ({ scheme: "dark" }));
