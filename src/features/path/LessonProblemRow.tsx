import { Check } from "lucide-react";
import { Term } from "@/components/Term";
import type { PathProblem } from "@/engine/path";
import type { ProblemStatus } from "@/engine/sheets";
import { RowTools } from "@/components/practice/ProblemTools";
import { openTarget } from "@/data/sheets";
import { refFromSheet } from "@/engine/problemRef";
import { OpenButton, sourceLabel, TickBox } from "@/features/sheets/parts";
import { LABELS } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * One Beginner Path problem: tick box, title, where it's solved (or how it was ticked), required or
 * extra practice, difficulty in words, and Open. Shared by the lesson's Solve part and Practice's
 * "Problems from your lessons" (v1.4). `next` marks the problem to do now: a sunken fill and, when
 * `primaryOpen`, the screen's one primary Open.
 */
export function LessonProblemRow({ p, status, next = false, primaryOpen = false }: { p: PathProblem; status: ProblemStatus; next?: boolean; primaryOpen?: boolean }) {
  return (
    <li
      aria-current={next ? "step" : undefined}
      className={cn("flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover", next && "bg-abyss-sunken")}
    >
      <TickBox problem={p} status={status} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate text-body", status.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
          {primaryOpen && !status.done && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-px text-label font-semibold text-ink">{LABELS.recommendedNext}</span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-label text-ink-muted">
          {status.done ? (
            <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
          ) : (
            <span aria-hidden className="size-1.5 rounded-full bg-ink-faint" />
          )}
          <span>
            <span className={status.done ? "text-ink" : undefined}>{status.done ? sourceLabel(p, status) : p.cf ? "Codeforces" : "LeetCode"}</span>
            {p.required ? ", required" : ", extra practice"}
          </span>
        </span>
      </span>
      <span className="w-24 shrink-0 text-right text-body-sm text-ink-muted">
        {p.difficulty ??
          (p.rating ? (
            <>
              <Term id="difficulty">difficulty</Term> <span className="numeric">{p.rating}</span>
            </>
          ) : null)}
      </span>
      <OpenButton problem={p} variant={primaryOpen ? "primary" : "outline"} withSite className="w-44" />
      <RowTools problem={refFromSheet(p, openTarget(p)?.url ?? null)} done={status.done} />
    </li>
  );
}
