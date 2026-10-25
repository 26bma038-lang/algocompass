import { createContext, useContext } from "react";

/**
 * A strip under the screen's scroll area (v1.4), for a bar that must never cover content: the
 * lesson's flow bar portals into it, so the page scrolls *above* the bar instead of under it.
 * Empty (and hidden) on every other screen.
 */
export const ShellFooterContext = createContext<HTMLElement | null>(null);

export const useShellFooter = () => useContext(ShellFooterContext);
