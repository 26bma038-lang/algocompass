import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

/** Settings' sections in page order, by the id of each card's title. */
export const SETTINGS_SECTIONS = [
  { id: "handles-title", label: "Handles" },
  { id: "mode-title", label: "Mode" },
  { id: "language-title", label: "Language" },
  { id: "theme-title", label: "Theme" },
  { id: "goals-title", label: "Weekly goals" },
  { id: "notify-title", label: "Notifications" },
  { id: "startup-title", label: "Startup" },
  { id: "updates-title", label: "App updates" },
] as const;

const sectionOf = (id: string) => document.getElementById(id)?.closest("section") ?? null;

/**
 * v1.8: a sticky list beside the Settings cards, so a section is one click away instead of a
 * 2,500px scroll. The section in view is marked (aria-current), and a click scrolls its card to the top.
 */
export function SectionNav({ ready }: { ready: boolean }) {
  const [current, setCurrent] = useState<string>(SETTINGS_SECTIONS[0].id);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>("[data-shell-scroller]");
    const found = SETTINGS_SECTIONS.flatMap((s) => {
      const el = sectionOf(s.id);
      return el ? [{ id: s.id as string, el }] : [];
    });
    const first = found[0];
    const last = found[found.length - 1];
    if (!root || !first || !last) return;
    // The current section is the last one whose top has passed a line a third of the way down the view.
    const pick = () => {
      const line = root.getBoundingClientRect().top + root.clientHeight / 3;
      let at = first.id;
      for (const s of found) if (s.el.getBoundingClientRect().top <= line) at = s.id;
      // Scrolled to the bottom: the last card can't reach the line, so it's the one in view.
      if (root.scrollTop + root.clientHeight >= root.scrollHeight - 4) at = last.id;
      setCurrent(at);
    };
    pick();
    root.addEventListener("scroll", pick, { passive: true });
    return () => root.removeEventListener("scroll", pick);
  }, [ready]);

  const go = (id: string) => {
    const el = sectionOf(id);
    const root = document.querySelector<HTMLElement>("[data-shell-scroller]");
    if (!el || !root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Land the card 24px under the top, the page's own top padding.
    root.scrollBy({ top: el.getBoundingClientRect().top - root.getBoundingClientRect().top - 24, behavior: reduce ? "auto" : "smooth" });
    setCurrent(id);
  };

  return (
    <nav aria-label="Settings sections" className="sticky top-6 hidden w-40 shrink-0 self-start lg:block">
      <ul className="flex flex-col gap-0.5 border-l border-glass-border">
        {SETTINGS_SECTIONS.map((s) => (
          <li key={s.id}>
            <button
              type="button"
              onClick={() => go(s.id)}
              aria-current={current === s.id ? "location" : undefined}
              className={cn(
                "-ml-px block w-full border-l-2 py-1.5 pr-2 pl-4 text-left text-body-sm transition-colors duration-[var(--dur-fast)]",
                current === s.id ? "border-accent font-medium text-ink" : "border-transparent text-ink-muted hover:text-ink",
              )}
            >
              {s.label}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
