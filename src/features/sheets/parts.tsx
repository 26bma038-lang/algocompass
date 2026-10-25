import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUpdatePrefs } from "@/data/prefs";
import { openTarget, PATH_SHEET_ID, useTickProblem } from "@/data/sheets";
import type { NextPick, ProblemStatus, Sheet, SheetProblem } from "@/engine/sheets";
import { TOPIC_BY_ID } from "@/engine/topics";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { LABELS, plainTopicName } from "@/lib/glossary";
import { stepLabel } from "@/components/shell/topBarItems";
import { usePath } from "@/data/path";

/** "Sheet by <creator>", linking the original. Shown on every sheet. The Beginner Path is built in: no link out. */
export function SheetCredit({ sheet, className }: { sheet: Pick<Sheet, "id" | "creator" | "sourceUrl" | "name">; className?: string }) {
  if (sheet.id === PATH_SHEET_ID) {
    return <span className={cn("self-start text-body-sm text-ink-muted", className)}>Built into AlgoCompass: lessons with videos</span>;
  }
  return (
    <button
      type="button"
      onClick={() => openExternal(sheet.sourceUrl)}
      className={cn(
        "inline-flex max-w-full min-w-0 items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink",
        className,
      )}
    >
      <span className="truncate">Sheet by {sheet.creator}</span>
      <ExternalLink aria-hidden className="size-3 shrink-0" />
      <span className="sr-only">(opens the original {sheet.name} in your browser)</span>
    </button>
  );
}

/** Where a tick came from, in words (never colour alone). */
export function sourceLabel(p: SheetProblem, s: ProblemStatus): string {
  if (!s.done) return "";
  if (s.source === "auto") return p.key.startsWith("cf:") ? "Solved on Codeforces" : "Solved on LeetCode";
  if (s.source === "bulk") return "Imported";
  return "Ticked by hand";
}

/** One-click tick: a 20px checkbox. Checked = Success fill with a check; the label says what it does. */
export function TickBox({ problem, status }: { problem: SheetProblem; status: ProblemStatus }) {
  const tick = useTickProblem();
  const label = status.done ? `Untick ${problem.title}` : `Mark ${problem.title} solved`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          role="checkbox"
          aria-checked={status.done}
          aria-label={label}
          disabled={tick.isPending}
          onClick={() => tick.mutate({ problem, done: !status.done })}
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-xs border transition-colors duration-[var(--dur-fast)]",
            status.done
              ? "border-success bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success"
              : "border-glass-border-strong bg-abyss-sunken text-transparent hover:border-ink-muted",
          )}
        >
          <Check aria-hidden className="size-3.5" strokeWidth={3} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {status.done ? (status.source === "auto" ? "Untick (it ticks again if you solve it again)" : "Untick") : "Solved it somewhere else? Tick it here"}
      </TooltipContent>
    </Tooltip>
  );
}

/** Open: LeetCode when the problem is there, with the hint that it then ticks itself. */
export function OpenButton({ problem, variant = "outline", label = "Open" }: { problem: SheetProblem; variant?: "outline" | "primary"; label?: string }) {
  const target = openTarget(problem);
  if (!target) {
    return <span className="w-14 shrink-0 text-right text-label text-ink-faint">No link</span>;
  }
  const hint = target.autoTicks
    ? `Solve on ${target.site} to tick automatically`
    : `Opens ${target.site}. Tick it here once you've solved it.`;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant={variant} size="sm" onClick={() => openExternal(target.url)} aria-label={`Open ${problem.title} on ${target.site}`} className="shrink-0">
          {label}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top">
        {hint}
        {problem.premium ? ". LeetCode Premium." : ""}
      </TooltipContent>
    </Tooltip>
  );
}

/** Follow / Unfollow: the followed sheet is pinned first, shows on Today and gives a daily quest. */
export function FollowButton({ sheetId, followed }: { sheetId: string; followed: boolean }) {
  const update = useUpdatePrefs();
  return (
    <Button
      variant={followed ? "ghost" : "outline"}
      size="sm"
      aria-pressed={followed}
      disabled={update.isPending}
      onClick={() => update.mutate({ followedSheet: followed ? null : sheetId })}
    >
      {followed ? (
        <>
          <Check aria-hidden className="text-success" strokeWidth={2.4} />
          Following
        </>
      ) : (
        "Follow this sheet"
      )}
    </Button>
  );
}

export const topicName = (id: string | undefined) => (id ? plainTopicName(id, TOPIC_BY_ID.get(id)?.name ?? id) : "");

/**
 * "Next in this sheet": the problem, where it sits, why it was picked, and Open. A sunken tile.
 * `wide` (v1.4, the sheet page's lead): one row, the words on the left and Open on the right.
 */
export function NextTile({ sheet, next, className, wide = false }: { sheet: Sheet; next: NextPick | null; className?: string; wide?: boolean }) {
  if (!next) {
    return (
      <div className={cn("flex flex-col gap-1 rounded-md bg-abyss-sunken p-4", className)}>
        <span className="text-label text-ink-muted">{LABELS.nextInSheet}</span>
        <span className="flex items-center gap-1.5 text-body text-ink">
          <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
          Every problem is done
        </span>
      </div>
    );
  }
  const p = next.problem;
  const section = sheet.sections[next.sectionIndex];
  const target = openTarget(p);
  const words = (
    <>
      <span className="text-label text-ink-muted">{LABELS.nextInSheet}</span>
      <span className="text-title font-semibold text-ink">{p.title}</span>
      <span className="text-body-sm text-ink-muted">
        {sheet.sectionLabel} {next.sectionIndex + 1}, {section?.title}
        {p.difficulty ? `. ${p.difficulty}` : ""}
        {p.premium ? ". LeetCode Premium" : ""}
      </span>
      {next.weakTopic && (
        <span className="text-body-sm text-ink-muted">Picked for {topicName(next.weakTopic).toLowerCase()}, one of your weaker topics.</span>
      )}
    </>
  );
  if (wide) {
    return (
      <div className={cn("flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md bg-abyss-sunken p-4", className)}>
        <div className="flex min-w-0 flex-col gap-1">{words}</div>
        <div className="flex flex-col items-end gap-1">
          <OpenButton problem={p} variant="primary" label={target ? `Open on ${target.site}` : "Open"} />
          {target?.autoTicks && <span className="text-label text-ink-muted">Solve on {target.site} to tick automatically.</span>}
        </div>
      </div>
    );
  }
  return (
    <div className={cn("flex flex-col gap-2 rounded-md bg-abyss-sunken p-4", className)}>
      {words}
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
        <OpenButton problem={p} variant="primary" label={target ? `Open on ${target.site}` : "Open"} />
        {target?.autoTicks && <span className="text-label text-ink-muted">Solve on {target.site} to tick automatically.</span>}
      </div>
    </div>
  );
}

/**
 * The Beginner Path's progress, counted in steps (v1.4): "Step 3 of 14", never "7/59". Its problems
 * only finish a step together with the video, so a problem count would say something different
 * from Learn's roadmap.
 */
export function PathStepProgress({ size }: { size: "lg" | "sm" }) {
  const view = usePath().data;
  if (!view) return null;
  const total = view.steps.length;
  const label = stepLabel(view.current, total);
  if (size === "sm") {
    return (
      <span className="flex w-24 flex-col items-end">
        <span className="numeric font-display text-body font-semibold whitespace-nowrap text-ink">{label}</span>
        <span className="numeric text-label whitespace-nowrap text-ink-muted">
          {view.doneCount} {view.doneCount === 1 ? "step" : "steps"} done
        </span>
      </span>
    );
  }
  return (
    <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span className="numeric font-display text-display leading-none font-semibold text-ink">{label}</span>
      <span className="numeric text-body-sm text-ink-muted">
        {view.doneCount} of {total} steps done
      </span>
    </p>
  );
}
