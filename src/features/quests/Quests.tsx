/**
 * Quest and goal cards. Since v1.2 there is no Quests screen: today's quests live on Today, and
 * the level and weekly goals on Progress.
 */
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { NumberTicker } from "@/components/ui/number-ticker";
import { useProgression } from "@/data/progression";
import { useTodayQuests, useWeeklyGoals } from "@/data/quests";
import { useMixOfTheDay } from "@/data/recommendations";
import type { QuestState } from "@/engine/quests";
import { cn } from "@/lib/utils";
import { QuestBar, QuestRow } from "./QuestList";

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
        <h2 className="font-display text-headline font-semibold text-ink">Today's quests</h2>
        <p className="mt-1 text-body-sm text-ink-muted">Loading today's quests…</p>
      </section>
    );
  }
  if (data === null) {
    return (
      <section className="glass-card p-6">
        <h2 className="font-display text-headline font-semibold text-ink">Today's quests</h2>
        <p className="mt-1 text-body-sm text-ink-muted">Today's quests are picked from your mix as soon as this sync finishes.</p>
      </section>
    );
  }
  const all = data.done === data.total;
  return (
    <section aria-labelledby="quests-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="quests-title"
        title="Today's quests"
        description="Picked from today's mix. They check themselves off when a sync sees the accepted submission."
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
        LeetCode only shares your 20 latest solves. If you solved a quest's LeetCode problem earlier, use Mark solved.
      </p>
    </section>
  );
}

export function LevelCard() {
  const data = useProgression().data?.xp;
  const lit = data?.level != null;
  return (
    <section aria-labelledby="level-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader id="level-title" title="Level" />
      <p className="flex items-baseline gap-2">
        <span className={cn("numeric font-display text-display leading-none font-semibold", lit ? "text-ink" : "text-ink-faint")}>
          {lit ? <NumberTicker id="level" value={data.level!} format={plain} /> : "–"}
        </span>
        <span className="text-body-sm text-ink-muted">{lit ? `${data.title} · ${data.totalXp.toLocaleString()} XP` : "Solve a problem to reach level 1"}</span>
      </p>
      {lit && (
        <div className="flex flex-col gap-1.5">
          <QuestBar value={data.progress} />
          <span className="numeric text-label text-ink-muted">
            <NumberTicker id="level-xp" value={data.intoLevel} format={plain} /> of {data.toNext} XP to level {data.level! + 1}
          </span>
        </div>
      )}
    </section>
  );
}

/** A goal ring: accent arc over a hairline track. Hitting the goal adds a check and words, never color alone. */
export function GoalRing({ label, value, goal, dot }: { label: string; value: number; goal: number; dot?: string }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  const ratio = goal > 0 ? Math.min(1, value / goal) : 0;
  const hit = goal > 0 && value >= goal;
  return (
    <div className="flex items-center gap-4">
      <svg width="64" height="64" viewBox="0 0 64 64" role="img" aria-label={`${label}: ${value} of ${goal}${hit ? ", goal hit" : ""}`} className="shrink-0 -rotate-90">
        <circle cx="32" cy="32" r={r} fill="none" stroke="var(--glass-border-strong)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={r}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - ratio)}
          className="transition-[stroke-dashoffset] duration-[var(--dur-slow)] ease-out-quint"
        />
      </svg>
      <div className="flex min-w-0 flex-col">
        <span className="flex items-center gap-1.5 text-label text-ink-muted">
          {dot && <span aria-hidden className={cn("size-1.5 rounded-full", dot)} />}
          {label}
        </span>
        <span className="numeric font-display text-headline font-semibold text-ink">
          {value}
          <span className="text-body text-ink-muted"> / {goal}</span>
        </span>
        {hit ? (
          <span className="flex items-center gap-1 text-label text-ink">
            <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
            Goal hit
          </span>
        ) : (
          <span className="text-label text-ink-muted">{goal - value} to go</span>
        )}
      </div>
    </div>
  );
}

export function WeeklyGoalsCard() {
  const { data } = useWeeklyGoals();
  const goals = data?.goals;
  const daysLeft = data ? Math.max(0, Math.ceil((data.to - Date.now() / 1000) / 86_400)) : null;
  return (
    <section aria-labelledby="goals-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader
        id="goals-title"
        title="This week"
        description="Weekly goals, Monday to Sunday. A problem counts in the week you first solve it."
        pill={daysLeft !== null ? `${daysLeft} ${daysLeft === 1 ? "day" : "days"} left` : undefined}
        actions={
          <Link to="/settings" className="rounded-xs text-label text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
            Edit goals
          </Link>
        }
      />
      {!data || !goals ? (
        <p className="text-body-sm text-ink-muted">Loading this week…</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          <GoalRing label="Codeforces problems" value={data.counts.cfProblems} goal={goals.cfProblems} dot="bg-platform-cf" />
          <GoalRing label="LeetCode problems" value={data.counts.lcProblems} goal={goals.lcProblems} dot="bg-platform-lc" />
          <GoalRing label="Contests" value={data.counts.contests} goal={goals.contests} />
        </div>
      )}
    </section>
  );
}
