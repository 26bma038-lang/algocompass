import { HelpCircle, MoreHorizontal, NotebookPen } from "lucide-react";
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

/**
 * "Stuck?": the ? icon with a tooltip and a full aria-label, on every row (v1.8: Practice rows
 * showed the word, five times a screen). `compact` is the smaller size for tight rows.
 */
export function StuckButton({ problem, compact = false, className }: { problem: ProblemRef; compact?: boolean; className?: string }) {
  const open = useUiStore((s) => s.openTool);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => open("stuck", problem)}
          aria-label={`${LABELS.stuck} ${problem.title}`}
          className={cn(
            "grid shrink-0 place-items-center text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink",
            compact ? "size-7 rounded-xs" : "size-8 rounded-sm",
            className,
          )}
        >
          <HelpCircle aria-hidden className={compact ? "size-3.5" : "size-4"} />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top">{LABELS.stuck}</TooltipContent>
    </Tooltip>
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
