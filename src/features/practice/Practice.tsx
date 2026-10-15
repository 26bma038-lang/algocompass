import { useState, type ReactNode } from "react";
import { RefreshCw, Target } from "lucide-react";
import { CardHeader, Pill } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { ModeBadge } from "@/components/practice/ModeBadge";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { Button } from "@/components/ui/button";
import { useTopicReport } from "@/data/queries";
import { useMixOfTheDay, useRecommender, useReshuffleMix, type MixOfTheDay } from "@/data/recommendations";
import { useUiStore } from "@/data/uiStore";
import type { Recommender, TopicPlan } from "@/engine/recommender";
import { cn } from "@/lib/utils";

/** How many ranked topics "By topic" shows before "Show all". */
const TOPICS_SHOWN = 4;
const PER_TOPIC = 3;

/**
 * Today's run: one chamfered segment per mix problem, filling as you solve them. It echoes the
 * level badge's plate and the mastery ring's segments. Accent fill, no halo (glow budget).
 */
function RunMeter({ done, total }: { done: number; total: number }) {
  return (
    <span role="img" aria-label={`${done} of ${total} solved today`} className="flex items-center gap-1">
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          aria-hidden
          className="relative h-2 w-6 overflow-hidden bg-glass-border-strong [clip-path:polygon(3px_0,100%_0,calc(100%-3px)_100%,0_100%)]"
        >
          <span
            className="absolute inset-0 origin-left bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
            style={{ transform: `scaleX(${i < done ? 1 : 0})` }}
          />
        </span>
      ))}
    </span>
  );
}

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

  return (
    <section aria-labelledby="mix-title" className="glass-card flex flex-col gap-6 p-6">
      <CardHeader
        id="mix-title"
        title="Today's mix"
        description={
          <>
            {cf.length > 0 && `${cf.length} Codeforces ${cf.length === 1 ? "problem" : "problems"} to sharpen your weakest topics`}
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
              New mix
            </Button>
          </>
        }
      />

      {items.length === 0 ? (
        <p className="text-body-sm text-ink-muted">
          Nothing left to recommend in your current ranges. Mark a few problems too easy or too hard, or sync to pick up new Codeforces problems.
        </p>
      ) : (
        <div className="flex flex-col gap-5">
          {cf.length > 0 && (
            <Group
              label={
                <>
                  <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
                  Sharpen on Codeforces
                </>
              }
            >
              {cf.map((i) => (
                <ProblemRow key={i.problemId} p={i.rec!} done={i.done} />
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
                <ProblemRow key={i.problemId} p={i.rec!} done={i.done} />
              ))}
            </Group>
          )}
        </div>
      )}
      <p className="text-label text-ink-muted">
        Problems you solve are checked off after the next sync. LeetCode only shares your 20 most recent solves, so use Mark solved for
        anything you solved long ago.
      </p>
    </section>
  );
}

function UpsolveCard({ rec }: { rec: Recommender }) {
  const [all, setAll] = useState(false);
  const list = rec.upsolve();
  const shown = all ? list : list.slice(0, 6);
  return (
    <section aria-labelledby="upsolve-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="upsolve-title"
        title="Upsolve"
        description="Codeforces problems you tried and never got accepted, easiest first."
        pill={list.length > 0 ? `${list.length} open` : undefined}
      />
      {list.length === 0 ? (
        <p className="text-body-sm text-ink-muted">Nothing open. Every Codeforces problem you've tried is solved.</p>
      ) : (
        <ul className="-mx-2 flex flex-col">
          {shown.map((p) => (
            <ProblemRow key={p.id} p={p} density="compact" feedback={["skip"]} />
          ))}
        </ul>
      )}
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
      : `Codeforces problems rated ${plan.window.lo} to ${plan.window.hi}`;
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

/** `avoid` = today's mix, so the same problem isn't offered twice on one screen. */
function ByTopicCard({ rec, avoid }: { rec: Recommender; avoid: ReadonlySet<string> }) {
  const [all, setAll] = useState(false);
  const topics = all ? rec.ranked : rec.ranked.slice(0, TOPICS_SHOWN);
  return (
    <section aria-labelledby="bytopic-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="bytopic-title"
        title="By topic"
        description="Your weakest topics at your rating, most urgent first. Learn new ones on LeetCode, sharpen the rest on Codeforces."
      />
      {topics.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No topic needs work at your rating right now.</p>
      ) : (
        <ul className="flex flex-col gap-5 pt-1">
          {topics.map((p) => (
            <TopicBlock key={p.topicId} plan={p} rec={rec} avoid={avoid} />
          ))}
        </ul>
      )}
      {rec.ranked.length > TOPICS_SHOWN && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="self-start rounded-xs py-1 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
        >
          {all ? "Show fewer topics" : `Show all ${rec.ranked.length} topics`}
        </button>
      )}
    </section>
  );
}

/** Practice: today's mix first, then what to upsolve, then problems for each weak topic. */
export function Practice() {
  const report = useTopicReport();
  const rec = useRecommender();
  const mix = useMixOfTheDay();

  if (report.isLoading || rec.isLoading) return <p className="text-body-sm text-ink-muted">Picking your problems…</p>;
  if (!report.data?.hasData || !rec.data) {
    return (
      <EmptyState icon={Target} title="Recommendations appear after the first sync">
        AlgoCompass picks Codeforces problems just above your rating and LeetCode problems for topics you haven't learned yet, from your own
        history. Add your handles in Settings, and they show up here once the first sync finishes.
      </EmptyState>
    );
  }

  return (
    // Bento: today's mix leads full width, then Upsolve and By topic side by side (each keeps its own height).
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12">
        {mix.data ? (
          <MixCard mix={mix.data} rec={rec.data} />
        ) : (
          <section className="glass-card flex flex-col gap-1 p-6" aria-busy={mix.isLoading || mix.data === null}>
            <h2 className="font-display text-headline font-semibold text-ink">Today's mix</h2>
            <p className="text-body-sm text-ink-muted">{mix.data === null ? "Picked as soon as this sync finishes, so it's built on your latest solves." : "Picking today's problems…"}</p>
          </section>
        )}
      </div>
      <div className="col-span-12 lg:col-span-5">
        <UpsolveCard rec={rec.data} />
      </div>
      <div className="col-span-12 lg:col-span-7">
        <ByTopicCard rec={rec.data} avoid={new Set(mix.data?.items.map((i) => i.problemId) ?? [])} />
      </div>
    </div>
  );
}

