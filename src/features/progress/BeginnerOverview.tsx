import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { lessonPath } from "@/components/shell/nav";
import { stepLabel } from "@/components/shell/topBarItems";
import { usePath } from "@/data/path";
import { useYourWeek } from "@/data/progress";
import { stripProgress } from "@/features/path/shared";
import { SectionStrip } from "@/features/sheets/SectionStrip";
import { LABELS } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { BadgesCard } from "./BadgesCard";

const DAYS = ["M", "T", "W", "T", "F", "S", "S"] as const;
const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** "Your path": where you are on the Beginner Path, counted in steps, and the way back into it. */
function YourPathCard() {
  const view = usePath().data;
  if (!view) return <section aria-busy className="glass-card h-[240px] p-6" />;
  const total = view.steps.length;
  const cur = view.current !== null ? view.steps[view.current]! : null;
  const solved = view.steps.filter((s) => s.state !== "locked").reduce((n, s) => n + s.solved, 0);
  return (
    <section aria-labelledby="your-path-title" className="glass-card flex h-full flex-col gap-5 p-6">
      <div className="flex flex-col gap-1">
        <h2 id="your-path-title" className="text-body-sm font-medium text-ink-muted">
          {LABELS.yourPath}
        </h2>
        <p className="numeric font-display text-display font-semibold text-ink">{stepLabel(view.current, total)}</p>
        <p className="numeric text-body text-ink-muted">
          {view.doneCount} of {total} steps done, {solved} lesson {solved === 1 ? "problem" : "problems"} solved
        </p>
      </div>
      <SectionStrip sections={stripProgress(view)} titles={view.steps.map((s) => s.step.title)} label="Step" current={view.current ?? undefined} />
      {cur && (
        <Link
          to={lessonPath(cur.step.id)}
          className="mt-auto flex items-center gap-1.5 self-start rounded-xs text-body text-ink underline decoration-glass-border-strong underline-offset-4 hover:decoration-ink"
        >
          Continue step {(view.current ?? 0) + 1}: {cur.step.title}
          <ArrowRight aria-hidden className="size-4" />
        </Link>
      )}
    </section>
  );
}

/** "Your week": seven dots, Monday first, lit on days with any practice, and this week's counts. */
function YourWeekCard() {
  const week = useYourWeek().data;
  const today = (new Date().getDay() + 6) % 7;
  return (
    <section aria-labelledby="your-week-title" className="glass-card flex h-full flex-col gap-5 p-6">
      <CardHeader id="your-week-title" title={LABELS.yourWeek} />
      <ol aria-label="Days practised this week" className="flex items-end gap-3">
        {DAYS.map((d, i) => {
          const on = week?.days[i] ?? false;
          return (
            <li key={i} className="flex flex-col items-center gap-1.5">
              <span
                aria-hidden
                className={cn(
                  "size-6 rounded-full border",
                  on ? "border-accent bg-accent" : "border-glass-border-strong bg-transparent",
                  i === today && !on && "border-ink-muted",
                )}
              />
              <span className={cn("text-label", i === today ? "font-semibold text-ink" : "text-ink-muted")}>{d}</span>
              <span className="sr-only">
                {DAY_NAMES[i]}: {on ? "practised" : "no practice"}
                {i === today ? " (today)" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="numeric text-body text-ink">
        {week && week.activeDays > 0
          ? `${week.activeDays} ${week.activeDays === 1 ? "day" : "days"} practised, ${week.solved} ${week.solved === 1 ? "problem" : "problems"} solved this week`
          : "Nothing yet this week. Watch a lesson or solve a problem, and today lights up."}
      </p>
    </section>
  );
}

/**
 * Progress → Overview in Beginner mode (v1.4): never empty, even with no account. Your path (steps),
 * your week (days practised), and badges. Rating, level and the topic charts come with an account.
 */
export function BeginnerOverview() {
  return (
    <div className="grid grid-cols-12 items-stretch gap-6">
      <div className="col-span-12 lg:col-span-7">
        <YourPathCard />
      </div>
      <div className="col-span-12 lg:col-span-5">
        <YourWeekCard />
      </div>
      <div className="col-span-12">
        <BadgesCard />
      </div>
    </div>
  );
}
