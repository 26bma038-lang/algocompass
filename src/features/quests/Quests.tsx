/**
 * Quest and goal cards. Since v1.2 there is no Quests screen: today's quests live on Today, and
 * the level and weekly goals on Progress.
 */
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useProgression } from "@/data/progression";
import { useTodayQuests, useWeeklyGoals } from "@/data/quests";
import { useMixOfTheDay } from "@/data/recommendations";
import { goalMeter } from "@/engine/progress";
import type { QuestState } from "@/engine/quests";
import { cn } from "@/lib/utils";
import { QuestBar, QuestRow } from "./QuestList";
import { LABELS, TERMS } from "@/lib/glossary";
import { Term } from "@/components/Term";

const plain = (n: number) => String(Math.round(n));

/** The mix problems a quest points at, so you can open (or mark) them right here. */
function QuestProblems({ q }: { q: QuestState }) {
  const mix = useMixOfTheDay();
  if (q.done || q.problemIds.length === 0) return null;
  const items = (mix.data?.items ?? []).filter((i) => q.problemIds.includes(i.problemId) && i.rec && !i.done);
  if (!items.length) return null;
  return (
    <ul className="-mx-2 -mb-1 flex flex-col">
      {items.map((i) => (
        // LeetCode rows keep Mark solved in view: the API can't see older solves.
        <ProblemRow key={i.problemId} p={i.rec!} density={i.platform === "lc" ? "comfortable" : "compact"} chips={false} feedback={i.platform === "lc" ? ["skip"] : []} />
      ))}
    </ul>
  );
}

export function TodayQuestsCard() {
  const { data, isLoading } = useTodayQuests();
  if (isLoading || data === undefined) {
    return (
      <section className="glass-card p-6" aria-busy>
        <h2 className="font-display text-headline font-semibold text-ink">{LABELS.goals}</h2>
        <p className="mt-1 text-body-sm text-ink-muted">Loading today's goals…</p>
      </section>
    );
  }
  if (data === null) {
    return (
      <section className="glass-card p-6">
        <h2 className="font-display text-headline font-semibold text-ink">{LABELS.goals}</h2>
        <p className="mt-1 text-body-sm text-ink-muted">Today's goals are picked from today's problems as soon as this update finishes.</p>
      </section>
    );
  }
  const all = data.done === data.total;
  return (
    <section aria-labelledby="quests-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="quests-title"
        title={LABELS.goals}
        description="Picked from today's problems. They check themselves off when an update sees your accepted solution."
        pill={
          <>
            {all && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />}
            {all ? "All done today" : `${data.done}/${data.total} done`}
          </>
        }
      />
      <ul className="flex flex-col gap-3">
        {data.quests.map((q) => (
          <QuestRow key={q.id} q={q}>
            <QuestProblems q={q} />
          </QuestRow>
        ))}
      </ul>
      <p className="text-label text-ink-muted">
        LeetCode only shares your 20 latest solves. If you solved a goal's LeetCode problem earlier, use Mark solved.
      </p>
    </section>
  );
}

/** The level and XP; since v1.8 it holds the badges too (`children`), as Level and badges. */
export function LevelCard({ children }: { children?: ReactNode }) {
  const data = useProgression().data?.xp;
  const lit = data?.level != null;
  return (
    <section aria-labelledby="level-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader id="level-title" title={children ? LABELS.levelAndBadges : "Level"} description={TERMS.level.hint} />
      <p className="flex items-baseline gap-2">
        <span className={cn("numeric font-display text-display leading-none font-semibold", lit ? "text-ink" : "text-ink-faint")}>
          {lit ? <NumberTicker id="level" value={data.level!} format={plain} /> : "–"}
        </span>
        <span className="text-body-sm text-ink-muted">{lit ? (
            <>
              {data.title} · {data.totalXp.toLocaleString()} <Term id="xp" />
            </>
          ) : (
            "Solve a problem to reach level 1"
          )}</span>
      </p>
      {lit && (
        <div className="flex flex-col gap-1.5">
          <QuestBar value={data.progress} />
          <span className="numeric text-body-sm text-ink-muted">
            <NumberTicker id="level-xp" value={data.intoLevel} format={plain} /> of {data.toNext} XP to level {data.level! + 1}
          </span>
        </div>
      )}
      {children && <div className="border-t border-glass-border pt-4">{children}</div>}
    </section>
  );
}

/**
 * One weekly goal as a horizontal meter (v1.4 polish; empty rings read as nothing at all): the goal
 * on the left, the bar, then "3 of 10" over "7 to go". Hitting it adds a check and words, never colour alone.
 */
export function GoalMeter({ label, value, goal }: { label: string; value: number; goal: number }) {
  const { ratio, hit, count, note } = goalMeter(value, goal);
  return (
    <li className="grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)_6.5rem] items-center gap-4">
      <span className="text-body-sm text-ink">{label}</span>
      <span
        role="meter"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.max(goal, 1)}
        aria-valuenow={Math.min(value, Math.max(goal, 1))}
        aria-valuetext={note ? `${count}, ${note.toLowerCase()}` : count}
        className="relative block h-2 overflow-hidden rounded-full bg-glass-border-strong"
      >
        <span
          className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
          style={{ transform: `scaleX(${ratio})` }}
        />
      </span>
      <span className="flex flex-col items-end text-right">
        <span className="numeric text-body-sm text-ink">
          {goal > 0 ? (
            <>
              <span className="font-semibold">{value}</span> of {goal}
            </>
          ) : (
            <span className="text-ink-muted">No goal set</span>
          )}
        </span>
        {note &&
          (hit ? (
            <span className="flex items-center gap-1 text-body-sm text-ink">
              <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
              {note}
            </span>
          ) : (
            <span className="text-body-sm text-ink-muted">{note}</span>
          ))}
      </span>
    </li>
  );
}

/**
 * This week (v1.8): the weekly goals, with `actions` beside Edit goals (Share my week) and
 * `children` under the meters (the weekly review, folded).
 */
export function WeeklyGoalsCard({ actions, children }: { actions?: ReactNode; children?: ReactNode }) {
  const { data } = useWeeklyGoals();
  const goals = data?.goals;
  const daysLeft = data ? Math.max(0, Math.ceil((data.to - Date.now() / 1000) / 86_400)) : null;
  return (
    <section aria-labelledby="goals-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="goals-title"
        title={LABELS.thisWeek}
        description="Weekly goals, Monday to Sunday. A problem counts in the week you first solve it."
        pill={daysLeft !== null ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : undefined}
        actions={
          <span className="flex items-center gap-3">
            {actions}
            <Link to="/settings" className="rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
              Edit goals
            </Link>
          </span>
        }
      />
      {!data || !goals ? (
        <p className="text-body-sm text-ink-muted">Loading this week…</p>
      ) : (
        <ul className="flex flex-col gap-4">
          <GoalMeter label="Codeforces problems" value={data.counts.cfProblems} goal={goals.cfProblems} />
          <GoalMeter label="LeetCode problems" value={data.counts.lcProblems} goal={goals.lcProblems} />
          <GoalMeter label="Contests" value={data.counts.contests} goal={goals.contests} />
        </ul>
      )}
      {children}
    </section>
  );
}
