import type { ReactNode } from "react";
import { Check, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader, Pill } from "@/components/CardHeader";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { useMixOfTheDay } from "@/data/recommendations";
import { NumberTicker } from "@/components/ui/number-ticker";
import { flameState, streakAtRisk, useStreak } from "@/components/shell/useStreak";
import { useHomeData, useTopicReport } from "@/data/queries";
import { useTodayQuests } from "@/data/quests";
import { useHandles } from "@/data/settings";
import { usePrefs } from "@/data/prefs";
import { FollowedSheetCard } from "@/features/sheets/FollowedSheetCard";
import type { CfRatingChange, CfUser, Contest } from "@/data/types";
import type { QuestState } from "@/engine/quests";
import { QuestBar, useRewardPulse } from "@/features/quests/QuestList";
import { bandForRating, bandProgress } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { ContestStrip, countdown, openContest, shortName, when } from "./ContestStrip";
import { StandingCard } from "./StandingCard";
import { useNow } from "./useNow";
import { WorkOnNext } from "./WorkOnNext";

const plain = (n: number) => String(Math.round(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** Rating history as a light inline sparkline (no chart library on the first paint). */
function Sparkline({ history }: { history: readonly CfRatingChange[] }) {
  if (history.length < 2) {
    return <p className="text-body-sm text-ink-faint">Your rating line starts after two rated rounds.</p>;
  }
  const w = 320;
  const h = 96;
  const pad = 6;
  const values = history.map((x) => x.newRating);
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = Math.max(1, hi - lo);
  const pts = values.map((v, i) => [pad + (i / (values.length - 1)) * (w - pad * 2), pad + (1 - (v - lo) / span) * (h - pad * 2)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const first = pts[0]!;
  const last = pts[pts.length - 1]!;
  const area = `${line} L${last[0].toFixed(1)} ${h} L${first[0].toFixed(1)} ${h} Z`;
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Rating over ${history.length} rated rounds, from ${values[0]} to ${values[values.length - 1]}`}
      className="h-20 w-full"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--accent-2)" stopOpacity="0.32" />
          <stop offset="1" stopColor="var(--accent-2)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark-fill)" />
      <path d={line} fill="none" stroke="var(--accent-2)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
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

/**
 * The hero: your Codeforces rating, the one hero number. The rank colour lives only here (number,
 * rank label, progress to the next rank); the theme colours everything else.
 */
function HeroCard({ cf, solved, history, nextCf }: { cf: CfUser | null; solved: number; history: readonly CfRatingChange[]; nextCf: Contest | undefined }) {
  const nowMs = useNow();
  const rating = cf?.rating ?? null;
  const band = rating !== null ? bandForRating(rating) : null;
  const progress = rating !== null ? bandProgress(rating) : 0;
  const last = history[history.length - 1];
  const lastDelta = last ? last.newRating - last.oldRating : null;
  return (
    <section
      aria-labelledby="hero-title"
      className="glass-card grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_minmax(0,0.9fr)]"
    >
      <div className="flex min-w-0 flex-col gap-3">
        <h2 id="hero-title" className="flex items-baseline gap-2 text-title font-semibold text-ink">
          <span aria-hidden className="size-2 self-center rounded-full bg-platform-cf" />
          Codeforces
          <span className="truncate text-body-sm font-normal text-ink-muted">{cf?.handle ?? ""}</span>
        </h2>
        <p className="numeric font-display text-hero leading-none font-semibold text-rank">
          {rating !== null ? <NumberTicker id="cf-rating" value={rating} format={plain} /> : <span className="text-ink-faint">–</span>}
        </p>
        {band ? (
          <div className="flex flex-col gap-2">
            <p className="flex flex-wrap items-center gap-2 text-body-sm">
              <span className="rounded-full border border-[var(--rank-line)] px-2.5 py-0.5 text-label font-semibold text-rank">{band.current.label}</span>
              {band.next && (
                <span className="text-ink-muted">
                  {band.next.min - (rating ?? 0)} to {band.next.label}
                </span>
              )}
            </p>
            <span
              role="meter"
              aria-label={band.next ? `Progress to ${band.next.label}` : "Top rank reached"}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(progress * 100)}
              className="relative block h-1.5 overflow-hidden rounded-full bg-glass-border-strong"
            >
              <span
                className="absolute inset-0 origin-left rounded-full transition-transform duration-[var(--dur-slow)] ease-out-quint"
                style={{ transform: `scaleX(${progress})`, background: "linear-gradient(90deg, var(--rank), var(--rank-next))" }}
              />
            </span>
          </div>
        ) : (
          <p className="text-body-sm text-ink-muted">{cf ? "Unrated" : "Not synced yet"}</p>
        )}
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        <span className="text-label text-ink-muted">Rating, last {plural(history.length, "rated round")}</span>
        <Sparkline history={history} />
        <dl className="grid grid-cols-3 gap-3">
          <Stat label="Solved" value={<NumberTicker id="cf-solved" value={solved} />} />
          <Stat label="Contests" value={history.length} />
          <Stat label="Last change" value={lastDelta === null ? "–" : `${lastDelta >= 0 ? "+" : ""}${lastDelta}`} />
        </dl>
      </div>
      {nextCf ? (
        <button
          type="button"
          onClick={() => openContest(nextCf.url)}
          className="flex h-full flex-col items-start justify-center gap-1.5 rounded-md border border-glass-border bg-abyss-sunken p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
        >
          <span className="text-label text-ink-muted">Next round</span>
          <span className="numeric font-display text-headline font-semibold text-accent">{countdown(nextCf.startTime, nowMs)}</span>
          <span className="line-clamp-2 text-body-sm text-ink">{shortName(nextCf)}</span>
          <span className="text-label text-ink-muted">
            {when(nextCf.startTime)}
            <span className="sr-only"> (opens in browser)</span>
          </span>
        </button>
      ) : (
        <p className="text-body-sm text-ink-muted">No Codeforces round is scheduled yet.</p>
      )}
    </section>
  );
}

function TodayQuest({ q }: { q: QuestState }) {
  const pulse = useRewardPulse(q.id);
  return (
    <li className={cn("flex flex-col gap-2 rounded-md bg-abyss-sunken px-4 py-3", pulse && "aura-pulse")}>
      <span className="flex items-start gap-3">
        {q.done ? (
          <Check aria-hidden className="mt-0.5 size-4 shrink-0 text-success" strokeWidth={2.4} />
        ) : (
          <span
            aria-hidden
            className={cn("mt-1.5 size-2 shrink-0 rounded-full", q.kind === "cf_topic" ? "bg-platform-cf" : q.kind === "lc_topic" ? "bg-platform-lc" : "bg-accent-2")}
          />
        )}
        <span className={cn("min-w-0 flex-1 text-body-sm", q.done ? "text-ink-muted" : "text-ink")}>
          {q.title}
          <span className="sr-only">. {q.done ? "Done" : `${q.progress} of ${q.target}`}</span>
        </span>
        <span aria-hidden className="numeric font-display text-body-sm font-semibold text-ink-muted">
          {q.progress}/{q.target}
        </span>
      </span>
      <QuestBar value={q.progress / q.target} />
    </li>
  );
}

/** Today's quests and the streak. "Am I on track?" in one card. */
function TodayCard() {
  const streak = useStreak();
  const state = flameState(streak);
  const atRisk = streakAtRisk(streak);
  const { data } = useTodayQuests();
  return (
    <section aria-labelledby="today-title" className="glass-card flex h-full flex-col gap-4 p-6">
      {/* Inline header (not CardHeader): its 256px title minimum would push the pill under the title in 5 columns. */}
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-title" className="font-display text-headline font-semibold text-ink">
          Today's quests
        </h2>
        {data && (
          <Pill>
            {data.done}/{data.total} done
          </Pill>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-md",
            state === "lit" ? "bg-[color-mix(in_oklab,var(--ember)_16%,transparent)]" : "bg-abyss-sunken",
            atRisk && "animate-[ember-breathe_2s_ease-in-out_infinite]",
          )}
        >
          <Flame
            aria-hidden
            className={cn("size-5", state === "none" ? "text-ink-faint" : "text-ember")}
            fill={state === "lit" ? "url(#ember-gradient)" : "none"}
            strokeWidth={1.7}
          />
        </span>
        <p className="min-w-0 text-body-sm">
          <span className="numeric font-display text-title font-semibold text-ink">{streak ? streak.current : "–"}</span>
          <span className="text-ink-muted"> day streak, </span>
          {!streak ? (
            <span className="text-ink-muted">waiting for the first sync</span>
          ) : state === "lit" ? (
            <span className="text-ink">practiced today ({plural(streak.todayCount, "solve")})</span>
          ) : (
            <span className={atRisk ? "text-warning" : "text-ink"}>solve one problem to {streak.current > 0 ? "keep it" : "start one"}</span>
          )}
        </p>
      </div>
      {data ? (
        <ul className="flex flex-col gap-2">
          {data.quests.map((q) => (
            <TodayQuest key={q.id} q={q} />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">Today's quests appear after the first sync.</p>
      )}
    </section>
  );
}

/** Today's mix, compact: the problems to open right now. The full card (feedback, New mix) is in Practice. */
function TodayMixCard() {
  const mix = useMixOfTheDay();
  const items = (mix.data?.items ?? []).filter((i) => i.rec !== null);
  const done = items.filter((i) => i.done).length;
  return (
    <section aria-labelledby="mix-title" className="glass-card flex h-full flex-col gap-3 p-6">
      <CardHeader
        id="mix-title"
        title="Today's mix"
        description="Codeforces to sharpen, LeetCode to learn. The same set until midnight."
        pill={items.length > 0 ? `${done}/${items.length} solved` : undefined}
      />
      {items.length > 0 ? (
        <ul className="-mx-2 flex flex-col">
          {items.map((i) => (
            <ProblemRow key={i.problemId} p={i.rec!} done={i.done} density="compact" chips={false} feedback={[]} />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">
          {mix.isLoading ? "Picking today's problems…" : "Today's mix is picked as soon as your first sync finishes."}
        </p>
      )}
      <Link to="/practice" className="mt-auto self-start text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
        More to solve in Practice
      </Link>
    </section>
  );
}

function FollowedSheetSlot() {
  const followed = usePrefs().data?.followedSheet;
  if (!followed) return null;
  return (
    <div className="col-span-12">
      <FollowedSheetCard />
    </div>
  );
}

type LcStatsRow =NonNullable<ReturnType<typeof useHomeData>["data"]>["lcStats"];

/** LeetCode is the classroom: a compact secondary card. */
function LcCard({ lc }: { lc: LcStatsRow }) {
  const tracked = (useHandles().data?.leetcode ?? "") !== "";
  if (!lc && !tracked) {
    return (
      <section aria-labelledby="lc-title" className="glass-card flex h-full flex-col gap-2 p-6">
        <h2 id="lc-title" className="flex items-center gap-2 font-display text-headline font-semibold text-ink">
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
    <section aria-labelledby="lc-title" className="glass-card flex h-full flex-col gap-3 p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 id="lc-title" className="flex items-center gap-2 font-display text-headline font-semibold text-ink">
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
 * Today (v1.2, was Home Base) as a bento grid. "What do I do today?" comes first: today's quests and
 * streak beside today's mix. Then the rating hero, Work on next and LeetCode, activity and standing,
 * and the later contests.
 */
export function Today() {
  const { data, isLoading } = useHomeData();
  const report = useTopicReport();
  const upcoming = data?.upcoming ?? [];
  const nextCf = upcoming.find((c) => c.platform === "cf");

  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading your cached stats…</p>;

  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-5">
        <TodayCard />
      </div>
      <div className="col-span-12 lg:col-span-7">
        <TodayMixCard />
      </div>
      {/* The sheet you follow (v1.3): renders nothing when you don't follow one. */}
      <FollowedSheetSlot />
      <div className="col-span-12">
        <HeroCard cf={data?.cf ?? null} solved={data?.cfSolved ?? 0} history={data?.ratingHistory ?? []} nextCf={nextCf} />
      </div>
      <div className="col-span-12 lg:col-span-7">
        <WorkOnNext />
      </div>
      <div className="col-span-12 lg:col-span-5">
        <LcCard lc={data?.lcStats ?? null} />
      </div>
      <div className="col-span-12 lg:col-span-8">
        <ActivityHeatmap activity={data?.activity ?? []} />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <StandingCard report={report.data} />
      </div>
      <div className="col-span-12">
        <ContestStrip contests={upcoming.filter((c) => c !== nextCf)} />
      </div>
    </div>
  );
}
