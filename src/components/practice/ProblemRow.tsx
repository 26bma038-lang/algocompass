import { lazy, Suspense } from "react";
import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useUiStore } from "@/data/uiStore";
import type { FeedbackKind } from "@/data/types";
import { TOPIC_BY_ID } from "@/engine/topics";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { LABELS, plainTopicName } from "@/lib/glossary";
import { refFromRec } from "@/engine/problemRef";
import { meta, openLabel, siteName, title, url, type RowProblem } from "./problemText";
import { NoteButton, StuckButton } from "./ProblemTools";

export type { RowProblem };

// The "⋯" menu loads on first use, so the dropdown stays out of the main chunk (the Topic panel is in it).
const RowMenu = lazy(() => import("./RowMenu").then((m) => ({ default: m.RowMenu })));

/** The number column: a Codeforces rating in the stat-plate face, or LeetCode's difficulty. */
function Grade({ p }: { p: RowProblem }) {
  if (p.platform === "lc") return <span className="w-14 shrink-0 text-right text-body-sm text-ink-muted">{p.difficulty}</span>;
  return (
    <span className="numeric w-14 shrink-0 text-right font-display text-body font-semibold text-ink">
      {p.rating ?? <span className="font-sans text-body-sm font-normal text-ink-faint">Unrated</span>}
    </span>
  );
}

/** Topic chips under the title (v1.4 polish): full names that wrap onto another line, never cut off. */
function TopicChips({ p, max = 2 }: { p: RowProblem; max?: number }) {
  const openTopic = useUiStore((s) => s.openTopic);
  const lead = "topicId" in p ? p.topicId : undefined;
  const ids = [...new Set([...(lead ? [lead] : []), ...p.topics])].slice(0, max);
  return (
    <span className="mt-1.5 flex flex-wrap items-center gap-1">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => openTopic(id)}
          className="min-h-6 rounded-full border border-glass-border bg-glass px-2.5 py-0.5 text-left text-label text-ink-muted transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:text-ink"
        >
          {plainTopicName(id, TOPIC_BY_ID.get(id)?.name ?? id)}
        </button>
      ))}
    </span>
  );
}
/**
 * One recommended problem. `comfortable` (Practice) shows topic chips and an Open button;
 * `compact` (Topic Detail, Problems you tried) has an icon Open to fit 440px. Skip, Too easy, Too
 * hard and I solved it live in the row's "⋯" menu (v1.4). `primary` fills Open: the one row on the
 * screen that's the next thing to do, tagged "Recommended next" (v1.4 polish). Feedback goes to the
 * topic the problem was recommended for. Columns are fixed (difficulty 56px, Open 176px, menu 32px),
 * so rows line up whatever the title or chips.
 */
export function ProblemRow({
  p,
  density = "comfortable",
  done = false,
  feedback = ["skip", "too_easy", "too_hard"],
  chips = true,
  primary = false,
}: {
  p: RowProblem;
  density?: "comfortable" | "compact";
  done?: boolean;
  feedback?: FeedbackKind[];
  chips?: boolean;
  primary?: boolean;
}) {
  const href = url(p);
  const ref = refFromRec(p, href);
  const name = title(p);
  const site = siteName(p.platform);
  const topicId = "topicId" in p ? p.topicId : (p.topics[0] ?? "implementation");
  const compact = density === "compact";
  const open = href ? () => openExternal(href) : undefined;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-sm transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover",
        compact ? "px-2 py-1.5" : "px-3 py-2.5",
        primary && "bg-abyss-sunken",
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full bg-ink-faint", done && "opacity-50")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("truncate", compact ? "text-body-sm" : "text-body", done ? "text-ink-muted" : "text-ink")}>{name}</span>
          {primary && !done && (
            <span className="shrink-0 rounded-full bg-accent-soft px-2 py-px text-label font-semibold text-ink">{LABELS.recommendedNext}</span>
          )}
        </span>
        <span className="flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
          {done && (
            <>
              <Check aria-hidden className="size-3.5 shrink-0 text-success" strokeWidth={2.4} />
              <span className="text-ink">Solved</span>
              <span aria-hidden>,</span>
            </>
          )}
          <span className="min-w-0 flex-1 truncate">{meta(p)}</span>
        </span>
        {!compact && chips && <TopicChips p={p} />}
      </span>
      <Grade p={p} />
      {open &&
        (compact ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={open}
                aria-label={`Open ${name} on ${site}`}
                className="grid size-7 shrink-0 place-items-center rounded-xs text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
              >
                <ExternalLink aria-hidden className="size-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="top">Open on {site}</TooltipContent>
          </Tooltip>
        ) : (
          <Button variant={primary ? "primary" : "outline"} size="sm" onClick={open} aria-label={`Open ${name} on ${site}`} className="w-44 shrink-0">
            {openLabel(site)}
          </Button>
        ))}
      {!done && <StuckButton problem={ref} compact={compact} />}
      {!done && (
        <Suspense fallback={<span aria-hidden className="size-8 shrink-0" />}>
          <RowMenu p={p} topicId={topicId} kinds={feedback} />
        </Suspense>
      )}
      {/* Done rows: no Stuck? or menu, but a note is still worth keeping; the slots stay so Open stays aligned. */}
      {done && !compact && <span aria-hidden className="size-8 shrink-0" />}
      {done && <NoteButton problem={ref} />}
    </li>
  );
}

