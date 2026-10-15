import {
  BookOpen,
  Brain,
  CalendarDays,
  Compass,
  Crown,
  Flame,
  Hash,
  Medal,
  Moon,
  Network,
  Repeat,
  ScrollText,
  Sparkles,
  Sunrise,
  Swords,
  Target,
  TrendingUp,
  Undo2,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type { AchievementIcon } from "@/engine/achievements";
import { cn } from "@/lib/utils";

const ICONS: Record<AchievementIcon, LucideIcon> = {
  flame: Flame,
  calendar: CalendarDays,
  scroll: ScrollText,
  crown: Crown,
  swords: Swords,
  trending: TrendingUp,
  medal: Medal,
  target: Target,
  repeat: Repeat,
  hash: Hash,
  book: BookOpen,
  brain: Brain,
  tree: Network,
  compass: Compass,
  moon: Moon,
  sunrise: Sunrise,
  zap: Zap,
  sparkles: Sparkles,
  undo: Undo2,
};

/**
 * An achievement's badge: the chamfered plate shape (DESIGN.md reserves it for level and rank, and
 * achievements are part of that family). Earned: accent-soft plate, accent icon. Locked: a sunken
 * silhouette with a Dusk icon, never lit (the Earned Light Rule).
 */
export function AchievementBadge({ icon, unlocked, size = "md" }: { icon: AchievementIcon; unlocked: boolean; size?: "sm" | "md" }) {
  const Icon = ICONS[icon];
  const sm = size === "sm";
  return (
    <span
      aria-hidden
      className={cn(
        "relative grid shrink-0 place-items-center",
        sm ? "size-7 [clip-path:polygon(5px_0,100%_0,100%_calc(100%-5px),calc(100%-5px)_100%,0_100%,0_5px)]" : "size-12 [clip-path:polygon(9px_0,100%_0,100%_calc(100%-9px),calc(100%-9px)_100%,0_100%,0_9px)]",
        unlocked ? "bg-accent-soft" : "bg-abyss-sunken",
      )}
    >
      <Icon className={cn(sm ? "size-4" : "size-[22px]", unlocked ? "text-accent" : "text-ink-faint opacity-60")} strokeWidth={unlocked ? 2 : 1.6} />
    </span>
  );
}
