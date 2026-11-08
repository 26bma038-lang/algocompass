import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Check, Dumbbell } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useCfProblemset, useCfRating } from "@/data/cfProblemset";
import { useProblemPool } from "@/data/mustDo";
import { usePrefs } from "@/data/prefs";
import { openTarget, useSolveIndex, useTickProblem } from "@/data/sheets";
import { cfKey, cfSharpen, sharpenCount, sharpenWindow } from "@/engine/cfSharpen";
import { difficultyRank, mustDo, namedProblem, topicProblemCount, videoTopic, type MustDoPick, type PoolProblem } from "@/engine/mustDo";
import { problemStatus, type ProblemStatus, type SheetProblem } from "@/engine/sheets";
import { TOPIC_BY_ID } from "@/engine/topics";
import type { CfProblem } from "@/data/types";
import { OpenButton, topicName } from "@/features/sheets/parts";
import { LABELS, onSheets, solvedBy } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** 1 to 3 bars for Easy, Medium, Hard (a Codeforces rating by its band); none when no one rates it. */
function DifficultyChip({ p }: { p: Pick<SheetProblem, "difficulty" | "difficultyFrom" | "rating"> }) {
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
function SolvedButton({ p, status, onTick }: { p: SheetProblem; status: ProblemStatus; onTick: (key: string) => void }) {
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

/** A Codeforces problem as a sheet problem, so Open, the chip and I solved it work the same (key "cf:<id>"). */
function asSheetProblem(p: CfProblem, topic: string): SheetProblem {
  return { key: cfKey(p), title: p.name, difficulty: null, rating: p.rating, topics: [topic], cf: p.key };
}

/** A "Sharpen on Codeforces" row: rating chip, name, "Codeforces · Solved by 40k", I solved it, Open on Codeforces. */
function CfRow({ p, solvedCount, status, onTick }: { p: SheetProblem; solvedCount: number | null; status: ProblemStatus; onTick: (key: string) => void }) {
  return (
    <li className="flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
      <DifficultyChip p={p} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-body", status.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
        <span className="flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
          <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ink-faint" />
          <span className="truncate">
            Codeforces{solvedCount ? <> · {solvedBy(solvedCount)}</> : null}
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
 * watched pulses the card and brings it into view. Then "Sharpen on Codeforces": two real
 * Codeforces problems for the topic at your level (more when the sheets barely cover it). An honest
 * empty state when the topic is unknown or nothing is left for it.
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

  // Sharpen on Codeforces: your rating's window (800 to 1200 with none, or in Beginner mode).
  const cf = useCfProblemset().data;
  const rating = useCfRating().data ?? null;
  const beginner = usePrefs().data?.mode === "beginner";
  const cfWindow = sharpenWindow(rating, beginner);
  const thin = !!(pool && topic && topicProblemCount(pool, topic) < 3);
  const cfRows =
    rows && cf && idx && topic
      ? cfSharpen(cf.problems, topic, cfWindow, (k) => problemStatus(k, idx).done, sharpenCount(rows.length, pool ? topicProblemCount(pool, topic) : 0), {
          keep,
          exclude: new Set([...rows.map((r) => r.problem.key), ...(exclude ?? [])]),
        })
      : [];
  // Codeforces has tags for this topic, but the list couldn't load (offline, never fetched).
  const cfMissing = !!(topic && (TOPIC_BY_ID.get(topic)?.cfTags.length ?? 0) > 0 && cf && !cf.problems.length && cf.error);

  // "I've watched it": a short aura pulse on the card, scrolled into view.
  const ref = useRef<HTMLElement>(null);
  const was = useRef(watched);
  const [pulse, setPulse] = useState(false);
  useEffect(() => {
    if (watched && !was.current && ref.current) {
      setPulse(true);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      // The card's top at the top of the view, so its header and first rows show without scrolling.
      ref.current.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
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
      ? cfRows.length && topicWords
        ? `The popular sheets barely cover ${topicWords}, so these are from Codeforces.`
        : undefined
      : topicWords
        ? thin
          ? `The popular sheets barely cover ${topicWords}, so Codeforces fills in.`
          : `The popular sheets' picks for ${topicWords}, easy to hard.`
        : "The problem this video solves.";
  const total = (rows?.length ?? 0) + cfRows.length;
  const solved = (rows ?? []).filter((r) => status(r.problem.key).done).length + cfRows.filter((p) => status(cfKey(p)).done).length;
  const tick = (k: string) => setKeep((s) => new Set(s).add(k));

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
        pill={total > 0 ? `${solved} of ${total} solved` : undefined}
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
              onTick={tick}
            />
          ))}
        </ul>
      )}
      {cfRows.length > 0 && (
        <div className={cn("flex flex-col gap-1", rows && rows.length > 0 && "border-t border-glass-border pt-3")}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
            <h3 className="text-body font-semibold text-ink">{LABELS.sharpenOnCf}</h3>
            <p className="numeric text-label text-ink-muted">
              Difficulty {cfWindow.lo} to {cfWindow.hi}
              {rating === null || beginner ? ", Codeforces' easiest" : ", around your rating"}, most solved first
              {cf?.stale ? ". From the saved list (Codeforces couldn't be reached)" : ""}
            </p>
          </div>
          <ul className="-mx-3 flex flex-col">
            {cfRows.map((p) => {
              const sp = asSheetProblem(p, topic!);
              return <CfRow key={sp.key} p={sp} solvedCount={p.solvedCount} status={status(sp.key)} onTick={tick} />;
            })}
          </ul>
        </div>
      )}
      {cfMissing && rows && rows.length > 0 && (
        <p className="text-label text-ink-muted">Codeforces problems for this topic show once the app can reach Codeforces.</p>
      )}
      {rows && rows.length === 0 && cfRows.length === 0 && (
        <div className="flex items-start gap-3 rounded-md bg-abyss-sunken p-4">
          <Dumbbell aria-hidden className="mt-0.5 size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
          <p className="text-body-sm text-ink-muted">
            {topic ? (
              <>
                {cfMissing
                  ? `The popular sheets have nothing left on ${topicWords} for you, and Codeforces couldn't be reached to fill in. Its problems show once the app can reach it again.`
                  : `The popular sheets and Codeforces have nothing left on ${topicWords} for you here.`}{" "}
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
