import { Link, useMatches, type Params } from "react-router-dom";
import { Flame, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { AscentBar } from "./AscentBar";

export interface RouteHandle {
  title: string | ((params: Params) => string);
}

export function useScreenTitle() {
  const matches = useMatches();
  for (let i = matches.length - 1; i >= 0; i--) {
    const match = matches[i];
    const handle = match?.handle as RouteHandle | undefined;
    if (handle?.title) return typeof handle.title === "function" ? handle.title(match!.params) : handle.title;
  }
  return "AlgoCompass";
}

const chipLink =
  "flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover";

/** Streak flame → Quests. Shows no number until the streak engine has real data. */
function StreakFlame({ days }: { days: number | null }) {
  const hasData = days !== null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/quests"
          aria-label={hasData ? `Streak: ${days} days. Open quests` : "Streak: no practice data yet. Open quests"}
          className={chipLink}
        >
          <Flame
            aria-hidden
            className={hasData ? "size-[18px] text-ember" : "size-[18px] text-ink-faint"}
            fill={hasData ? "url(#ember-gradient)" : "none"}
            strokeWidth={1.8}
          />
          <span className="numeric text-body font-semibold text-ink-muted">{hasData ? days : "–"}</span>
          <svg width="0" height="0" className="absolute" aria-hidden>
            <defs>
              <linearGradient id="ember-gradient" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="var(--ember)" />
                <stop offset="100%" stopColor="var(--ember-core)" />
              </linearGradient>
            </defs>
          </svg>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{hasData ? `${days}-day streak` : "No streak yet"}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Level badge → Achievements. The one chamfered shape in the system (DESIGN.md Shapes).
 * The clip-path lives on an inner plate so the link's focus ring isn't clipped.
 * Unlit (glass) until a real level exists: the Earned Light Rule.
 */
function LevelBadge({ level, xpProgress }: { level: number | null; xpProgress: number }) {
  const hasData = level !== null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/achievements"
          aria-label={hasData ? `Level ${level}. Open achievements` : "Level: none yet. Open achievements"}
          className="group rounded-xs"
        >
          <span
            className={cn(
              "relative flex h-8 items-center gap-1.5 px-3 transition-colors duration-[var(--dur-fast)]",
              "[clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
              hasData ? "bg-accent-soft text-ink" : "bg-glass text-ink-muted group-hover:bg-glass-hover",
            )}
          >
            <span className="text-label">Lv</span>
            <span className="numeric font-display text-title leading-none font-semibold">{hasData ? level : "–"}</span>
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
              style={{ transform: `scaleX(${xpProgress})` }}
            />
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">
        {hasData ? `Level ${level}, ${Math.round(xpProgress * 100)}% to next` : "Complete quests to earn levels"}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Sync control. Platform adapters aren't wired yet, so it is visibly unavailable but still
 * focusable and explained (aria-disabled instead of disabled keeps the tooltip reachable).
 */
function SyncButton() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-disabled="true"
          onClick={(e) => e.preventDefault()}
          className="flex h-8 cursor-not-allowed items-center gap-1.5 rounded-full px-2.5 text-label text-ink-muted"
        >
          <RefreshCw aria-hidden className="size-3.5" strokeWidth={1.8} />
          <span>Not synced</span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Syncing with Codeforces and LeetCode isn't built yet</TooltipContent>
    </Tooltip>
  );
}

export function TopBar() {
  const title = useScreenTitle();
  return (
    <div className="relative shrink-0">
      <div className="flex h-[var(--topbar-h)] items-center justify-between gap-4 px-6">
        <h1 className="truncate font-display text-headline font-semibold tracking-[-0.005em] text-ink">{title}</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <SyncButton />
          <StreakFlame days={null} />
          <LevelBadge level={null} xpProgress={0} />
        </div>
      </div>
      <AscentBar rating={null} />
      {/* Announce screen changes for screen readers (focus stays in the nav). */}
      <p className="sr-only" aria-live="polite">
        {title}
      </p>
    </div>
  );
}
