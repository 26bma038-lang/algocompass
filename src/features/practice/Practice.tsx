import { Suspense, useState, type ReactNode } from "react";
import { LABELS } from "@/lib/glossary";
import { Outlet } from "react-router-dom";
import { ChevronDown, RefreshCw, Target } from "lucide-react";
import { CardHeader, Pill } from "@/components/CardHeader";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { usePrefs } from "@/data/prefs";
import { EmptyState } from "@/components/EmptyState";
import { ModeBadge } from "@/components/practice/ModeBadge";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { RunMeter } from "@/components/practice/RunMeter";
import { Button } from "@/components/ui/button";
import { useTopicReport } from "@/data/queries";
import { useMixOfTheDay, useRecommender, useReshuffleMix, type MixOfTheDay } from "@/data/recommendations";
import { useUiStore } from "@/data/uiStore";
import type { Recommender, TopicPlan } from "@/engine/recommender";
import { cn } from "@/lib/utils";
import { practiceTabs } from "./tabs";

/** How many ranked topics "More by topic" shows before "Show all". */
const TOPICS_SHOWN = 4;
const PER_TOPIC = 3;

function Group({ label, children }: { label: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="flex items-center gap-1.5 px-3 text-label text-ink-muted">{label}</h3>
      <ul className="flex flex-col">{children}</ul>
    </div>
  );
}

function MixCard({ mix, rec }: { mix: MixOfTheDay; rec: Recommender }) {
  const reshuffle = useReshuffleMix();
  const items = mix.items.filter((i) => i.rec !== null);
  const cf = items.filter((i) => i.platform === "cf");
  const lc = items.filter((i) => i.platform === "lc");
  const done = items.filter((i) => i.done).length;
  const learnTopic = lc[0] ? rec.plans.get(lc[0].topicId) : undefined;
  // The one primary Open on the screen: the first problem not solved yet (Codeforces first, as listed).
  const firstOpen = [...cf, ...lc].find((i) => !i.done)?.problemId;

  return (
    <section aria-labelledby="mix-title" className="glass-card flex flex-col gap-6 p-6">
      <CardHeader
        id="mix-title"
        title={LABELS.todaysProblems}
        description={
          <>
            {cf.length > 0 && `${cf.length} Codeforces ${cf.length === 1 ? "problem" : "problems"} for your weakest topics`}
            {cf.length > 0 && lc.length > 0 && ", and "}
            {lc.length > 0 && `${lc.length} on LeetCode to learn ${learnTopic?.name.toLowerCase() ?? "your next topic"}`}. The same set until
            midnight.
          </>
        }
        actions={
          <>
            {items.length > 0 && (
              <span className="flex items-center gap-3">
                <RunMeter done={done} total={items.length} />
                <Pill>
                  {done}/{items.length} solved
                </Pill>
              </span>
            )}
            <Button variant="outline" size="sm" onClick={() => reshuffle.mutate()} disabled={reshuffle.isPending}>
              <RefreshCw aria-hidden className={cn(reshuffle.isPending && "animate-spin")} />
              {LABELS.newSet}
            </Button>
          </>
        }
      />

      {items.length === 0 ? (
        <p className="text-body-sm text-ink-muted">
          Nothing left to recommend in your current ranges. Mark a few problems too easy or too hard, or update to pick up new Codeforces problems.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {cf.length > 0 && (
            <Group
              label={
                <>
                  <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
                  Practise on Codeforces
                </>
              }
            >
              {cf.map((i) => (
                <ProblemRow key={i.problemId} p={i.rec!} done={i.done} primary={i.problemId === firstOpen} />
              ))}
            </Group>
          )}
          {lc.length > 0 && (
            <Group
              label={
                <>
                  <span aria-hidden className="size-1.5 rounded-full bg-platform-lc" />
                  Learn on LeetCode
                </>
              }
            >
              {lc.map((i) => (
                <ProblemRow key={i.problemId} p={i.rec!} done={i.done} primary={i.problemId === firstOpen} />
              ))}
            </Group>
          )}
        </div>
      )}
      <p className="text-label text-ink-muted">Solved problems are checked off at the next update. Skip, Too easy, Too hard and I solved it are in each row's ⋯ menu.</p>
    </section>
  );
}

/** Codeforces problems you tried and never got accepted. Only shown when there are any (v1.4). */
function UnfinishedCard({ rec }: { rec: Recommender }) {
  const [all, setAll] = useState(false);
  const list = rec.upsolve();
  if (list.length === 0) return null;
  const shown = all ? list : list.slice(0, 6);
  return (
    <section aria-labelledby="upsolve-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader id="upsolve-title" title={LABELS.unfinished} description="Codeforces problems you tried and never got accepted, easiest first." pill={`${list.length} open`} />
      <ul className="-mx-2 grid grid-cols-1 gap-x-6 lg:grid-cols-2">
        {shown.map((p) => (
          <ProblemRow key={p.id} p={p} density="compact" feedback={["skip"]} />
        ))}
      </ul>
      {list.length > 6 && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="self-start rounded-xs py-1 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
        >
          {all ? "Show fewer" : `Show all ${list.length}`}
        </button>
      )}
    </section>
  );
}

function TopicBlock({ plan, rec, avoid }: { plan: TopicPlan; rec: Recommender; avoid: ReadonlySet<string> }) {
  const openTopic = useUiStore((s) => s.openTopic);
  const problems = plan.mode === "learn" ? rec.learn(plan.topicId, PER_TOPIC, avoid) : rec.sharpen(plan.topicId, PER_TOPIC, avoid);
  const where =
    plan.mode === "learn"
      ? `${plan.readiness.solves} of ${plan.readiness.needed} solves before it moves to Codeforces`
      : `Codeforces problems of difficulty ${plan.window.lo} to ${plan.window.hi}`;
  return (
    <li className="flex flex-col gap-2 border-t border-glass-border pt-5 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => openTopic(plan.topicId)}
          className="flex items-baseline gap-2 rounded-xs text-left text-title font-semibold text-ink hover:underline hover:decoration-glass-border-strong hover:underline-offset-4"
        >
          {plan.name}
          <span className="numeric font-display text-body-sm font-semibold text-ink-muted">{plan.status === "Untouched" ? "Not tried" : plan.score}</span>
        </button>
        <ModeBadge mode={plan.mode} />
      </div>
      <p className="text-body-sm text-ink-muted">{plan.why}</p>
      <p className="text-label text-ink-muted">{where}</p>
      {problems.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No open problems left in this range. Open the topic for its resources.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {problems.map((p) => (
            <ProblemRow key={p.id} p={p} density="compact" />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * "More by topic" (v1.4: folded). Your weakest topics at your rating, a few problems each. `avoid` =
 * today's problems, so the same problem isn't offered twice on one screen.
 */
function MoreByTopicCard({ rec, avoid }: { rec: Recommender; avoid: ReadonlySet<string> }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const topics = all ? rec.ranked : rec.ranked.slice(0, TOPICS_SHOWN);
  const names = rec.ranked.slice(0, 3).map((p) => p.name);
  return (
    <section aria-labelledby="bytopic-title" className="glass-card flex flex-col gap-4 p-6">
      <h2 id="bytopic-title" className="font-display text-headline font-semibold text-ink">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-3 rounded-xs text-left">
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span>{LABELS.moreByTopic}</span>
            <span className="truncate font-sans text-body-sm font-normal text-ink-muted">
              {rec.ranked.length === 0 ? "No topic needs work at your rating right now." : `A few problems for each weak topic: ${names.join(", ")}${rec.ranked.length > 3 ? "…" : ""}`}
            </span>
          </span>
          <ChevronDown aria-hidden className={cn("size-5 shrink-0 text-ink-muted transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} />
        </button>
      </h2>
      {open && topics.length > 0 && (
        <>
          <ul className="flex flex-col gap-5 pt-1">
            {topics.map((p) => (
              <TopicBlock key={p.topicId} plan={p} rec={rec} avoid={avoid} />
            ))}
          </ul>
          {rec.ranked.length > TOPICS_SHOWN && (
            <button
              type="button"
              onClick={() => setAll((v) => !v)}
              className="self-start rounded-xs py-1 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
            >
              {all ? "Show fewer topics" : `Show all ${rec.ranked.length} topics`}
            </button>
          )}
        </>
      )}
    </section>
  );
}

/** Practice → Today's problems: the five picked for today, then unfinished problems, then more by topic (folded). */
export function PracticeMix() {
  const report = useTopicReport();
  const rec = useRecommender();
  const mix = useMixOfTheDay();

  if (report.isLoading || rec.isLoading) return <p className="text-body-sm text-ink-muted">Picking your problems…</p>;
  if (!report.data?.hasData || !rec.data) {
    return (
      <EmptyState icon={Target} title="Today's problems appear after the first update">
        AlgoCompass picks Codeforces problems just above your rating and LeetCode problems for topics you haven't learned yet, from your own
        history. Add your usernames in Settings, and they show up here once the first update finishes.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {mix.data ? (
        <MixCard mix={mix.data} rec={rec.data} />
      ) : (
        <section className="glass-card flex flex-col gap-1 p-6" aria-busy={mix.isLoading || mix.data === null}>
          <h2 className="font-display text-headline font-semibold text-ink">{LABELS.todaysProblems}</h2>
          <p className="text-body-sm text-ink-muted">{mix.data === null ? "Picked as soon as this update finishes, so it's built on your latest solves." : "Picking today's problems…"}</p>
        </section>
      )}
      <UnfinishedCard rec={rec.data} />
      <MoreByTopicCard rec={rec.data} avoid={new Set(mix.data?.items.map((i) => i.problemId) ?? [])} />
    </div>
  );
}

/**
 * Practice (v1.4). Smart mode: two tabs, Today's problems · Sheets. Beginner mode: no tabs; the page
 * is the problems from your lessons, with popular sheets one quiet card below (and a way back from
 * the sheet pages).
 */
export function Practice() {
  const beginner = usePrefs().data?.mode === "beginner";
  const tabs = practiceTabs(beginner ? "beginner" : "smart");
  return (
    <div className="flex flex-col gap-6">
      {tabs.length > 0 && <SegmentedTabs label="Practice sections" tabs={tabs} />}
      <Suspense fallback={<p className="text-body-sm text-ink-muted">Loading…</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}
