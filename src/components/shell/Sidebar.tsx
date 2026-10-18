import { useState } from "react";
import { usePrefs } from "@/data/prefs";
import { NavLink, useLocation } from "react-router-dom";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/data/uiStore";
import { cn } from "@/lib/utils";
import { isNavItemActive, PRIMARY_NAV, SETTINGS_NAV, type NavItem, describe } from "./nav";

// Pattern adapted from 21st.dev animated sidebars (spring icon-rail collapse, traveling
// hover highlight, shared-layout active indicator), rebuilt on DESIGN.md tokens.
const SPRING = { type: "spring", stiffness: 380, damping: 32 } as const;

function SidebarLink({
  item,
  expanded,
  active,
  hovered,
  onHover,
}: {
  item: NavItem;
  expanded: boolean;
  active: boolean;
  hovered: boolean;
  onHover: (to: string | null) => void;
}) {
  const Icon = item.icon;
  const link = (
    <NavLink
      to={item.to}
      aria-label={expanded ? undefined : item.label}
      data-tour={item.to}
      onMouseEnter={() => onHover(item.to)}
      onFocus={() => onHover(item.to)}
      className={cn(
        "relative flex h-10 items-center gap-3 rounded-sm px-[13px]",
        "transition-colors duration-[var(--dur-fast)]",
        active ? "text-ink" : "text-ink-muted hover:text-ink",
      )}
    >
      {hovered && !active && (
        <motion.span
          layoutId="nav-hover"
          transition={SPRING}
          className="absolute inset-0 rounded-sm bg-glass-hover"
          aria-hidden
        />
      )}
      {active && (
        <>
          <motion.span
            layoutId="nav-active"
            transition={SPRING}
            className="absolute inset-0 rounded-sm bg-accent-soft"
            aria-hidden
          />
          <motion.span
            layoutId="nav-active-tick"
            transition={SPRING}
            className="absolute top-[10px] -left-[11px] h-5 w-[3px] rounded-r-full bg-accent shadow-aura"
            aria-hidden
          />
        </>
      )}
      <Icon
        aria-hidden
        className={cn("relative size-[18px] shrink-0", active && "text-accent")}
        strokeWidth={active ? 2.1 : 1.8}
      />
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.span
            key="label"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0, transition: { duration: 0.16, delay: 0.06 } }}
            exit={{ opacity: 0, transition: { duration: 0.08 } }}
            className="relative truncate text-body font-medium"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </NavLink>
  );

  // Hover or focus: what the screen is for, in one line (and the name, when the rail is collapsed).
  const beginner = usePrefs().data?.mode === "beginner";
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right" className="flex max-w-[260px] flex-col gap-1 p-3">
        <span className="flex items-center justify-between gap-3 font-semibold text-ink">
          {item.label}
          <kbd className="numeric rounded-xs border border-glass-border-strong px-1 text-label font-normal text-ink-muted">Ctrl {item.shortcut}</kbd>
        </span>
        <span className="text-label text-ink-muted">{describe(item, beginner)}</span>
      </TooltipContent>
    </Tooltip>
  );
}

export function Sidebar() {
  const expanded = useUiStore((s) => s.sidebarExpanded);
  const toggle = useUiStore((s) => s.toggleSidebar);
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState<string | null>(null);

  const renderItem = (item: NavItem) => (
    <SidebarLink
      key={item.to}
      item={item}
      expanded={expanded}
      active={isNavItemActive(item, pathname)}
      hovered={hovered === item.to}
      onHover={setHovered}
    />
  );

  return (
    <motion.nav
      aria-label="Main"
      initial={false}
      animate={{ width: expanded ? 220 : 64 }}
      transition={SPRING}
      className="relative z-10 flex shrink-0 flex-col overflow-hidden border-r border-glass-border bg-abyss-raised/85 py-3"
      onMouseLeave={() => setHovered(null)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setHovered(null);
      }}
    >
      <LayoutGroup id="sidebar">
        <div className="flex flex-col gap-1 px-[11px]">{PRIMARY_NAV.map(renderItem)}</div>
        <div className="mt-auto flex flex-col gap-1 px-[11px]">
          {renderItem(SETTINGS_NAV)}
          <button
            type="button"
            onClick={toggle}
            aria-label={expanded ? "Collapse sidebar" : "Expand sidebar"}
            aria-expanded={expanded}
            title={expanded ? "Collapse sidebar (Ctrl B)" : "Expand sidebar (Ctrl B)"}
            className="flex h-10 items-center gap-3 rounded-sm px-[13px] text-ink-faint transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
          >
            {expanded ? (
              <PanelLeftClose aria-hidden className="size-[18px] shrink-0" strokeWidth={1.8} />
            ) : (
              <PanelLeftOpen aria-hidden className="size-[18px] shrink-0" strokeWidth={1.8} />
            )}
            {expanded && <span className="truncate text-body-sm">Collapse</span>}
          </button>
        </div>
      </LayoutGroup>
    </motion.nav>
  );
}
