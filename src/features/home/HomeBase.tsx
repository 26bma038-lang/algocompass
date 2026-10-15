import { lazy, Suspense, type ReactNode } from "react";
import { Check, Flame } from "lucide-react";
import { NumberTicker } from "@/components/ui/number-ticker";
import { flameState, streakAtRisk, useStreak } from "@/components/shell/useStreak";
import { Link } from "react-router-dom";
import { useHomeData, useTopicReport } from "@/data/queries";
import { useTodayQuests } from "@/data/quests";
import { useHandles } from "@/data/settings";
import { QuestBar, QuestRow } from "@/features/quests/QuestList";
import type { CfRatingChange, CfUser, Contest } from "@/data/types";
import { bandForRating } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContestStrip, countdown, openContest, shortName, when } from "./ContestStrip";
// Recharts is the heaviest thing on Home Base; it loads right after the first paint.
const RatingChart = lazy(() => import("./RatingChart").then((m) => ({ default: m.RatingChart })));
import { StandingCard } from "./StandingCard";
import { useNow } from "./useNow";
import { WorkOnNext } from "./WorkOnNext";

const plain = (n: number) => String(Math.round(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Today's quests as a checklist, beside the next contest: "am I on track?" in one look. */
function QuestsTile() {
  const { data } = useTodayQuests();
  if (!data) return null;
  return (
    <Link
      to="/quests"
      aria-label={`Today's quests: ${data.done} of ${data.total} done. Open quests`}
      className="flex flex-col gap-2.5 rounded-md border border-glass-border bg-abyss-sunken p-4 transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
    >
      <span className="flex items-center justify-between gap-2 text-label text-ink-muted">
        Today's quests
        <span className="numeric font-display text-title font-semibold text-ink">
          {data.done}/{data.total}
        </span>
      </span>
      <QuestBar value={data.total ? data.done / data.total : 0} />
      <ul className="flex flex-col gap-1.5">
        {data.quests.map((q) => (
          <QuestRow key={q.id} q={q} compact />
        ))}
      </ul>
    </Link>
  );
}

/**
 * Lead card: the 2-second answer. Did I practice today, is the streak at risk,
 * what's the one thing to do, and when is the next Codeforces round.
 */
function TodayCard() {
  const streak = useStreak();
  const state = flameState(streak);
  const atRisk = streakAtRisk(streak);

  return (
    <section aria-labelledby="today-title" className="glass-card flex flex-col gap-4 p-5">
      {/* One line: the streak and what it needs today. */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <span
          className={cn(
            "grid size-11 shrink-0 place-items-center rounded-md",
            state === "lit" ? "bg-[color-mix(in_oklab,var(--ember)_16%,transparent)]" : "bg-abyss-sunken",
            atRisk && "animate-[ember-breathe_2s_ease-in-out_infinite]",
          )}
        >
          <Flame
            aria-hidden
            className={cn("size-6", state === "none" ? "text-ink-faint" : "text-ember")}
            fill={state === "lit" ? "url(#ember-gradient)" : "none"}
            strokeWidth={1.7}
          />
        </span>
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <h2 id="today-title" className="flex items-baseline gap-2 text-ink">
            <span className="numeric font-display text-display leading-none font-semibold">
              {streak ? <NumberTicker id="streak" value={streak.current} format={plain} /> : "–"}
            </span>
            <span className="text-body font-medium text-ink-muted">day streak</span>
          </h2>
          <p className="flex flex-wrap items-center gap-x-1.5 text-body-sm">
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
        {streak && <p className="text-body-sm text-ink-muted">Longest streak: {plural(streak.longest, "day")}</p>}
      </div>
      {/* The two things to do today, side by side. */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_250px]">
        <WorkOnNext />
        <QuestsTile />
      </div>
    </section>
  );
}

/** The next Codeforces round, at the foot of the rating card: the round is where the rating moves. */
function NextRound({ c }: { c: Contest }) {
  const nowMs = useNow();
  return (
    <button
      type="button"
      onClick={() => openContest(c.url)}
      className="flex w-full flex-col items-start gap-1 rounded-md border border-glass-border bg-abyss-sunken p-3 text-left transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
    >
      <span className="flex w-full items-center justify-between gap-2 text-label text-ink-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
          Next round
        </span>
        <span className="numeric font-display text-title font-semibold text-ink">{countdown(c.startTime, nowMs)}</span>
      </span>
      <span className="line-clamp-1 text-body-sm text-ink">{shortName(c)}</span>
      <span className="text-label text-ink-muted">
        {when(c.startTime)}
        <span className="sr-only"> (opens in browser)</span>
      </span>
    </button>
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
function CfCard({ cf, solved, history, nextCf }: { cf: CfUser | null; solved: number; history: readonly CfRatingChange[]; nextCf: Contest | undefined }) {
  const band = cf?.rating != null ? bandForRating(cf.rating) : null;
  const last = history[history.length - 1];
  const lastDelta = last ? last.newRating - last.oldRating : null;
  return (
    <section aria-labelledby="cf-title" className="glass-card flex flex-col gap-4 p-5">
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
      {nextCf && <NextRound c={nextCf} />}
    </section>
  );
}

type LcStatsRow = NonNullable<ReturnType<typeof useHomeData>["data"]>["lcStats"];

/** LeetCode is the classroom: a compact secondary card. */
function LcCard({ lc }: { lc: LcStatsRow }) {
  const tracked = (useHandles().data?.leetcode ?? "") !== "";
  if (!lc && !tracked) {
    return (
      <section aria-labelledby="lc-title" className="glass-card flex flex-col gap-2 p-5">
        <h2 id="lc-title" className="flex items-center gap-2 text-title font-semibold">
          <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
          LeetCode
        </h2>
        <p className="text-body-sm text-ink-muted">
          Not tracked. LeetCode is where new topics are learned;{" "}
          <Link to="/settings" className="text-ink underline decoration-glass-border-strong underline-offset-4">
            add your username in Settings
          </Link>{" "}
          to count those solves too.
        </p>
      </section>
    );
  }
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
  const upcoming = data?.upcoming ?? [];
  const nextCf = upcoming.find((c) => c.platform === "cf");

  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading your cached stats…</p>;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-8">
          <TodayCard />
          <Suspense fallback={<section aria-busy className="glass-card h-[300px] p-5" />}>
            <RatingChart cf={data?.ratingHistory ?? []} lc={data?.lcContests ?? []} rating={data?.cf?.rating ?? null} />
          </Suspense>
          <ActivityHeatmap activity={data?.activity ?? []} />
        </div>
        <div className="col-span-12 flex flex-col gap-4 lg:col-span-4">
          <CfCard cf={data?.cf ?? null} solved={data?.cfSolved ?? 0} history={data?.ratingHistory ?? []} nextCf={nextCf} />
          <LcCard lc={data?.lcStats ?? null} />
          <StandingCard report={report.data} />
        </div>
      </div>
      <ContestStrip contests={upcoming.filter((c) => c !== nextCf)} />
    </div>
  );
}
