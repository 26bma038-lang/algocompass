import { useState } from "react";
import { ArrowDown, ArrowUp, Check, X } from "lucide-react";
import { useStreak } from "@/components/shell/useStreak";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/data/prefs";
import { useWeeklyReview } from "@/data/quests";
import { useRecommender } from "@/data/recommendations";
import { cn } from "@/lib/utils";

const isSunday = () => new Date().getDay() === 0;
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function Line({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-t border-glass-border py-2 first:border-t-0 first:pt-0">
      <dt className="text-body-sm text-ink-muted">{label}</dt>
      <dd className="numeric text-right text-body-sm text-ink">{children}</dd>
    </div>
  );
}

function Versus({ now, before }: { now: number; before: number }) {
  if (now === before) return <span className="text-ink-muted"> (same as last week)</span>;
  return <span className="text-ink-muted"> ({now > before ? "+" : "−"}{Math.abs(now - before)} on last week)</span>;
}

/**
 * The week in one panel: solves per platform, topics that rose, rating, streak, goals hit or
 * missed, and one line on next week's focus. Open on Sundays, a click away on other days.
 */
export function WeeklyReviewCard() {
  const [open, setOpen] = useState(isSunday);
  const review = useWeeklyReview(open);
  const goals = usePrefs().data?.goals;
  const streak = useStreak();
  const rec = useRecommender().data;
  const d = review.data;
  const next = rec?.nextTopic;

  const goalRows = d && goals
    ? [
        { label: "Codeforces problems", value: d.counts.cfProblems, goal: goals.cfProblems },
        { label: "LeetCode problems", value: d.counts.lcProblems, goal: goals.lcProblems },
        { label: "Contests", value: d.counts.contests, goal: goals.contests },
      ].filter((g) => g.goal > 0)
    : [];
  const hit = goalRows.filter((g) => g.value >= g.goal).length;

  return (
    <section aria-labelledby="review-title" className="glass-card flex flex-col gap-3 p-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="review-title" className="text-title font-semibold text-ink">
          Weekly review
        </h2>
        {!open && (
          <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
            Show
          </Button>
        )}
      </div>
      {!open ? (
        <p className="text-body-sm text-ink-muted">Your week so far: solves, topics that improved, rating and goals. It opens here on its own on Sundays.</p>
      ) : !d ? (
        <p className="text-body-sm text-ink-muted">Adding up your week…</p>
      ) : (
        <>
          <p className="text-label text-ink-muted">
            {new Date(d.from * 1000).toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })} to today
          </p>
          <dl className="flex flex-col">
            <Line label="Codeforces solved">
              {d.counts.cfProblems}
              <Versus now={d.counts.cfProblems} before={d.lastWeek.cfProblems} />
            </Line>
            <Line label="LeetCode solved">
              {d.counts.lcProblems}
              <Versus now={d.counts.lcProblems} before={d.lastWeek.lcProblems} />
            </Line>
            <Line label="Rating">
              {d.rating.rounds === 0 ? (
                <span className="text-ink-muted">No rated rounds</span>
              ) : (
                <span className="inline-flex items-center gap-1">
                  {d.rating.delta >= 0 ? <ArrowUp aria-hidden className="size-3.5 text-success" strokeWidth={2.4} /> : <ArrowDown aria-hidden className="size-3.5 text-danger" strokeWidth={2.4} />}
                  {d.rating.delta >= 0 ? "+" : "−"}
                  {Math.abs(d.rating.delta)} over {plural(d.rating.rounds, "round")}
                </span>
              )}
            </Line>
            <Line label="Streak">
              {streak ? `${plural(streak.current, "day")} now` : "–"}
              <span className="text-ink-muted">, active {d.activeDays} of 7 days</span>
            </Line>
          </dl>

          <div className="flex flex-col gap-1.5">
            <h3 className="text-label text-ink-muted">Topics that improved</h3>
            {d.improved.length === 0 ? (
              <p className="text-body-sm text-ink-muted">No topic score rose yet this week.</p>
            ) : (
              <ul className="flex flex-col gap-1">
                {d.improved.map((t) => (
                  <li key={t.topicId} className="flex items-baseline justify-between gap-3 text-body-sm">
                    <span className="text-ink">{t.name}</span>
                    <span className="numeric font-display font-semibold text-ink">
                      <span className="text-ink-muted">{t.from} → </span>
                      {t.to}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {goalRows.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <h3 className="text-label text-ink-muted">
                Goals: {hit} of {goalRows.length} hit
              </h3>
              <ul className="flex flex-col gap-1">
                {goalRows.map((g) => {
                  const ok = g.value >= g.goal;
                  return (
                    <li key={g.label} className="flex items-center gap-2 text-body-sm">
                      {ok ? <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} /> : <X aria-hidden className="size-3.5 text-ink-faint" strokeWidth={2.4} />}
                      <span className={cn(ok ? "text-ink" : "text-ink-muted")}>{g.label}</span>
                      <span className="numeric ml-auto text-ink-muted">
                        {g.value} / {g.goal}
                        <span className="sr-only">{ok ? ", hit" : ", not yet"}</span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {next && (
            <p className="rounded-sm border border-glass-border bg-abyss-sunken p-3 text-body-sm text-ink">
              <span className="text-ink-muted">Next week: </span>
              {next.mode === "learn" ? `learn ${next.name.toLowerCase()} on LeetCode` : `sharpen ${next.name.toLowerCase()} on Codeforces`}. {next.why}
            </p>
          )}
        </>
      )}
    </section>
  );
}
