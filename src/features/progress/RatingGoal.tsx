import { useId, useState, type FormEvent } from "react";
import { AlertCircle, Check, Target } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useClearRatingGoal, useRatingGoal, useSaveRatingGoal, type RatingGoalView } from "@/data/ratingGoal";
import type { PlanVerdict, RatingPlan } from "@/engine/ratingGoal";
import { cn } from "@/lib/utils";

const longDate = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
const shortDate = (t: number) => new Date(t * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short" });
const signed = (n: number) => `${n >= 0 ? "+" : "−"}${Math.abs(Math.round(n))}`;
const per = (n: number) => (Math.round(n * 10) / 10).toString();
const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

function GoalForm({ view, onDone }: { view: RatingGoalView; onDone?: () => void }) {
  const save = useSaveRatingGoal();
  const targetId = useId();
  const dayId = useId();
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [target, setTarget] = useState(view.goal ? String(view.goal.target) : view.current ? String(Math.ceil((view.current + 200) / 100) * 100) : "");
  const [day, setDay] = useState(view.goal ? isoDay(new Date(view.goal.by * 1000)) : "");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = Number(target.trim());
    if (!/^\d+$/.test(target.trim()) || n < 800 || n > 4000) return setError("Use a rating from 800 to 4000.");
    if (view.current !== null && n <= view.current) return setError(`Pick a rating above your current ${view.current}.`);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || day < isoDay(tomorrow)) return setError("Pick a day from tomorrow on.");
    setError(null);
    save.mutate({ target: n, day }, { onSuccess: () => onDone?.() });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={targetId}>
            Target <Term id="rating">rating</Term>
          </Label>
          <Input id={targetId} inputMode="numeric" value={target} onChange={(e) => setTarget(e.target.value)} className="numeric w-[140px]" aria-invalid={error ? true : undefined} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={dayId}>By</Label>
          <Input id={dayId} type="date" min={isoDay(tomorrow)} value={day} onChange={(e) => setDay(e.target.value)} className="numeric w-[170px]" />
        </div>
        <div className="flex items-center gap-2">
          <Button type="submit" disabled={save.isPending}>
            {view.goal ? "Save the new plan" : "Make a plan"}
          </Button>
          {onDone && (
            <Button type="button" variant="ghost" onClick={onDone}>
              Cancel
            </Button>
          )}
        </div>
      </div>
      {error && (
        <p role="alert" className="flex items-center gap-1.5 text-body-sm text-danger">
          <AlertCircle aria-hidden className="size-3.5 shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </form>
  );
}

function VerdictNote({ verdict, plan }: { verdict: PlanVerdict; plan: RatingPlan }) {
  const text = (() => {
    switch (verdict.kind) {
      case "reached":
        return "You're there. Set a higher goal when you're ready.";
      case "date-passed":
        return "The date has passed. Pick a new one to get a fresh plan.";
      case "unknown":
        return "There isn't enough rated history to judge this goal yet (it needs 90 days of rated rounds). The targets below start from what you do now.";
      case "realistic":
        return `It needs ${signed(plan.neededPerMonth)} a month. Your best 90-day climb so far was ${signed(plan.pace.best!.gainPerMonth)} a month, so it's within reach.`;
      case "unrealistic":
        return `Honestly, this is unlikely: it needs ${signed(verdict.neededPerMonth)} a month, and your best 90-day climb so far was ${signed(verdict.bestPerMonth)} a month. At that best pace you'd get there around ${longDate(verdict.suggestedBy)}.`;
    }
  })();
  const warn = verdict.kind === "unrealistic";
  return (
    <p className={cn("flex items-start gap-2 rounded-sm border px-3 py-2.5 text-body-sm", warn ? "border-glass-border-strong text-ink" : "border-glass-border text-ink-muted")}>
      {warn ? <AlertCircle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning" strokeWidth={2} /> : <Target aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={2} />}
      <span>{text}</span>
    </p>
  );
}

function TargetTile({ value, label, basis }: { value: number; label: string; basis: string }) {
  return (
    <div className="flex flex-col gap-1 rounded-sm border border-glass-border bg-row p-4">
      <span className="numeric font-display text-headline leading-none font-semibold text-ink">{value}</span>
      <span className="text-body-sm font-medium text-ink">{label}</span>
      <span className="text-label text-ink-muted">{basis}</span>
    </div>
  );
}

function Plan({ view, plan }: { view: RatingGoalView; plan: RatingPlan }) {
  const { pace } = plan;
  const [thisWeek, ...earlier] = view.weeks;
  const solvesBasis =
    pace.solvesPerWeek > 0 ? `You solved about ${per(pace.solvesPerWeek)} Codeforces problems a week over the last 8 weeks.` : "No Codeforces solves in the last 8 weeks, so it starts small.";
  const contestsBasis =
    pace.best !== null
      ? `You took ${per(pace.contestsPerMonth)} a month lately, ${per(pace.best.contestsPerMonth)} during your best climb.`
      : view.plan && pace.contestsPerMonth > 0
        ? `You took ${per(pace.contestsPerMonth)} a month lately.`
        : "One a week to start: there's no rated history to go on yet.";
  return (
    <div className="flex flex-col gap-5">
      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {[
          ["Now", plan.current !== null ? String(plan.current) : "Unrated"],
          ["To go", plan.current !== null ? signed(plan.gap) : "–"],
          ["Weeks left", String(Math.ceil(plan.weeksLeft))],
          ...(view.planLine !== null ? [["Plan line today", String(view.planLine)]] : []),
        ].map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-label text-ink-muted">{k}</dt>
            <dd className="numeric font-display text-title font-semibold text-ink">{v}</dd>
          </div>
        ))}
      </dl>
      <VerdictNote verdict={plan.verdict} plan={plan} />
      {plan.verdict.kind !== "reached" && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <TargetTile value={plan.problemsPerWeek} label={`Problems a week rated ${plan.band.lo} to ${plan.band.hi}`} basis={solvesBasis} />
            <TargetTile value={plan.contestsPerMonth} label="Rated rounds a month" basis={contestsBasis} />
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-label text-ink-muted">Tracked weekly</span>
            <ul className="flex flex-col gap-2">
              {thisWeek && (
                <li className="flex flex-col gap-1.5">
                  <span className="flex items-baseline justify-between gap-3 text-body-sm">
                    <span className="text-ink">
                      This week: <span className="numeric font-semibold">{thisWeek.inBand}</span> of {thisWeek.target} rated {thisWeek.band.lo} to {thisWeek.band.hi}
                    </span>
                    <span className="numeric text-ink-muted">
                      Rounds this month: {view.contestsThisMonth} of {plan.contestsPerMonth}
                    </span>
                  </span>
                  <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-glass">
                    <span className="block h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (thisWeek.inBand / Math.max(1, thisWeek.target)) * 100)}%` }} />
                  </span>
                </li>
              )}
              {earlier.map((w) => (
                <li key={w.start} className="flex items-center justify-between gap-3 text-body-sm text-ink-muted">
                  <span>Week of {shortDate(w.start)}</span>
                  <span className="numeric flex items-center gap-1.5">
                    {w.inBand >= w.target && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />}
                    {w.inBand} of {w.target} rated {w.band.lo} to {w.band.hi}
                    <span className="sr-only">{w.inBand >= w.target ? ", target met" : ""}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}

/** Progress → Overview (smart): a target rating and date, the weekly targets that follow from your history, tracked weekly. */
export function RatingGoalCard() {
  const { data } = useRatingGoal();
  const clear = useClearRatingGoal();
  const [editing, setEditing] = useState(false);
  if (!data || !data.hasHandle) return null;
  const { goal, plan } = data;
  return (
    <section aria-labelledby="rating-goal-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="rating-goal-title"
        title={goal ? `Rating goal: ${goal.target} by ${longDate(goal.by)}` : "Rating goal"}
        description={goal ? undefined : "Pick a target rating and a date. The weekly plan comes from your own history, and says so honestly if the date is unlikely."}
        actions={
          goal && !editing ? (
            <span className="flex items-center gap-1">
              <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
                Change
              </Button>
              <Button variant="ghost" size="sm" disabled={clear.isPending} onClick={() => clear.mutate()}>
                Remove
              </Button>
            </span>
          ) : undefined
        }
      />
      {!goal || editing ? <GoalForm view={data} onDone={goal ? () => setEditing(false) : undefined} /> : plan && <Plan view={data} plan={plan} />}
    </section>
  );
}
