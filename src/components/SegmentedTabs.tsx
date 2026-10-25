import { NavLink, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

export interface SegmentedTab {
  to: string;
  label: string;
  /** Match the path exactly (the tab for a screen's index route). */
  end?: boolean;
  /** Other paths (and what's under them) that also mark this tab active: `/practice/mix`, `/progress/badges`. */
  activeOn?: string[];
}

/** Is this tab the current one? */
export function tabActive(t: SegmentedTab, pathname: string): boolean {
  const under = (p: string) => pathname === p || pathname.startsWith(`${p}/`);
  return (t.end ? pathname === t.to : under(t.to)) || (t.activeOn ?? []).some(under);
}

/**
 * The segmented tab row (DESIGN.md "Navigation (v1.2)"): a 40px glass track, the active tab in
 * accent-soft. Each tab is a route, so tabs deep-link. Used by Progress and Practice.
 */
export function SegmentedTabs({ label, tabs }: { label: string; tabs: readonly SegmentedTab[] }) {
  const { pathname } = useLocation();
  return (
    <nav aria-label={label} className="flex h-10 items-center gap-1 self-start rounded-md border border-glass-border bg-glass p-1">
      {tabs.map((t) => {
        const active = tabActive(t, pathname);
        return (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
              active ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
            )}
          >
            {t.label}
          </NavLink>
        );
      })}
    </nav>
  );
}
