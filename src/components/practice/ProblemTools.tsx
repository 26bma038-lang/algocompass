import { HelpCircle, MoreHorizontal, NotebookPen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/data/uiStore";
import type { ProblemRef } from "@/engine/problemRef";
import { LABELS } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * The two per-problem tools (v1.7), as buttons any problem row can drop in. They only open the
 * panels mounted once in the app shell (ProblemPanels), so rows stay light.
 */

/** "Stuck?": a visible button on the row (an icon with a tooltip in tight rows). */
export function StuckButton({ problem, compact = false, className }: { problem: ProblemRef; compact?: boolean; className?: string }) {
  const open = useUiStore((s) => s.openTool);
  if (compact) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => open("stuck", problem)}
            aria-label={`${LABELS.stuck} ${problem.title}`}
            className={cn("grid size-7 shrink-0 place-items-center rounded-xs text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink", className)}
          >
            <HelpCircle aria-hidden className="size-3.5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="top">{LABELS.stuck}</TooltipContent>
      </Tooltip>
    );
  }
  return (
    <Button variant="ghost" size="sm" onClick={() => open("stuck", problem)} aria-label={`${LABELS.stuck} ${problem.title}`} className={className}>
      <HelpCircle aria-hidden />
      {LABELS.stuck}
    </Button>
  );
}

/** A small note button for rows with no ⋯ menu (a solved row: "why I got WA" is worth keeping). */
export function NoteButton({ problem, hasNote = false }: { problem: ProblemRef; hasNote?: boolean }) {
  const open = useUiStore((s) => s.openTool);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => open("note", problem)}
          aria-label={hasNote ? `Edit your note on ${problem.title}` : `Add a note to ${problem.title}`}
          className={cn("grid size-8 shrink-0 place-items-center rounded-sm transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink", hasNote ? "text-accent" : "text-ink-muted")}
        >
          <NotebookPen aria-hidden className="size-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{hasNote ? LABELS.yourNote : LABELS.addNote}</TooltipContent>
    </Tooltip>
  );
}

/** The ⋯ menu's two items: the note and Stuck?. */
export function ProblemToolItems({ problem }: { problem: ProblemRef }) {
  const open = useUiStore((s) => s.openTool);
  return (
    <>
      <DropdownMenuItem onSelect={() => open("note", problem)}>
        <span className="font-medium">{LABELS.addNote}</span>
        <span className="text-label text-ink-muted">Why it went wrong, the key idea. Private, on this computer.</span>
      </DropdownMenuItem>
      <DropdownMenuItem onSelect={() => open("stuck", problem)}>
        <span className="font-medium">{LABELS.stuck}</span>
        <span className="text-label text-ink-muted">Help in small steps, one click each</span>
      </DropdownMenuItem>
    </>
  );
}

/**
 * For sheet-style rows with no ⋯ menu of their own (lesson problems, Practice this, sheets): a
 * Stuck? icon while it's unsolved, and a ⋯ with the note and Stuck?.
 */
export function RowTools({ problem, done = false, menu = true }: { problem: ProblemRef; done?: boolean; menu?: boolean }) {
  return (
    <>
      {!done && <StuckButton problem={problem} compact />}
      {menu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`More for ${problem.title}`}
              className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink data-[state=open]:bg-glass-hover data-[state=open]:text-ink"
            >
              <MoreHorizontal aria-hidden className="size-4" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <ProblemToolItems problem={problem} />
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </>
  );
}
