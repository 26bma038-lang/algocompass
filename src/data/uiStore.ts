import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UiState {
  sidebarExpanded: boolean;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      sidebarExpanded: false,
      toggleSidebar: () => set((s) => ({ sidebarExpanded: !s.sidebarExpanded })),
    }),
    { name: "algocompass-ui" },
  ),
);
