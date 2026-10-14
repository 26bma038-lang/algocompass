import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/data/uiStore";
import { ALL_NAV } from "./nav";

/**
 * App-wide accelerators: Ctrl+1–5 screens, Ctrl+, settings, Ctrl+B sidebar,
 * Ctrl+Shift+D the hidden Debug page.
 */
export function useShortcuts() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey) return;
      const key = e.key.toLowerCase();
      if (e.shiftKey) {
        if (key === "d") {
          e.preventDefault();
          navigate("/debug");
        }
        return;
      }
      if (key === "b") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      const item = ALL_NAV.find((n) => n.shortcut === e.key);
      if (item) {
        e.preventDefault();
        navigate(item.to);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate, toggleSidebar]);
}
