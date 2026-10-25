import { Link, useLocation, useMatches, type Params, useNavigate } from "react-router-dom";
import { LABELS, updatedAgo } from "@/lib/glossary";
import { hasAnyHandle, useHandles } from "@/data/settings";
import { useEffect, useState } from "react";
import { AlertTriangle, Check, CloudOff, Flame, GraduationCap, RefreshCw, ScrollText, Search } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useProgression } from "@/data/progression";
import { useTodayQuests } from "@/data/quests";
import { useUiStore } from "@/data/uiStore";
import { XP_KIND_LABEL, type XpSummary } from "@/engine/xp";
import { syncStatus, useSyncStore } from "@/data/syncStore";
import { cn } from "@/lib/utils";
import { AscentBar } from "./AscentBar";
import { describe, lessonPath, navItemFor } from "./nav";
import { goalsLabel, levelLabel, stepLabel, streakLabel, topBarItems } from "./topBarItems";
import { usePath } from "@/data/path";
import { TERMS } from "@/lib/glossary";
import { usePrefs } from "@/data/prefs";
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

const plain = (n: number) => String(Math.round(n));

const chipLink =
  "flex h-8 items-center gap-1.5 rounded-full px-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover";

/** Streak flame → Today. Same flame rule as the Today card (useStreak.flameState). */
function StreakFlame({ streak }: { streak: Streak | null }) {
  const state = flameState(streak);
  const days = streak?.current ?? null;
  const hasData = days !== null;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/"
          aria-label={hasData ? `Streak: ${days} ${days === 1 ? "day" : "days"}. Open Today` : "Streak: no practice data yet. Open Today"}
          className={chipLink}
        >
          <Flame
            aria-hidden
            className={cn("size-[18px]", state === "none" ? "text-ink-faint" : "text-ember")}
            fill={state === "lit" ? "url(#ember-gradient)" : "none"}
            strokeWidth={1.8}
          />
          <span className="numeric text-body-sm font-semibold text-ink-muted">{streakLabel(streak)}</span>
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
      <TooltipContent side="bottom" className="max-w-[280px]">
        {!hasData
          ? `${TERMS.streak.hint} It starts after your first update.`
          : state === "lit"
            ? `${days}-day streak, practised today`
            : state === "pending"
              ? `${days}-day streak. Solve one problem today to keep it`
              : TERMS.streak.hint}
      </TooltipContent>
    </Tooltip>
  );
}

/** Opens the Ctrl+K command palette. */
function PaletteButton({ labelled }: { labelled: boolean }) {
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Search"
          aria-keyshortcuts="Control+K"
          onClick={() => setOpen(true)}
          className={cn(
            "flex h-8 items-center gap-1.5 rounded-full text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink",
            labelled ? "px-2.5" : "w-8 justify-center",
          )}
        >
          <Search aria-hidden className="size-4" strokeWidth={1.8} />
          {labelled && <span className="text-body-sm">Search</span>}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="flex items-center gap-2">
        Search screens, topics and lessons
        <kbd className="numeric font-sans rounded-xs border border-glass-border-strong px-1 text-ink-muted">Ctrl K</kbd>
      </TooltipContent>
    </Tooltip>
  );
}

/** Today's quest progress ("2/3") → Today. Sits right before the streak flame. */
function QuestChip() {
  const { data } = useTodayQuests();
  if (!data) return null;
  const all = data.done === data.total;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to="/" aria-label={`${LABELS.goals}: ${data.done} of ${data.total} done. Open Today`} className={chipLink}>
          {all ? (
            <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
          ) : (
            <ScrollText aria-hidden className="size-4 text-ink-muted" strokeWidth={1.8} />
          )}
          <span className="numeric text-body-sm font-semibold text-ink-muted">{goalsLabel(data.done, data.total)}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{all ? "All of today's goals done" : `${data.done} of ${data.total} of today's goals done`}</TooltipContent>
    </Tooltip>
  );
}

/**
 * Level badge → Progress. The one chamfered shape in the system (DESIGN.md Shapes).
 * The clip-path lives on an inner plate so the link's focus ring isn't clipped.
 * Unlit (glass) until a real level exists: the Earned Light Rule.
 */
function LevelBadge({ xp }: { xp: XpSummary | undefined }) {
  const level = xp?.level ?? null;
  const hasData = level !== null;
  // The level-up moment: one Aura pulse on the plate while the title is revealed (LevelUpMoment).
  const levelUp = useUiStore((s) => s.ceremony?.kind === "level");
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/progress"
          aria-label={hasData ? `Level ${level}, ${xp!.title}. Open Progress` : "Level: none yet. Open Progress"}
          className="group rounded-xs"
        >
          <span
            className={cn(
              "relative flex h-8 items-center gap-1.5 px-3 transition-colors duration-[var(--dur-fast)]",
              "[clip-path:polygon(7px_0,100%_0,100%_calc(100%-7px),calc(100%-7px)_100%,0_100%,0_7px)]",
              hasData ? "bg-accent-soft text-ink" : "bg-glass text-ink-muted group-hover:bg-glass-hover",
              levelUp && "level-flash",
            )}
          >
            {hasData ? (
              <>
                <span className="text-label">Level</span>
                <span className="numeric font-display text-title leading-none font-semibold">
                  <NumberTicker id="level-badge" value={level} format={plain} />
                </span>
              </>
            ) : (
              <span className="text-label">{levelLabel(null)}</span>
            )}
            <span
              aria-hidden
              className="absolute inset-x-0 bottom-0 h-[2px] origin-left bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
              style={{ transform: `scaleX(${xp?.progress ?? 0})` }}
            />
          </span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom" align="end" className="w-[240px] p-3">
        {!hasData ? (
          TERMS.level.hint
        ) : (
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink-muted">{TERMS.xp.hint}</span>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-body-sm font-semibold text-ink">
                Level {level} · {xp!.title}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span aria-hidden className="relative block h-1 overflow-hidden rounded-full bg-glass-border-strong">
                <span className="absolute inset-0 origin-left rounded-full bg-accent" style={{ transform: `scaleX(${xp!.progress})` }} />
              </span>
              <span className="numeric text-label text-ink-muted">
                {xp!.intoLevel.toLocaleString()} of {xp!.toNext.toLocaleString()} XP to level {level! + 1}
              </span>
            </div>
            <div className="flex flex-col gap-0.5 border-t border-glass-border pt-2">
              <span className="flex justify-between text-label text-ink-muted">
                Today
                <span className="numeric font-semibold text-ink">+{xp!.todayTotal} XP</span>
              </span>
              {xp!.today.length === 0 ? (
                <span className="text-label text-ink-faint">Nothing yet. A solve or a goal earns XP.</span>
              ) : (
                xp!.today.map((t) => (
                  <span key={t.kind} className="flex justify-between text-label text-ink-muted">
                    {XP_KIND_LABEL[t.kind]}
                    <span className="numeric text-ink">+{t.xp}</span>
                  </span>
                ))
              )}
            </div>
          </div>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/** Beginner mode: where you are on the path, one click from the lesson. */
function StepChip() {
  const view = usePath().data;
  if (!view) return null;
  const total = view.steps.length;
  const cur = view.current !== null ? view.steps[view.current]! : null;
  const label = stepLabel(view.current, total);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link to={cur ? lessonPath(cur.step.id) : "/learn#path"} aria-label={cur ? `${label}: ${cur.step.title}. Open the lesson` : label} className={chipLink}>
          <GraduationCap aria-hidden className="size-4 text-ink-muted" strokeWidth={1.8} />
          <span className="numeric text-body-sm font-semibold text-ink">{label}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">{cur ? `Your place on the Beginner Path: ${cur.step.title}. Click to continue.` : "You finished the Beginner Path."}</TooltipContent>
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
  const handles = useHandles();
  const navigate = useNavigate();
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
    syncing: LABELS.updating,
    idle: LABELS.notUpdated,
    offline: "Offline, will retry",
    partial: "Update incomplete",
    ok: lastFinishedAt === null ? LABELS.updated : updatedAgo(relativeTime(lastFinishedAt, nowMs)),
  }[status];
  const tip = {
    syncing: "Fetching Codeforces and LeetCode",
    idle: LABELS.updateNow,
    offline: `Couldn't reach ${names(offline)}. Showing saved data. Retrying when you're back online, or click to retry now`,
    partial: `${names(failed)} failed. Click to retry`,
    ok: `${LABELS.updateNow}: fetch your latest solves`,
  }[status];

  // Beginner mode with no handles: nothing to sync, so point at where to add one instead.
  if (handles.data && !hasAnyHandle(handles.data)) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => navigate("/settings")}
            className="flex h-8 items-center gap-1.5 rounded-full px-2.5 text-label text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
          >
            <RefreshCw aria-hidden className="size-3.5" strokeWidth={1.8} />
            <span>Connect an account</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-[280px]">
          Add a LeetCode or Codeforces username in Settings and the problems you solve tick themselves
        </TooltipContent>
      </Tooltip>
    );
  }

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
            {{ syncing: LABELS.updating, idle: "", offline: "Offline. Showing saved data, will retry", partial: "Update incomplete", ok: "Update complete" }[status]}
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
  const beginner = usePrefs().data?.mode === "beginner";
  const navItem = navItemFor(useLocation().pathname);
  const subtitle = navItem && describe(navItem, beginner);
  const rating = useRankAccent();
  const streak = useStreak();
  const xp = useProgression().data?.xp;
  const stepsDone = usePath().data?.doneCount ?? 0;
  const items = topBarItems({ mode: beginner ? "beginner" : "smart", stepsDone, hasStreak: streak !== null, hasLevel: xp?.level != null });
  return (
    <div className="relative shrink-0">
      <div className="flex h-[var(--topbar-h)] items-center justify-between gap-4 px-6">
        <div className="flex min-w-0 flex-col">
          <h1 className="truncate font-display text-headline leading-tight font-semibold tracking-[-0.005em] text-ink">{title}</h1>
          {subtitle && <p className="truncate text-body-sm text-ink-muted">{subtitle}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {items.map((item) =>
            item === "search" ? (
              <PaletteButton key={item} labelled={beginner} />
            ) : item === "step" ? (
              <StepChip key={item} />
            ) : item === "update" ? (
              <SyncButton key={item} />
            ) : item === "goals" ? (
              <QuestChip key={item} />
            ) : item === "streak" ? (
              <StreakFlame key={item} streak={streak} />
            ) : (
              <LevelBadge key={item} xp={xp} />
            ),
          )}
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
