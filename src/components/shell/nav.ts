import { CalendarDays, GraduationCap, LineChart, Settings, Sun, Target, type LucideIcon } from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Key pressed with Ctrl to jump here. Screens get theirs from their place in the sidebar (navFor). */
  shortcut: string;
  /** One line on what the screen is for: the sidebar hover hint and the subtitle under the title. */
  description: string;
  /** The same line in Beginner mode (v1.3), when the screen leads with something else. */
  beginnerDescription?: string;
  /** Extra path prefixes that also mark this item active (Topic Detail deep links live under Progress). */
  alsoActiveOn?: string[];
  /** A small "New" badge beside the label (Contests, the first time it appears in Beginner mode). */
  badge?: string;
}

type Screen = Omit<NavItem, "shortcut">;

/** The five screens (v1.3: Learn joins Today, Practice, Progress and Contests). Plain names. */
export const SCREENS = {
  today: { to: "/", label: "Today", icon: Sun, description: "Your next problem, today's goals and your rating", beginnerDescription: "Your next lesson step and today's goals" },
  learn: {
    to: "/learn",
    label: "Learn",
    icon: GraduationCap,
    description: "Video lessons for every topic, weakest first, and the Beginner Path",
    beginnerDescription: "The Beginner Path's lessons and a video for every topic",
  },
  practice: {
    to: "/practice",
    label: "Practice",
    icon: Target,
    description: "Problems to solve: today's problems, sheets like Striver A2Z, and more by topic",
    beginnerDescription: "The problems from your lessons, and popular sheets when you want more",
  },
  progress: { to: "/progress", label: "Progress", icon: LineChart, description: "How you're doing: rating, level, weekly goals, topics and badges", alsoActiveOn: ["/topics"] },
  contests: { to: "/contests", label: "Contests", icon: CalendarDays, description: "Upcoming rounds, reminders and your past results" },
} satisfies Record<string, Screen>;

export const SETTINGS_NAV: NavItem = { to: "/settings", label: "Settings", icon: Settings, shortcut: ",", description: "Usernames, mode, theme, weekly goals, reminders and startup" };

export type NavMode = "smart" | "beginner";

/**
 * The sidebar, with Ctrl+1… in sidebar order. v1.4: one order in both modes, Today · Learn ·
 * Practice · Progress · Contests (learn, then practise), so switching modes never moves anything.
 * Beginner mode adds Contests once the Beginner Path's Recursion step is done (`contestsUnlocked`),
 * with a "New" badge until it's been opened (`contestsNew`).
 */
export function navFor(mode: NavMode, opts: { contestsUnlocked?: boolean; contestsNew?: boolean } = {}): NavItem[] {
  const s = SCREENS;
  const contests: Screen[] =
    mode === "smart" ? [s.contests] : opts.contestsUnlocked ? [{ ...s.contests, badge: opts.contestsNew ? "New" : undefined }] : [];
  const screens: Screen[] = [s.today, s.learn, s.practice, s.progress, ...contests];
  return screens.map((n, i) => ({ ...n, shortcut: String(i + 1) }));
}

/** Every screen (shortcuts as in smart mode): for lookups that don't depend on the mode. */
export const PRIMARY_NAV: NavItem[] = navFor("smart");
export const ALL_NAV = [...PRIMARY_NAV, SETTINGS_NAV];

/** Routes from v1.1 and their new home, so old links and muscle memory still land somewhere sensible. */
export const LEGACY_REDIRECTS: Record<string, string> = {
  "/skill-tree": "/progress/topics",
  "/quests": "/",
  "/achievements": "/progress/achievements",
  // v1.3: the Beginner Path moved from a Practice tab to Learn.
  "/practice/path": "/learn",
};

/** Lessons moved with it: /practice/path/:step → /learn/path/:step. */
export const lessonPath = (stepId: string) => `/learn/path/${stepId}`;
export const LEGACY_LESSON_PREFIX = "/practice/path/";
export function legacyLessonRedirect(pathname: string): string | null {
  if (!pathname.startsWith(LEGACY_LESSON_PREFIX)) return null;
  const step = pathname.slice(LEGACY_LESSON_PREFIX.length).replace(/\/+$/, "");
  return step ? lessonPath(step) : "/learn";
}

/** Learn, filtered to one topic's videos (Topic Detail, sheet sections, Ctrl+K). */
export const learnTopicPath = (topicId: string) => `/learn?topic=${encodeURIComponent(topicId)}`;
/** One library video, in the big player. */
export const watchPath = (videoId: string) => `/learn/watch/${videoId}`;

export function isNavItemActive(item: Pick<NavItem, "to" | "alsoActiveOn">, pathname: string) {
  if (item.to === "/") return pathname === "/";
  return [item.to, ...(item.alsoActiveOn ?? [])].some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** The nav item a path belongs to (for the subtitle under the screen title). */
export function navItemFor(pathname: string): NavItem | undefined {
  return ALL_NAV.find((n) => isNavItemActive(n, pathname));
}

/** The one-line description for the current mode. */
export function describe(item: Pick<NavItem, "description" | "beginnerDescription">, beginner: boolean): string {
  return (beginner && item.beginnerDescription) || item.description;
}
