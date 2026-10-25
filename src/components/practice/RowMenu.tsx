import { MoreHorizontal } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useMarkSolved } from "@/data/quests";
import { useRecFeedback } from "@/data/recommendations";
import type { FeedbackKind } from "@/data/types";
import { title, type RowProblem } from "./problemText";

const FEEDBACK: { kind: FeedbackKind; label: string; hint: (p: RowProblem) => string }[] = [
  { kind: "skip", label: "Skip", hint: (p) => (p.platform === "lc" ? "Hide it without marking it solved" : "Hide it. Use this for problems you've already solved, too.") },
  { kind: "too_easy", label: "Too easy", hint: (p) => (p.platform === "cf" ? "Hide it and raise this topic's range by 100" : "Hide it and serve harder problems for this topic") },
  { kind: "too_hard", label: "Too hard", hint: (p) => (p.platform === "cf" ? "Hide it and lower this topic's range by 100" : "Hide it and serve easier problems for this topic") },
];


/**
 * The row's "⋯" menu (v1.4): I solved it (LeetCode, which only shares your 20 latest solves), Skip,
 * Too easy and Too hard, each with what it does. One small button instead of four text buttons.
 */
export function RowMenu({ p, topicId, kinds }: { p: RowProblem; topicId: string; kinds: FeedbackKind[] }) {
  const feedback = useRecFeedback();
  const mark = useMarkSolved();
  const items = FEEDBACK.filter((f) => kinds.includes(f.kind));
  if (p.platform !== "lc" && items.length === 0) return null;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`More for ${title(p)}`}
          className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink data-[state=open]:bg-glass-hover data-[state=open]:text-ink"
        >
          <MoreHorizontal aria-hidden className="size-4" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {p.platform === "lc" && (
          <>
            <DropdownMenuItem disabled={mark.isPending} onSelect={() => mark.mutate({ platform: "lc", problemId: p.id, title: title(p), topicId })}>
              <span className="font-medium">I solved it</span>
              <span className="text-label text-ink-muted">LeetCode only shares your 20 latest solves</span>
            </DropdownMenuItem>
            {items.length > 0 && <DropdownMenuSeparator />}
          </>
        )}
        {items.map((f) => (
          <DropdownMenuItem
            key={f.kind}
            disabled={feedback.isPending}
            onSelect={() => feedback.mutate({ platform: p.platform, problemId: p.id, topicId, kind: f.kind, label: title(p) })}
          >
            <span className="font-medium">{f.label}</span>
            <span className="text-label text-ink-muted">{f.hint(p)}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
