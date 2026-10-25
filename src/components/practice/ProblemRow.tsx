import { Check, ExternalLink, MoreHorizontal } from "lucide-react";
import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { LC_LISTS } from "@/data/catalog";
import { useMarkSolved } from "@/data/quests";
import { useRecFeedback } from "@/data/recommendations";
import { useUiStore } from "@/data/uiStore";
import type { FeedbackKind } from "@/data/types";
import type { Rec, UpsolveRec } from "@/engine/recommender";
import { verdictLabel } from "@/engine/topicProblems";
import { TOPIC_BY_ID } from "@/engine/topics";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { plainTopicName } from "@/lib/glossary";

export type RowProblem = Rec | UpsolveRec;

const monthYear = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function title(p: RowProblem) {
  return p.platform === "lc" ? p.title : p.name;
}

function url(p: RowProblem): string | null {
  return p.platform === "lc" ? lcProblemUrl(p.id) : cfProblemUrl(p.contestId, p.index);
}

/** What the row's second line says: where the problem comes from, in plain words. */
function meta(p: RowProblem): string {
  if (p.platform === "lc") {
    const list = LC_LISTS[p.list]?.name ?? "Curated";
    const topic = TOPIC_BY_ID.get(p.topicId)?.name.toLowerCase();
    return p.onPath && topic ? `Step ${p.order} of the ${topic} path, ${list}` : list;
  }
  if ("attempts" in p) {
    if (p.attempts === 0) return `Unsolved in ${p.fromContest ?? "a contest you took part in"}`;
    return `${plural(p.attempts, "try", "tries")}, last ${verdictLabel(p.lastVerdict).toLowerCase()}, ${monthYear(p.lastAttemptAt)}`;
  }
  return p.contestStart ? `From a ${monthYear(p.contestStart)} round` : `Contest ${p.contestId}`;
}

/** The number column: a Codeforces rating in the stat-plate face, or LeetCode's difficulty. */
function Grade({ p }: { p: RowProblem }) {
  if (p.platform === "lc") return <span className="w-14 shrink-0 text-right text-body-sm text-ink-muted">{p.difficulty}</span>;
  return (
    <span className="numeric w-14 shrink-0 text-right font-display text-body font-semibold text-ink">
      {p.rating ?? <span className="font-sans text-body-sm font-normal text-ink-faint">Unrated</span>}
    </span>
  );
}

const FEEDBACK: { kind: FeedbackKind; label: string; hint: (p: RowProblem) => string }[] = [
  { kind: "skip", label: "Skip", hint: (p) => (p.platform === "lc" ? "Hide it without marking it solved" : "Hide it. Use this for problems you've already solved, too.") },
  { kind: "too_easy", label: "Too easy", hint: (p) => (p.platform === "cf" ? "Hide it and raise this topic's range by 100" : "Hide it and serve harder problems for this topic") },
  { kind: "too_hard", label: "Too hard", hint: (p) => (p.platform === "cf" ? "Hide it and lower this topic's range by 100" : "Hide it and serve easier problems for this topic") },
];


/**
 * The row's "⋯" menu (v1.4): I solved it (LeetCode, which only shares your 20 latest solves), Skip,
 * Too easy and Too hard, each with what it does. One small button instead of four text buttons.
 */
function RowMenu({ p, topicId, kinds }: { p: RowProblem; topicId: string; kinds: FeedbackKind[] }) {
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
function TopicChips({ p, max = 2 }: { p: RowProblem; max?: number }) {
  const openTopic = useUiStore((s) => s.openTopic);
  const lead = "topicId" in p ? p.topicId : undefined;
  const ids = [...new Set([...(lead ? [lead] : []), ...p.topics])].slice(0, max);
  return (
    <span className="flex shrink-0 items-center gap-1">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          onClick={() => openTopic(id)}
          className="h-6 max-w-[160px] truncate rounded-full border border-glass-border bg-glass px-2.5 text-label text-ink-muted transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:text-ink"
        >
          {plainTopicName(id, TOPIC_BY_ID.get(id)?.name ?? id)}
        </button>
      ))}
    </span>
  );
}
/**
 * One recommended problem. `comfortable` (Practice) shows topic chips and an Open button;
 * `compact` (Topic Detail, Unfinished problems) has an icon Open to fit 440px. Skip, Too easy, Too
 * hard and I solved it live in the row's "⋯" menu (v1.4). `primary` fills Open: the one row on the
 * screen that's the next thing to do. Feedback goes to the topic the problem was recommended for.
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
  const name = title(p);
  const site = p.platform === "cf" ? "Codeforces" : "LeetCode";
  const topicId = "topicId" in p ? p.topicId : (p.topics[0] ?? "implementation");
  const compact = density === "compact";
  const open = href ? () => openExternal(href) : undefined;

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-sm transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover",
        compact ? "px-2 py-1.5" : "px-3 py-2",
        primary && "bg-abyss-sunken",
      )}
    >
      <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", p.platform === "cf" ? "bg-platform-cf" : "bg-platform-lc", done && "opacity-50")} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate", compact ? "text-body-sm" : "text-body", done ? "text-ink-muted" : "text-ink")}>{name}</span>
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
      </span>
      {!compact && chips && <TopicChips p={p} />}
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
          <Button variant={primary ? "primary" : "outline"} size="sm" onClick={open} aria-label={`Open ${name} on ${site}`} className="shrink-0">
            Open
          </Button>
        ))}
      {!done && <RowMenu p={p} topicId={topicId} kinds={feedback} />}
      {/* Keeps Open aligned on done rows, which have no menu. */}
      {done && !compact && <span aria-hidden className="size-8 shrink-0" />}
    </li>
  );
}

/** For cards that show one problem their own way (Today's Do this next). */
export { meta as problemMeta, title as problemTitle, url as problemUrl };
