import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSyncStore } from "@/data/syncStore";
import { useUiStore } from "@/data/uiStore";
import { useNav } from "./useNav";

/**
 * App-wide accelerators: Ctrl+1–5 screens (in sidebar order, so they follow the mode), Ctrl+, settings, Ctrl+B sidebar, Ctrl+K the command
 * palette, Ctrl+R sync (instead of reloading the webview), "?" the shortcut sheet, and Ctrl+Shift+D
 * the hidden Debug page.
 */
export function useShortcuts() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const all = useNav().all;
  const nav = useRef(all);
  nav.current = all;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      // "?" opens the cheat sheet, unless you're typing.
      if (e.key === "?" && !e.ctrlKey && !e.altKey && !e.metaKey) {
        const t = e.target as HTMLElement | null;
        if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
        e.preventDefault();
        useUiStore.getState().setPaletteOpen(false);
        useUiStore.getState().setShortcutsOpen(true);
        return;
      }
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (e.shiftKey) {
        if (key === "d") {
          e.preventDefault();
          navigate("/debug");
        }
        return;
      }
      if (key === "k") {
        e.preventDefault();
        const ui = useUiStore.getState();
        ui.setShortcutsOpen(false);
        ui.setPaletteOpen(!ui.paletteOpen);
        return;
      }
      if (key === "r") {
        e.preventDefault();
        void useSyncStore.getState().run();
        return;
      }
      if (key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      const item = nav.current.find((n) => n.shortcut === e.key);
      if (item) {
        e.preventDefault();
        navigate(item.to);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, toggleSidebar]);
}
