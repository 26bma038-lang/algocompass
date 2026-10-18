import { CalendarDays, LineChart, Settings, Sun, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key pressed with Ctrl to jump here. */
  shortcut: string;
  /** One line on what the screen is for: the sidebar hover hint and the subtitle under the title. */
  description: string;
  /** Extra path prefixes that also mark this item active (Topic Detail deep links live under Progress). */
  alsoActiveOn?: string[];
}

/** The four screens (simplify, v1.2). Plain names, in the order you use them. */
export const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Today", icon: Sun, shortcut: "1", description: "What to do today: quests, today's mix, your streak and rating" },
  { to: "/practice", label: "Practice", icon: Target, shortcut: "2", description: "What to solve: today's mix, sheets like Striver A2Z, upsolves and problems by topic" },
  { to: "/progress", label: "Progress", icon: LineChart, shortcut: "3", description: "How you're growing: rating, level, weekly goals, topics and achievements", alsoActiveOn: ["/topics"] },
  { to: "/contests", label: "Contests", icon: CalendarDays, shortcut: "4", description: "Upcoming rounds, reminders and your past results" },
];

export const SETTINGS_NAV: NavItem = { to: "/settings", label: "Settings", icon: Settings, shortcut: ",", description: "Handles, theme, weekly goals, notifications and startup" };

export const ALL_NAV = [...PRIMARY_NAV, SETTINGS_NAV];

/** Routes from v1.1 and their new home, so old links and muscle memory still land somewhere sensible. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/skill-tree": "/progress/topics",
  "/quests": "/",
  "/achievements": "/progress/achievements",
};

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.alsoActiveOn ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The nav item a path belongs to (for the subtitle under the screen title). */
export function navItemFor(pathname: string): NavItem | undefined {
  return ALL_NAV.find((n) => isNavItemActive(n, pathname));
}
