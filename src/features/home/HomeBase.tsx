import type { ReactNode } from "react";
import { ArrowRight, Check, Flame } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { flameState, streakAtRisk, useStreak } from "@/components/shell/useStreak";
import { useHomeData, useTopicReport } from "@/data/queries";
import { useUiStore } from "@/data/uiStore";
import type { CfRatingChange, CfUser, Contest } from "@/data/types";
import type { StandingItem } from "@/engine/standing";
import { bandForRating } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContestStrip, countdown, openContest, shortName, when } from "./ContestStrip";
import { RatingChart } from "./RatingChart";
import { StandingCard } from "./StandingCard";
import { useNow } from "./useNow";

const plain = (n: number) => String(Math.round(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/**
 * Lead card: the 2-second answer. Did I practice today, is the streak at risk,
 * what's the one thing to do, and when is the next Codeforces round.
 */
function TodayCard({ focus, nextCf }: { focus: StandingItem | undefined; nextCf: Contest | undefined }) {
  const streak = useStreak();
  const state = flameState(streak);
  const atRisk = streakAtRisk(streak);
  const nowMs = useNow();
  const openTopic = useUiStore((s) => s.openTopic);

  return (
    <section aria-labelledby="today-title" className="glass-card grid grid-cols-1 gap-6 p-6 md:grid-cols-[1fr_auto]">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          <span
            className={cn(
              "grid size-14 shrink-0 place-items-center rounded-md",
              state === "lit" ? "bg-[color-mix(in_oklab,var(--ember)_16%,transparent)]" : "bg-abyss-sunken",
              atRisk && "animate-[ember-breathe_2s_ease-in-out_infinite]",
            )}
          >
            <Flame
              aria-hidden
              className={cn("size-7", state === "none" ? "text-ink-faint" : "text-ember")}
              fill={state === "lit" ? "url(#ember-gradient)" : "none"}
              strokeWidth={1.7}
            />
          </span>
          <div className="min-w-0">
            <h2 id="today-title" className="flex items-baseline gap-2 text-ink">
              <span className="numeric font-display text-display leading-none font-semibold">
                {streak ? <NumberTicker id="streak" value={streak.current} format={plain} /> : "–"}
              </span>
              <span className="text-body font-medium text-ink-muted">day streak</span>
            </h2>
            <p className="mt-2 flex flex-wrap items-center gap-x-1.5 text-body">
              {!streak ? (
                <span className="text-ink-muted">Waiting for the first sync</span>
              ) : state === "lit" ? (
                <>
                  <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
                  <span>Practiced today</span>
                  <span className="text-ink-muted">· {plural(streak.todayCount, "solve")} so far</span>
                </>
              ) : state === "pending" ? (
                <span className={atRisk ? "text-warning" : "text-ink"}>
                  Solve one problem today to keep your {streak.current}-day streak
                  {atRisk ? ". It ends at midnight." : "."}
                </span>
              ) : (
                <span className="text-ink">Solve one problem today to start a streak.</span>
              )}
            </p>
          </div>
        </div>
        {focus && (
          <button
            type="button"
            onClick={() => openTopic(focus.topicId)}
            className="group flex items-center justify-between gap-4 rounded-md border text-left border-glass-border bg-abyss-sunken px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
          >
            <span className="flex min-w-0 flex-col gap-0.5">
              <span className="text-title font-semibold text-ink">Practice {focus.name.toLowerCase()}</span>
              <span className="text-body-sm text-ink-muted">{focus.reason}</span>
            </span>
            <ArrowRight aria-hidden className="size-4 shrink-0 text-ink-muted transition-transform duration-[var(--dur-fast)] group-hover:translate-x-0.5" />
          </button>
        )}
        {streak && <p className="text-body-sm text-ink-muted">Longest streak: {plural(streak.longest, "day")}</p>}
      </div>

      {nextCf && (
        <button
          type="button"
          onClick={() => openContest(nextCf.url)}
          className="flex flex-col items-start gap-1.5 self-start rounded-md border border-glass-border bg-abyss-sunken p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong md:w-[230px]"
        >
          <span className="flex items-center gap-1.5 text-label text-ink-muted">
            <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
            Next Codeforces round
          </span>
          <span className="numeric font-display text-headline font-semibold text-ink">{countdown(nextCf.startTime, nowMs)}</span>
          <span className="text-body-sm text-ink">{shortName(nextCf)}</span>
          <span className="text-label text-ink-muted">
            {when(nextCf.startTime)}
            <span className="sr-only"> (opens in browser)</span>
          </span>
        </button>
      )}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="numeric text-title font-semibold text-ink">{value}</dd>
    </div>
  );
}

/** The one hero number on Home Base (DESIGN.md): your Codeforces rating. */
function CfCard({ cf, solved, history }: { cf: CfUser | null; solved: number; history: readonly CfRatingChange[] }) {
  const band = cf?.rating != null ? bandForRating(cf.rating) : null;
  const last = history[history.length - 1];
  const lastDelta = last ? last.newRating - last.oldRating : null;
  return (
    <section aria-labelledby="cf-title" className="glass-card flex flex-col gap-4 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cf-title" className="flex items-center gap-2 text-title font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-platform-cf" />
          Codeforces
        </h2>
        <span className="truncate text-body-sm text-ink-muted">{cf?.handle ?? "…"}</span>
      </div>
      <div>
        <p className="numeric font-display text-hero leading-none font-semibold text-ink">
          {cf?.rating != null ? <NumberTicker id="cf-rating" value={cf.rating} format={plain} /> : "–"}
        </p>
        <p className="mt-2 text-body-sm">
          {band ? (
            <>
              <span className="font-semibold" style={{ color: `var(--${band.current.token})` }}>
                {band.current.label}
              </span>
              {band.next && (
                <span className="text-ink-muted">
                  {" "}
                  · {band.next.min - (cf?.rating ?? 0)} to {band.next.label}
                </span>
              )}
            </>
          ) : (
            <span className="text-ink-muted">{cf ? "Unrated" : "Not synced yet"}</span>
          )}
        </p>
      </div>
      <dl className="grid grid-cols-3 gap-3 border-t border-glass-border pt-4">
        <Stat label="Solved" value={<NumberTicker id="cf-solved" value={solved} />} />
        <Stat label="Contests" value={history.length} />
        <Stat
          label={cf?.maxRating != null && cf.maxRating !== cf.rating ? "Max rating" : "Last change"}
          value={
            cf?.maxRating != null && cf.maxRating !== cf.rating
              ? cf.maxRating
              : lastDelta === null
                ? "–"
                : `${lastDelta >= 0 ? "+" : ""}${lastDelta}`
          }
        />
      </dl>
    </section>
  );
}

type LcStatsRow = NonNullable<ReturnType<typeof useHomeData>["data"]>["lcStats"];

/** LeetCode is the classroom: a compact secondary card. */
function LcCard({ lc }: { lc: LcStatsRow }) {
  const parts = lc
    ? [
        { label: "Easy", n: lc.easy },
        { label: "Medium", n: lc.medium },
        { label: "Hard", n: lc.hard },
      ]
    : [];
  return (
    <section aria-labelledby="lc-title" className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="lc-title" className="flex items-center gap-2 text-title font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
          LeetCode
        </h2>
        <span className="truncate text-body-sm text-ink-muted">{lc?.username ?? "…"}</span>
      </div>
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="numeric font-display text-display leading-none font-semibold text-ink">
            {lc ? <NumberTicker id="lc-solved" value={lc.all_solved} format={plain} /> : "–"}
          </span>
          <span className="text-body-sm text-ink-muted">{lc ? "solved" : "Not synced yet"}</span>
        </p>
        {lc && (
          <dl className="flex gap-4">
            {parts.map((p) => (
              <div key={p.label} className="flex flex-col items-end">
                <dt className="text-label text-ink-muted">{p.label}</dt>
                <dd className="numeric text-title font-semibold text-ink">{p.n}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
      {lc && (
        <p className="text-body-sm text-ink-muted">
          {lc.contest_rating ? `Contest rating ${Math.round(lc.contest_rating)}` : "No LeetCode contests yet"}
        </p>
      )}
    </section>
  );
}

/**
 * Home Base: Today leads (streak, the one next action, tonight's CF round), then your
 * rating and how it moves, activity, where you stand, and the rest of the contest calendar.
 */
export function HomeBase() {
  const { data, isLoading } = useHomeData();
  const report = useTopicReport();
  const focus = report.data?.standing.weaknesses[0] ?? report.data?.standing.blindSpots[0];
  const upcoming = data?.upcoming ?? [];
  const nextCf = upcoming.find((c) => c.platform === "cf");

  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading your cached stats…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
          <TodayCard focus={focus} nextCf={nextCf} />
          <RatingChart cf={data?.ratingHistory ?? []} lc={data?.lcContests ?? []} rating={data?.cf?.rating ?? null} />
          <ActivityHeatmap activity={data?.activity ?? []} />
        </div>
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <CfCard cf={data?.cf ?? null} solved={data?.cfSolved ?? 0} history={data?.ratingHistory ?? []} />
          <LcCard lc={data?.lcStats ?? null} />
          <StandingCard report={report.data} />
        </div>
      </div>
      <ContestStrip contests={upcoming.filter((c) => c !== nextCf)} />
    </div>
  );
}
