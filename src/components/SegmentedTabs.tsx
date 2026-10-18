import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface SegmentedTab {
  to: string;
  label: string;
  /** Match the path exactly (the tab for a screen's index route). */
  end?: boolean;
}

/**
 * The segmented tab row (DESIGN.md "Navigation (v1.2)"): a 40px glass track, the active tab in
 * accent-soft. Each tab is a route, so tabs deep-link. Used by Progress and Practice.
 */
export function SegmentedTabs({ label, tabs }: { label: string; tabs: readonly SegmentedTab[] }) {
  return (
    <nav aria-label={label} className="flex h-10 items-center gap-1 self-start rounded-md border border-glass-border bg-glass p-1">
      {tabs.map((t) => (
        <NavLink
          key={t.to}
          to={t.to}
          end={t.end}
          className={({ isActive }) =>
            cn(
              "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
              isActive ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
            )
          }
        >
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}
