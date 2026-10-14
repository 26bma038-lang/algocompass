import { Link, useMatches, type Params } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, CloudOff, Flame, RefreshCw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { syncStatus, useSyncStore } from "@/data/syncStore";
import { cn } from "@/lib/utils";
import { AscentBar } from "./AscentBar";
import { useRankAccent } from "./useRankAccent";
import { flameState, useStreak } from "./useStreak";
import type { Streak } from "@/engine/activity";

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

/** Streak flame → Quests. Same flame rule as Home Base (useStreak.flameState). */
function StreakFlame({ streak }: { streak: Streak | null }) {
  const state = flameState(streak);
  const days = streak?.current ?? null;
  const hasData = days !== null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/quests"
          aria-label={hasData ? `Streak: ${days} ${days === 1 ? "day" : "days"}. Open quests` : "Streak: no practice data yet. Open quests"}
          className={chipLink}
        >
          <Flame
            aria-hidden
            className={cn("size-[18px]", state === "none" ? "text-ink-faint" : "text-ember")}
            fill={state === "lit" ? "url(#ember-gradient)" : "none"}
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
      <TooltipContent side="bottom">
        {!hasData ? "No streak yet" : state === "lit" ? `${days}-day streak, practiced today` : state === "pending" ? `${days}-day streak. Solve one problem today to keep it` : "No active streak"}
      </TooltipContent>
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

function relativeTime(epochSeconds: number, nowMs: number): string {
  const mins = Math.floor((nowMs / 1000 - epochSeconds) / 60);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
}

const PLATFORM = { cf: "Codeforces", lc: "LeetCode" } as const;

/** Manual sync control + status: syncing / synced Xm ago / offline, will retry / incomplete. */
function SyncButton() {
  const { syncing, lastResult, lastFinishedAt, run } = useSyncStore();
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const status = syncStatus(syncing, lastResult);
  const platforms = lastResult ? [lastResult.cf, lastResult.lc] : [];
  const names = (ps: typeof platforms) => ps.map((p) => PLATFORM[p.platform]).join(" and ");
  const failed = platforms.filter((p) => !p.ok && !p.offline);
  const offline = platforms.filter((p) => p.offline);

  const label = {
    syncing: "Syncing…",
    idle: "Not synced",
    offline: "Offline, will retry",
    partial: "Sync incomplete",
    ok: lastFinishedAt === null ? "Synced" : `Synced ${relativeTime(lastFinishedAt, nowMs)}`,
  }[status];
  const tip = {
    syncing: "Fetching Codeforces and LeetCode",
    idle: "Sync now",
    offline: `Couldn't reach ${names(offline)}. Showing saved data. Retrying when you're back online, or click to retry now`,
    partial: `${names(failed)} failed. Click to retry`,
    ok: "Sync now",
  }[status];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-busy={syncing}
          aria-disabled={syncing || undefined}
          onClick={() => void run()}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full px-2.5 text-label transition-colors duration-[var(--dur-fast)]",
            syncing ? "cursor-progress text-ink-muted" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
          )}
        >
          {status === "partial" ? (
            <AlertTriangle aria-hidden className="size-3.5 text-warning" strokeWidth={1.8} />
          ) : status === "offline" ? (
            <CloudOff aria-hidden className="size-3.5" strokeWidth={1.8} />
          ) : (
            <RefreshCw aria-hidden className={cn("size-3.5", syncing && "animate-spin")} strokeWidth={1.8} />
          )}
          <span>{label}</span>
          <span className="sr-only" aria-live="polite">
            {{ syncing: "Syncing", idle: "", offline: "Offline. Showing saved data, will retry", partial: "Sync incomplete", ok: "Sync complete" }[status]}
          </span>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        {tip}
      </TooltipContent>
    </Tooltip>
  );
}

export function TopBar() {
  const title = useScreenTitle();
  const rating = useRankAccent();
  const streak = useStreak();
  return (
    <div className="relative shrink-0">
      <div className="flex h-[var(--topbar-h)] items-center justify-between gap-4 px-6">
        <h1 className="truncate font-display text-headline font-semibold tracking-[-0.005em] text-ink">{title}</h1>
        <div className="flex shrink-0 items-center gap-1.5">
          <SyncButton />
          <StreakFlame streak={streak} />
          <LevelBadge level={null} xpProgress={0} />
        </div>
      </div>
      <AscentBar rating={rating} />
      {/* Announce screen changes for screen readers (focus stays in the nav). */}
      <p className="sr-only" aria-live="polite">
        {title}
      </p>
    </div>
  );
}
