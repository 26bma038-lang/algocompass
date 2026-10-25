import { Check } from "lucide-react";
import { Term } from "@/components/Term";
import type { PathProblem } from "@/engine/path";
import type { ProblemStatus } from "@/engine/sheets";
import { OpenButton, sourceLabel, TickBox } from "@/features/sheets/parts";
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
        <span className={cn("truncate text-body", status.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
        <span className="flex items-center gap-1.5 text-label text-ink-muted">
          {status.done ? (
            <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
          ) : (
            <span aria-hidden className={cn("size-1.5 rounded-full", p.cf ? "bg-platform-cf" : "bg-platform-lc")} />
          )}
          <span>
            <span className={status.done ? "text-ink" : undefined}>{status.done ? sourceLabel(p, status) : p.cf ? "Codeforces" : "LeetCode"}</span>
            {p.required ? ", required" : ", extra practice"}
          </span>
        </span>
      </span>
      <span className="shrink-0 text-right text-body-sm text-ink-muted">
        {p.difficulty ??
          (p.rating ? (
            <>
              <Term id="difficulty">difficulty</Term> <span className="numeric">{p.rating}</span>
            </>
          ) : null)}
      </span>
      <OpenButton problem={p} variant={primaryOpen ? "primary" : "outline"} />
    </li>
  );
}
