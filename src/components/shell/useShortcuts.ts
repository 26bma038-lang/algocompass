import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useUiStore } from "@/data/uiStore";
import { ALL_NAV } from "./nav";

/** App-wide accelerators: Ctrl+1–5 screens, Ctrl+, settings, Ctrl+B sidebar. */
export function useShortcuts() {
  const navigate = useNavigate();
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!e.ctrlKey || e.altKey || e.metaKey || e.shiftKey) return;
      if (e.key.toLowerCase() === "b") {
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
