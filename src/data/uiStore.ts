import { create } from "zustand";
import { persist } from "zustand/middleware";

/** A progression moment: a level-up, or a rank promotion (the Aura Shift). Indices are into RANK_BANDS. */
export type Ceremony =
  | { kind: "level"; level: number; title: string }
  | { kind: "rank"; from: number; to: number; preview: boolean };

interface UiState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
  /** Topic shown in the Topic Detail side panel (not persisted). */
  openTopicId: string | null;
  openTopic: (id: string) => void;
  closeTopic: () => void;
  /** Skill Tree filter, kept for the session so coming back doesn't reset it. */
  treeFilter: "all" | "unlocked" | "weak" | "blind";
  setTreeFilter: (f: UiState["treeFilter"]) => void;
  /** Quests that just completed and still owe their reward moment (aura pulse + fill). */
  rewards: string[];
  queueReward: (questIds: string[]) => void;
  clearReward: (questId: string) => void;
  /** Ctrl+K command palette and the "?" shortcut sheet (not persisted). */
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  shortcutsOpen: boolean;
  setShortcutsOpen: (open: boolean) => void;
  ceremony: Ceremony | null;
  startCeremony: (c: Ceremony) => void;
  endCeremony: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
      openTopicId: null,
      openTopic: (id) => set({ openTopicId: id }),
      closeTopic: () => set({ openTopicId: null }),
      treeFilter: "all",
      setTreeFilter: (treeFilter) => set({ treeFilter }),
      rewards: [],
      queueReward: (ids) => set((s) => ({ rewards: [...new Set([...s.rewards, ...ids])] })),
      clearReward: (id) => set((s) => ({ rewards: s.rewards.filter((r) => r !== id) })),
      paletteOpen: false,
      setPaletteOpen: (paletteOpen) => set({ paletteOpen }),
      shortcutsOpen: false,
      setShortcutsOpen: (shortcutsOpen) => set({ shortcutsOpen }),
      ceremony: null,
      startCeremony: (ceremony) => set({ ceremony }),
      endCeremony: () => set({ ceremony: null }),
    }),
    { name: "algocompass-ui", partialize: (s) => ({ sidebarExpanded: s.sidebarExpanded }) },
  ),
);
