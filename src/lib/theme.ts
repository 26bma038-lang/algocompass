import { create } from "zustand";
import { readPref, writePref } from "@/data/settings";

/**
 * Colour themes (redesign). A theme is a token set on <html data-theme> (src/styles/globals.css):
 * ground, glass, ink tint and a two-tone accent. The Codeforces rank colour is separate (--rank).
 */
export type ThemeId = "neon-arcade" | "ember" | "ocean";

export const THEMES: readonly { id: ThemeId; name: string; blurb: string }[] = [
  { id: "neon-arcade", name: "Neon Arcade", blurb: "Electric violet and cyan" },
  { id: "ember", name: "Ember", blurb: "Orange and gold on charcoal" },
  { id: "ocean", name: "Ocean", blurb: "Teal and bright blue on navy" },
];

export const DEFAULT_THEME: ThemeId = "neon-arcade";
const MIRROR_KEY = "algocompass-theme";
const PREF_KEY = "theme";

const isTheme = (v: unknown): v is ThemeId => THEMES.some((t) => t.id === v);

function apply(id: ThemeId) {
  document.documentElement.dataset.theme = id;
}

/** Before the first render (main.tsx): the localStorage mirror, so there's no flash of the default. */
export function initTheme(): ThemeId {
  let id: ThemeId = DEFAULT_THEME;
  try {
    const saved = localStorage.getItem(MIRROR_KEY);
    if (isTheme(saved)) id = saved;
  } catch {
    // Storage blocked: the default theme.
  }
  apply(id);
  // The settings store is the source of truth; reconcile once it loads.
  void readPref<ThemeId>(PREF_KEY).then((stored) => {
    if (isTheme(stored) && stored !== useThemeStore.getState().theme) useThemeStore.getState().setTheme(stored);
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
    try {
      localStorage.setItem(MIRROR_KEY, id);
    } catch {
      // The store below still persists it.
    }
    void writePref(PREF_KEY, id);
  },
}));
