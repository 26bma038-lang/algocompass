import { Home, Network, ScrollText, Settings, Swords, Target, Trophy, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key pressed with Ctrl to jump here. */
  shortcut: string;
  /** Extra path prefixes that also mark this item active (Topic Detail lives under Skill Tree). */
  alsoActiveOn?: string[];
}

export const PRIMARY_NAV: NavItem[] = [
  { to: "/", label: "Home Base", icon: Home, shortcut: "1" },
  { to: "/skill-tree", label: "Skill Tree", icon: Network, shortcut: "2", alsoActiveOn: ["/topics"] },
  { to: "/practice", label: "Practice", icon: Target, shortcut: "3" },
  { to: "/quests", label: "Quests", icon: ScrollText, shortcut: "4" },
  { to: "/contests", label: "Contests", icon: Swords, shortcut: "5" },
  { to: "/achievements", label: "Achievements", icon: Trophy, shortcut: "6" },
];

export const SETTINGS_NAV: NavItem = { to: "/settings", label: "Settings", icon: Settings, shortcut: "," };

export const ALL_NAV = [...PRIMARY_NAV, SETTINGS_NAV];

export function isNavItemActive(item: NavItem, pathname: string) {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.alsoActiveOn ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}
