import { create } from "zustand";
import { persist } from "zustand/middleware";

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
    }),
    { name: "algocompass-ui", partialize: (s) => ({ sidebarExpanded: s.sidebarExpanded }) },
  ),
);
