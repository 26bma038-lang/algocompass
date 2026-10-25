import type { ReactNode } from "react";
import { Check, ExternalLink, Flame } from "lucide-react";
import { Link } from "react-router-dom";
import { Pill } from "@/components/CardHeader";
import { problemMeta, problemTitle, problemUrl } from "@/components/practice/ProblemRow";
import { RunMeter } from "@/components/practice/RunMeter";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { NumberTicker } from "@/components/ui/number-ticker";
import { flameState, streakAtRisk, useStreak } from "@/components/shell/useStreak";
import { useHomeData } from "@/data/queries";
import { useMarkSolved, useTodayQuests } from "@/data/quests";
import { useMixOfTheDay } from "@/data/recommendations";
import { usePrefs } from "@/data/prefs";
import { isSheetId, openTarget, useSheet } from "@/data/sheets";
import type { CfRatingChange, CfUser, Contest } from "@/data/types";
import type { QuestState } from "@/engine/quests";
import type { Rec } from "@/engine/recommender";
import { pickDoThisNext } from "@/engine/today";
import { TOPIC_BY_ID } from "@/engine/topics";
import { QuestBar, useRewardPulse } from "@/features/quests/QuestList";
import { LABELS } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";
import { bandForRating, bandProgress } from "@/lib/rank";
import { cn } from "@/lib/utils";
import { BeginnerToday } from "./BeginnerToday";
import { countdown, openContest, shortName, when } from "./ContestStrip";
import { useNow } from "./useNow";

const plain = (n: number) => String(Math.round(n));
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

/** "Do this next" as a small heading above the card's title (sentence case, never an eyebrow). */
export function DoThisNextLabel() {
  return <p className="text-body-sm font-medium text-accent">{LABELS.doThisNext}</p>;
}

/** "Codeforces · difficulty 1100 · Sorting" / "LeetCode · Easy · Dynamic programming". */
function SourceLine({ p }: { p: Rec }) {
  const topic = TOPIC_BY_ID.get(p.topicId)?.name;
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-body text-ink-muted">
      <span className="flex items-center gap-1.5">
        <span aria-hidden className={cn("size-2 rounded-full", p.platform === "cf" ? "bg-platform-cf" : "bg-platform-lc")} />
        {p.platform === "cf" ? "Codeforces" : "LeetCode"}
      </span>
      <span aria-hidden>·</span>
      {p.platform === "cf" ? (
        <span>
          <Term id="difficulty">difficulty</Term> <span className="numeric">{p.rating}</span>
        </span>
      ) : (
        <span>{p.difficulty}</span>
      )}
      {topic && (
        <>
          <span aria-hidden>·</span>
          <span>{topic}</span>
        </>
      )}
    </p>
  );
}

/** Smart mode's lead card: the single best next problem, one big button to open it. */
function DoThisNextCard() {
  const mix = useMixOfTheDay();
  const followed = usePrefs().data?.followedSheet ?? null;
  const sheet = useSheet(isSheetId(followed) ? followed : null).data;
  const mark = useMarkSolved();
  const pick = pickDoThisNext(mix.data?.items, sheet?.next ?? null);
  const progress =
    pick.kind !== "none" && pick.total > 0 ? (
      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-glass-border pt-4 text-body-sm text-ink-muted">
        <RunMeter done={pick.done} total={pick.total} />
        <span>
          {pick.done} of {pick.total} done today
        </span>
        <Link to="/practice" className="ml-auto underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
          All in Practice
        </Link>
      </div>
    ) : null;

  let body: ReactNode;
  if (pick.kind === "mix") {
    const p = pick.problem;
    const site = p.platform === "cf" ? "Codeforces" : "LeetCode";
    const href = problemUrl(p);
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h2 id="next-title" className="font-display text-display leading-tight font-semibold text-ink">
            {problemTitle(p)}
          </h2>
          <SourceLine p={p} />
          <p className="text-body-sm text-ink-muted">{problemMeta(p)}. Picked for your weakest topics, one of today's problems.</p>
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          {href && (
            <Button size="lg" onClick={() => openExternal(href)}>
              Open on {site}
              <ExternalLink aria-hidden />
            </Button>
          )}
          {p.platform === "lc" ? (
            <Button variant="outline" disabled={mark.isPending} onClick={() => mark.mutate({ platform: "lc", problemId: p.id, title: p.title, topicId: p.topicId })}>
              <Check aria-hidden />I solved it
            </Button>
          ) : (
            <span className="text-body-sm text-ink-muted">Solved it? It ticks itself at the next update.</span>
          )}
        </div>
      </>
    );
  } else if (pick.kind === "sheet" && sheet) {
    const p = pick.next.problem;
    const target = openTarget(p);
    body = (
      <>
        <div className="flex flex-col gap-2">
          <h2 id="next-title" className="font-display text-display leading-tight font-semibold text-ink">
            {p.title}
          </h2>
          <p className="text-body text-ink-muted">
            Next in {sheet.sheet.short}: {sheet.sheet.sectionLabel} {pick.next.sectionIndex + 1}, {sheet.sheet.sections[pick.next.sectionIndex]?.title}
            {p.difficulty ? `. ${p.difficulty}` : ""}
          </p>
          {pick.total > 0 && <p className="text-body-sm text-ink-muted">Today's problems are all done, so this comes from the sheet you follow.</p>}
        </div>
        {target && (
          <Button size="lg" className="self-start" onClick={() => openExternal(target.url)}>
            Open on {target.site}
            <ExternalLink aria-hidden />
          </Button>
        )}
      </>
    );
  } else if (pick.kind === "all-done") {
    body = (
      <div className="flex flex-col gap-2">
        <h2 id="next-title" className="font-display text-display leading-tight font-semibold text-ink">
          Today's problems are done
        </h2>
        <p className="text-body text-ink-muted">That's all {pick.total}. A new set comes at midnight; Practice has more by topic if you want to keep going.</p>
        <Link to="/practice" className="self-start text-body text-ink underline decoration-glass-border-strong underline-offset-4">
          More problems in Practice
        </Link>
      </div>
    );
  } else {
    body = (
      <div className="flex flex-col gap-2">
        <h2 id="next-title" className="font-display text-headline font-semibold text-ink">
          {mix.isLoading ? "Picking today's problems…" : "Today's problems come after the first update"}
        </h2>
        <p className="text-body-sm text-ink-muted">They're picked from your own history: Codeforces problems just above your rating, and LeetCode problems for topics you haven't learned yet.</p>
      </div>
    );
  }

  return (
    <section aria-labelledby="next-title" className="glass-card flex h-full flex-col gap-4 p-6">
      <DoThisNextLabel />
      {body}
      {progress}
    </section>
  );
}

/** The CF rating, compact (v1.4): rating, rank and progress to the next, and the next round. */
function RatingCard({ cf, solved, history, nextCf }: { cf: CfUser | null; solved: number; history: readonly CfRatingChange[]; nextCf: Contest | undefined }) {
  const nowMs = useNow();
  const rating = cf?.rating ?? null;
  const band = rating !== null ? bandForRating(rating) : null;
  const progress = rating !== null ? bandProgress(rating) : 0;
  const last = history[history.length - 1];
  const lastDelta = last ? last.newRating - last.oldRating : null;
  return (
    <section aria-labelledby="hero-title" className="glass-card grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[auto_minmax(0,1fr)_minmax(0,0.8fr)]">
      <div className="flex min-w-0 flex-col gap-2">
        <h2 id="hero-title" className="flex items-baseline gap-2 text-title font-semibold text-ink">
          <span aria-hidden className="size-2 self-center rounded-full bg-platform-cf" />
          <span>
            Codeforces <Term id="rating">rating</Term>
          </span>
          <span className="truncate text-body-sm font-normal text-ink-muted">{cf?.handle ?? ""}</span>
        </h2>
        <p className="numeric font-display text-hero leading-none font-semibold text-rank">
          {rating !== null ? <NumberTicker id="cf-rating" value={rating} format={plain} /> : <span className="text-body text-ink-muted">{cf ? "Unrated" : LABELS.notUpdated}</span>}
        </p>
      </div>
      <div className="flex min-w-0 flex-col gap-2">
        {band ? (
          <>
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
          </>
        ) : (
          <p className="text-body-sm text-ink-muted">Your rank appears after your first rated contest.</p>
        )}
        <p className="numeric text-body-sm text-ink-muted">
          {solved} solved · {plural(history.length, "rated round")}
          {lastDelta !== null && ` · last change ${lastDelta >= 0 ? "+" : ""}${lastDelta}`}
        </p>
      </div>
      {nextCf ? (
        <button
          type="button"
          onClick={() => openContest(nextCf.url)}
          className="flex h-full flex-col items-start justify-center gap-1 rounded-md border border-glass-border bg-abyss-sunken p-4 text-left transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong"
        >
          <span className="text-label text-ink-muted">Next round</span>
          <span className="numeric font-display text-headline font-semibold text-accent">{countdown(nextCf.startTime, nowMs)}</span>
          <span className="line-clamp-1 text-body-sm text-ink">{shortName(nextCf)}</span>
          <span className="text-label text-ink-muted">
            {when(nextCf.startTime)}
            <span className="sr-only"> (opens in browser)</span>
          </span>
        </button>
      ) : (
        <Link to="/contests" className="text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
          No Codeforces round is scheduled yet. See Contests
        </Link>
      )}
    </section>
  );
}

function TodayGoal({ q }: { q: QuestState }) {
  const pulse = useRewardPulse(q.id);
  return (
    <li className={cn("flex flex-col gap-2 rounded-md bg-abyss-sunken px-4 py-2.5", pulse && "aura-pulse")}>
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
      {/* A one-problem goal is done or not; a bar only says something for bigger targets. */}
      {q.target > 1 && <QuestBar value={q.progress / q.target} />}
    </li>
  );
}

/**
 * Today's goals (quests). "Am I on track?" in one card. The streak lives in the top bar (v1.4: each
 * number in one place); `withStreak` adds the streak line where there's no top-bar flame.
 */
export function GoalsCard({ withStreak = false }: { withStreak?: boolean }) {
  const streak = useStreak();
  const state = flameState(streak);
  const atRisk = streakAtRisk(streak);
  const { data, isLoading } = useTodayQuests();
  return (
    <section aria-labelledby="today-title" className="glass-card flex h-full flex-col gap-4 p-6">
      {/* Inline header (not CardHeader): its 256px title minimum would push the pill under the title in 5 columns. */}
      <div className="flex items-center justify-between gap-3">
        <h2 id="today-title" className="font-display text-headline font-semibold text-ink">
          {LABELS.goals}
        </h2>
        {data && (
          <Pill>
            {data.done}/{data.total} done
          </Pill>
        )}
      </div>
      {withStreak && (
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
            {!streak ? (
              <span className="text-ink-muted">
                Your <Term id="streak">streak</Term> starts after the first update
              </span>
            ) : (
              <>
                <span className="numeric font-display text-title font-semibold text-ink">{streak.current}</span>
                <span className="text-ink-muted">
                  {" "}
                  day <Term id="streak">streak</Term>,{" "}
                </span>
                {state === "lit" ? (
                  <span className="text-ink">practised today ({plural(streak.todayCount, "solve")})</span>
                ) : (
                  <span className={atRisk ? "text-warning" : "text-ink"}>solve one problem to {streak.current > 0 ? "keep it" : "start one"}</span>
                )}
              </>
            )}
          </p>
        </div>
      )}
      {data ? (
        <ul className="flex flex-col gap-2">
          {data.quests.map((q) => (
            <TodayGoal key={q.id} q={q} />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">{isLoading ? "Picking today's goals…" : "Today's goals appear after the first update."}</p>
      )}
    </section>
  );
}

/**
 * Today (v1.4): one "do this next", today's goals, and (smart) a compact rating card. Everything
 * else moved: LeetCode, Activity and Where you stand to Progress → Overview; the other problem lists
 * to Practice; later contests to Contests.
 */
export function Today() {
  const prefs = usePrefs();
  // Wait for the mode, so a beginner never sees the smart layout flash first.
  if (prefs.isLoading) return null;
  if (prefs.data?.mode === "beginner") return <BeginnerToday goals={<GoalsCard />} />;
  return <SmartToday />;
}

function SmartToday() {
  const { data, isLoading } = useHomeData();
  const nextCf = data?.upcoming.find((c) => c.platform === "cf");
  if (isLoading) return <p className="text-body-sm text-ink-muted">Loading your saved stats…</p>;
  return (
    <div className="grid grid-cols-12 gap-6">
      <div className="col-span-12 lg:col-span-7">
        <DoThisNextCard />
      </div>
      <div className="col-span-12 lg:col-span-5">
        <GoalsCard />
      </div>
      <div className="col-span-12">
        <RatingCard cf={data?.cf ?? null} solved={data?.cfSolved ?? 0} history={data?.ratingHistory ?? []} nextCf={nextCf} />
      </div>
    </div>
  );
}
