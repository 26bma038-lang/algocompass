import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useProblemPool } from "@/data/mustDo";
import { openTarget, useSolveIndex, useTickProblem } from "@/data/sheets";
import { difficultyRank, mustDo, namedProblem, videoTopic, type MustDoPick, type PoolProblem } from "@/engine/mustDo";
import { problemStatus, type ProblemStatus } from "@/engine/sheets";
import { OpenButton, topicName } from "@/features/sheets/parts";
import { LABELS, onSheets } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** 1 to 3 bars for Easy, Medium, Hard (a Codeforces rating by its band); none when no one rates it. */
function DifficultyChip({ p }: { p: PoolProblem }) {
  const rank = difficultyRank(p);
  const level = Number.isFinite(rank) ? Math.floor(rank) : 0;
  const label = p.difficulty ?? (typeof p.rating === "number" ? null : LABELS.notRated);
  return (
    <span
      title={p.difficultyFrom === "sheet" ? "The sheet's own level (this problem isn't on LeetCode)" : undefined}
      className={cn(
        "inline-flex h-6 w-[5.5rem] shrink-0 items-center gap-2 rounded-full border border-glass-border px-2.5 text-label leading-none font-medium whitespace-nowrap",
        level ? "text-ink" : "text-ink-faint",
      )}
    >
      <span aria-hidden className="flex items-end gap-[2px]">
        {[1, 2, 3].map((i) => (
          <span key={i} className={cn("w-[3px] rounded-full", i === 1 ? "h-1.5" : i === 2 ? "h-2" : "h-2.5", i <= level ? "bg-current" : "bg-glass-border-strong")} />
        ))}
      </span>
      {label ?? (
        <span>
          <span className="sr-only">Codeforces </span>
          <Term id="difficulty">
            <span className="numeric">{p.rating}</span>
          </Term>
        </span>
      )}
    </span>
  );
}

/** Where the problem lives, for the meta line. */
const siteOf = (p: PoolProblem) => openTarget(p)?.site ?? (p.cf ? "Codeforces" : p.lc ? "LeetCode" : "No link");

/** Why it's on the list, for the meta line ("Solved in this video" has its own pill). */
function why(p: PoolProblem, sheetCount: number): string | null {
  if (p.sheets.length) return onSheets(p.sheets.length, sheetCount);
  return p.inPath ? LABELS.fromPath : null;
}

/** "I solved it": the same tick as a sheet's tick box (a LeetCode or Codeforces problem also counts as a solve). */
function SolvedButton({ p, status, onTick }: { p: PoolProblem; status: ProblemStatus; onTick: (key: string) => void }) {
  const tick = useTickProblem();
  if (status.done) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            aria-pressed
            aria-label={`${LABELS.solved}: ${p.title}. Untick`}
            disabled={tick.isPending}
            onClick={() => tick.mutate({ problem: p, done: false })}
            className="w-32 shrink-0"
          >
            <Check aria-hidden className="text-success" strokeWidth={2.4} />
            {LABELS.solved}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">{status.source === "auto" ? "Untick (it ticks again if you solve it again)" : "Untick"}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button
      variant="ghost"
      size="sm"
      aria-pressed={false}
      aria-label={`${LABELS.iSolvedIt}: ${p.title}`}
      disabled={tick.isPending}
      onClick={() => {
        onTick(p.key);
        tick.mutate({ problem: p, done: true });
      }}
      className="w-32 shrink-0"
    >
      {LABELS.iSolvedIt}
    </Button>
  );
}

function Row({ pick, sheetCount, status, onTick }: { pick: MustDoPick; sheetCount: number; status: ProblemStatus; onTick: (key: string) => void }) {
  const p = pick.problem;
  return (
    <li className="flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
      <DifficultyChip p={p} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate text-body", status.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
          {pick.reason === "video" && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-px text-label font-semibold text-ink">{LABELS.solvedInVideo}</span>
          )}
          {p.premium && <span className="shrink-0 rounded-full border border-glass-border px-2 py-px text-label text-ink-muted">Premium</span>}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
          <span className="truncate">
            {siteOf(p)}
            {why(p, sheetCount) && <> · {why(p, sheetCount)}</>}
          </span>
        </span>
      </span>
      <SolvedButton p={p} status={status} onTick={onTick} />
      <OpenButton problem={p} withSite className="w-44" />
    </li>
  );
}

/**
 * "Practice this" (v1.6): after a video, a few must-do problems for its topic, easy to hard (the
 * problem the video solves first). Each row: difficulty chip, title, where it's solved and why it's
 * here ("On 4 of 5 popular sheets"), I solved it (the sheets' tick) and Open. Marking the video
 * watched pulses the card and brings it into view. An honest empty state when the topic is unknown
 * or the sheets have nothing left for it.
 */
export function PracticeThis({
  videoTitle,
  topic: topicProp,
  filed,
  watched,
  exclude,
  title = LABELS.practiceThis,
  subtitle,
  actions,
  className,
}: {
  videoTitle: string;
  /** The video's topic (partTopics), or null when it names none. */
  topic?: string | null;
  /** Or the topics it's filed under (a lesson's), to work the topic out from its title (videoTopic). */
  filed?: readonly string[];
  /** The video is marked watched: turning true pulses the card. */
  watched: boolean;
  /** Problems already listed on the screen (a lesson's own). */
  exclude?: ReadonlySet<string>;
  title?: string;
  subtitle?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  const pool = useProblemPool().data;
  const idx = useSolveIndex().data;
  // Rows ticked here stay put (shown as solved) until the video changes.
  const [keep, setKeep] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => setKeep(new Set()), [videoTitle]);
  const status = (key: string): ProblemStatus => (idx ? problemStatus(key, idx) : { done: false, source: null, at: null });
  const named = useMemo(() => (pool ? namedProblem(videoTitle, pool) : null), [pool, videoTitle]);
  const topic = topicProp !== undefined ? topicProp : videoTopic(videoTitle, filed ?? [], named);
  const rows = pool && idx ? (topic || named ? mustDo(pool, topic ?? "", (k) => problemStatus(k, idx).done, { named, keep, exclude }) : []) : null;

  // "I've watched it": a short aura pulse on the card, scrolled into view.
  const ref = useRef<HTMLElement>(null);
  const was = useRef(watched);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (watched && !was.current && ref.current) {
      setPulse(true);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      ref.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "nearest" });
    }
    was.current = watched;
  }, [watched]);
  useEffect(() => {
    was.current = watched;
    setPulse(false);
  }, [videoTitle]); // eslint-disable-line react-hooks/exhaustive-deps

  const topicWords = topic ? topicName(topic).toLowerCase() : null;
  const description = !rows
    ? "Loading problems from the popular sheets…"
    : rows.length === 0
      ? undefined
      : topicWords
        ? `Problems on ${topicWords} that the popular sheets agree on, easy to hard.`
        : "The problem this video solves.";
  const solved = rows ? rows.filter((r) => status(r.problem.key).done).length : 0;

  return (
    <section
      ref={ref}
      aria-labelledby="practice-this-title"
      onAnimationEnd={() => setPulse(false)}
      className={cn("glass-card flex scroll-mt-4 flex-col gap-3 p-6", pulse && "aura-pulse", className)}
    >
      <CardHeader
        id="practice-this-title"
        title={title}
        description={
          <>
            {subtitle && <span className="block text-ink">{subtitle}</span>}
            {description}
          </>
        }
        pill={rows && rows.length > 0 ? `${solved} of ${rows.length} solved` : undefined}
        actions={actions}
      />
      {rows && rows.length > 0 && (
        <ul className="-mx-3 flex flex-col">
          {rows.map((r) => (
            <Row
              key={r.problem.key}
              pick={r}
              sheetCount={pool!.sheetCount}
              status={status(r.problem.key)}
              onTick={(k) => setKeep((s) => new Set(s).add(k))}
            />
          ))}
        </ul>
      )}
      {rows && rows.length === 0 && (
        <div className="flex items-start gap-3 rounded-md bg-abyss-sunken p-4">
          <Dumbbell aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
          <p className="text-body-sm text-ink-muted">
            {topic ? (
              <>
                The popular sheets have no {topicWords} problems left for you here: you've solved them, or the sheets barely cover this topic.{" "}
                <Link to="/practice" className="text-ink underline decoration-glass-border-strong underline-offset-4">
                  Find more in Practice
                </Link>
              </>
            ) : (
              <>
                This video doesn't name one topic, so there's nothing to suggest for it yet. Pick a topic in{" "}
                <Link to="/learn" className="text-ink underline decoration-glass-border-strong underline-offset-4">
                  Learn
                </Link>{" "}
                or a list in{" "}
                <Link to="/practice/sheets" className="text-ink underline decoration-glass-border-strong underline-offset-4">
                  Sheets
                </Link>
                .
              </>
            )}
          </p>
        </div>
      )}
    </section>
  );
}
