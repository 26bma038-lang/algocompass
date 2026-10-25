import { useState } from "react";
import { Check, ChevronDown, ChevronRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { lessonPath } from "@/components/shell/nav";
import { stepLabel } from "@/components/shell/topBarItems";
import { usePath } from "@/data/path";
import { PATH_SHEET_ID, useSheets, useSolveIndex } from "@/data/sheets";
import { lessonProblems, type LessonProblemStep } from "@/engine/path";
import { problemStatus, type SolveIndex } from "@/engine/sheets";
import { LessonProblemRow } from "@/features/path/LessonProblemRow";
import { sheetPath } from "@/features/sheets/paths";
import { LABELS } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/** One reached step: its problems, open for the current step and folded for done ones. */
function StepBlock({ s, idx, isDone, nextKey }: { s: LessonProblemStep; idx: SolveIndex | undefined; isDone: (k: string) => boolean; nextKey: string | null }) {
  const [open, setOpen] = useState(s.state === "current");
  const listId = `lesson-step-${s.step.id}`;
  return (
    <section aria-labelledby={`${listId}-title`} className="flex flex-col gap-1 border-t border-glass-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={`${listId}-title`} className="min-w-0">
          <button type="button" aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)} className="flex items-center gap-3 rounded-xs text-left">
            <span
              className={cn(
                "numeric grid size-8 shrink-0 place-items-center rounded-sm font-display text-body font-semibold",
                s.state === "done" ? "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success" : "bg-accent-soft text-ink",
              )}
            >
              {s.state === "done" ? <Check aria-hidden className="size-4" strokeWidth={2.6} /> : s.index + 1}
            </span>
            <span className="flex flex-col">
              <span className="text-title font-semibold text-ink">
                Step {s.index + 1}: {s.step.title}
              </span>
              <span className="numeric text-label text-ink-muted">
                {s.state === "done" ? "Step done" : "You're here"}, {s.solved} of {s.problems.length} solved
              </span>
            </span>
            <ChevronDown aria-hidden className={cn("size-4 text-ink-muted transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} />
          </button>
        </h3>
        <Link to={lessonPath(s.step.id)} className="ml-auto rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
          Open the lesson
        </Link>
      </div>
      {open && (
        <ul id={listId} className="-mx-3 flex flex-col pt-1">
          {s.problems.map(({ problem: p }) => (
            <LessonProblemRow
              key={p.key}
              p={p}
              status={idx ? problemStatus(p.key, idx) : { done: isDone(p.key), source: null, at: null }}
              next={p.key === nextKey}
              primaryOpen={p.key === nextKey}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

/**
 * "Follow a popular sheet" (v1.4): a quiet card under the lesson problems. Sheets stay one click
 * away (never locked), smallest first, but nothing here competes with the next lesson problem.
 */
function FollowSheetCard() {
  const sheets = useSheets().data;
  const list = (sheets ?? []).filter((v) => v.sheet.id !== PATH_SHEET_ID).sort((a, b) => a.progress.total - b.progress.total);
  return (
    <section aria-labelledby="follow-sheet-title" className="glass-card col-span-12 flex flex-col gap-4 p-6 lg:col-span-8">
      <div className="flex max-w-[62ch] flex-col gap-1">
        <h2 id="follow-sheet-title" className="text-title font-semibold text-ink">
          {LABELS.followSheet}
        </h2>
        <p className="text-body-sm text-ink-muted">
          Bigger problem lists from well-known teachers, for after the Beginner Path or alongside it. They tick themselves from your LeetCode solves too.
          Smallest first.
        </p>
      </div>
      <ul className="-mx-3 flex flex-col">
        {list.map((v) => (
          <li key={v.sheet.id}>
            <Link
              to={sheetPath(v.sheet.id)}
              className="flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
            >
              <ListChecks aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body text-ink">{v.sheet.name}</span>
                <span className="text-label text-ink-muted">Sheet by {v.sheet.creator}</span>
              </span>
              <span className="numeric shrink-0 text-body-sm text-ink-muted">
                {v.progress.total} problems{v.progress.done > 0 ? `, ${v.progress.done} done` : ""}
              </span>
              <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
            </Link>
          </li>
        ))}
      </ul>
      <Link to="/practice/sheets" className="self-start rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
        See all sheets, with your progress
      </Link>
    </section>
  );
}

/**
 * Practice in Beginner mode (v1.4): "Problems from your lessons" first, the problems of every step
 * you've reached, in order, with the next one's Open as the one primary button. Then the popular
 * sheets, as a clearly secondary card.
 */
export function LessonProblems() {
  const path = usePath();
  const idx = useSolveIndex().data;
  if (path.isLoading || !path.data) return <p className="text-body-sm text-ink-muted">Loading your lessons…</p>;
  const view = path.data;
  const isDone = (k: string) => (idx ? problemStatus(k, idx).done : view.isDone(k));
  const list = lessonProblems(view, isDone);
  const total = view.steps.length;
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <section aria-labelledby="lesson-problems-title" className="glass-card col-span-12 flex flex-col gap-5 p-6">
        <CardHeader
          id="lesson-problems-title"
          title={LABELS.lessonProblems}
          description="Every problem from the steps you've reached, in order. Solve one on LeetCode, then tick it here (or connect LeetCode in a lesson and it ticks itself)."
          pill={`${list.solved} of ${list.total} solved`}
          actions={<span className="numeric text-body-sm font-semibold text-ink">{stepLabel(view.current, total)}</span>}
        />
        <div className="flex flex-col gap-4">
          {list.steps.map((s) => (
            <StepBlock key={s.step.id} s={s} idx={idx} isDone={isDone} nextKey={list.next?.key ?? null} />
          ))}
        </div>
        {list.lockedFrom !== null && (
          <p className="rounded-md border border-dashed border-glass-border-strong px-4 py-3 text-body-sm text-ink-muted">
            Problems from {list.lockedFrom + 1 === total ? `step ${total}` : `steps ${list.lockedFrom + 1} to ${total}`} join this list as you reach them.
          </p>
        )}
      </section>
      <FollowSheetCard />
    </div>
  );
}
