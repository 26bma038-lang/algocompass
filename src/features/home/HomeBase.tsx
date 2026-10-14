import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check, Flame } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useHomeData, useTopicReport } from "@/data/queries";
import { useStreak } from "@/components/shell/useStreak";
import type { CfUser } from "@/data/types";
import { bandForRating } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContestStrip } from "./ContestStrip";
import { RatingChart } from "./RatingChart";
import { StandingCard } from "./StandingCard";

const plain = (n: number) => String(Math.round(n));

function TodayCard({ focus }: { focus: { topicId: string; name: string; reason: string } | undefined }) {
  const streak = useStreak();
  const late = new Date().getHours() >= 20;
  const atRisk = !!streak && !streak.activeToday && streak.current > 0 && late;
  const lit = !!streak && streak.activeToday;

  return (
    <section aria-labelledby="today-title" className="glass-card col-span-12 flex flex-col gap-5 p-6 lg:col-span-4">
      <div className="flex items-center gap-4">
        <span
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-md",
            lit ? "bg-[color-mix(in_oklab,var(--ember)_16%,transparent)]" : "bg-abyss-sunken",
            atRisk && "animate-[ember-breathe_2s_ease-in-out_infinite]",
          )}
        >
          <Flame
            aria-hidden
            className={cn("size-7", lit || atRisk ? "text-ember" : "text-ink-faint")}
            fill={lit ? "url(#ember-gradient)" : "none"}
            strokeWidth={1.7}
          />
        </span>
        <div>
          <h2 id="today-title" className="font-display text-display leading-none font-semibold text-ink">
            {streak ? <NumberTicker value={streak.current} format={plain} /> : "–"}
            <span className="ml-2 font-sans text-body font-medium text-ink-muted">day streak</span>
          </h2>
          <p className="mt-1.5 flex items-center gap-1.5 text-body-sm">
            {!streak ? (
              <span className="text-ink-muted">Waiting for the first sync</span>
            ) : streak.activeToday ? (
              <>
                <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
                <span className="text-ink">Practiced today</span>
                <span className="text-ink-muted">({streak.todayCount} today)</span>
              </>
            ) : atRisk ? (
              <span className="text-warning">Nothing solved yet today. Your streak ends at midnight.</span>
            ) : (
              <span className="text-ink-muted">Nothing solved yet today</span>
            )}
          </p>
        </div>
      </div>
      {streak && <p className="text-body-sm text-ink-muted">Longest streak: {streak.longest} days</p>}
      {focus && (
        <Link
          to={`/topics/${focus.topicId}`}
          className="mt-auto flex flex-col gap-0.5 rounded-md border border-glass-border bg-abyss-sunken px-4 py-3 transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
        >
          <span className="text-label text-ink-muted">Suggested focus</span>
          <span className="text-title font-semibold text-ink">{focus.name}</span>
          <span className="text-body-sm text-ink-muted">{focus.reason}</span>
        </Link>
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

function CfCard({ cf, solved, contests }: { cf: CfUser | null; solved: number; contests: number }) {
  const band = cf?.rating != null ? bandForRating(cf.rating) : null;
  return (
    <section aria-labelledby="cf-title" className="glass-card col-span-12 flex flex-col gap-4 p-6 sm:col-span-6 lg:col-span-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="cf-title" className="flex items-center gap-2 text-title font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-platform-cf" />
          Codeforces
        </h2>
        <span className="truncate text-body-sm text-ink-muted">{cf?.handle ?? "…"}</span>
      </div>
      <div>
        <p className="font-display text-hero leading-none font-semibold text-ink">
          {cf?.rating != null ? <NumberTicker value={cf.rating} format={plain} /> : "–"}
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
      <dl className="mt-auto grid grid-cols-3 gap-3 border-t border-glass-border pt-4">
        <Stat label="Solved" value={<NumberTicker value={solved} />} />
        <Stat label="Contests" value={<NumberTicker value={contests} />} />
        <Stat label="Max rating" value={cf?.maxRating ?? "–"} />
      </dl>
    </section>
  );
}

type LcStatsRow = NonNullable<ReturnType<typeof useHomeData>["data"]>["lcStats"];

function LcCard({ lc, handle }: { lc: LcStatsRow; handle: string | undefined }) {
  const parts = lc
    ? [
        { label: "Easy", n: lc.easy, of: lc.total_easy, bg: "color-mix(in oklab, var(--platform-lc) 45%, var(--abyss-sunken))" },
        { label: "Medium", n: lc.medium, of: lc.total_medium, bg: "color-mix(in oklab, var(--platform-lc) 72%, var(--abyss-sunken))" },
        { label: "Hard", n: lc.hard, of: lc.total_hard, bg: "var(--platform-lc)" },
      ]
    : [];
  const total = lc?.all_solved ?? 0;
  return (
    <section aria-labelledby="lc-title" className="glass-card col-span-12 flex flex-col gap-4 p-6 sm:col-span-6 lg:col-span-4">
      <div className="flex items-center justify-between gap-3">
        <h2 id="lc-title" className="flex items-center gap-2 text-title font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
          LeetCode
        </h2>
        <span className="truncate text-body-sm text-ink-muted">{handle ?? "…"}</span>
      </div>
      <div>
        <p className="font-display text-hero leading-none font-semibold text-ink">
          {lc ? <NumberTicker value={total} format={plain} /> : "–"}
        </p>
        <p className="mt-2 text-body-sm text-ink-muted">
          {lc ? (lc.contest_rating ? `solved · contest rating ${Math.round(lc.contest_rating)}` : "problems solved") : "Not synced yet"}
        </p>
      </div>
      {lc && total > 0 && (
        <div className="mt-auto flex flex-col gap-3 border-t border-glass-border pt-4">
          <div className="flex h-2 gap-[2px] overflow-hidden rounded-full" role="img" aria-label={parts.map((p) => `${p.label} ${p.n}`).join(", ")}>
            {parts.map((p) => (p.n > 0 ? <span key={p.label} style={{ flexGrow: p.n, background: p.bg }} /> : null))}
          </div>
          <dl className="grid grid-cols-3 gap-3">
            {parts.map((p) => (
              <div key={p.label} className="flex flex-col gap-0.5">
                <dt className="flex items-center gap-1.5 text-label text-ink-muted">
                  <span aria-hidden className="size-1.5 rounded-full" style={{ background: p.bg }} />
                  {p.label}
                </dt>
                <dd className="numeric text-title font-semibold text-ink">{p.n}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}

/**
 * Home Base: answers "am I on track today?" first (Today), then where each platform
 * stands, how the rating is moving, what to work on, and what's coming up.
 */
export function HomeBase() {
  const { data, isLoading } = useHomeData();
  const report = useTopicReport();
  const focus = report.data?.standing.weaknesses[0] ?? report.data?.standing.blindSpots[0];
  const lcHandle = data?.lcStats?.username;

  if (isLoading) {
    return <p className="text-body-sm text-ink-muted">Loading your cached stats…</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-12 gap-4">
        <TodayCard focus={focus} />
        <CfCard cf={data?.cf ?? null} solved={data?.cfSolved ?? 0} contests={data?.ratingHistory.length ?? 0} />
        <LcCard lc={data?.lcStats ?? null} handle={lcHandle} />
      </div>
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
          <RatingChart cf={data?.ratingHistory ?? []} lc={data?.lcContests ?? []} />
          <ActivityHeatmap activity={data?.activity ?? []} />
        </div>
        <div className="col-span-12 lg:col-span-4">
          <StandingCard report={report.data} />
        </div>
      </div>
      <ContestStrip contests={data?.upcoming ?? []} />
    </div>
  );
}
