import { memo, useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronLeft, ListChecks, NotebookPen, PlayCircle, Search, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { EmptyState } from "@/components/EmptyState";
import { learnTopicPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { RESOURCES } from "@/data/catalog";
import { usePrefs } from "@/data/prefs";
import { isSheetId, useBulkTick, useSaveNote, useSheet, useSheetNotes, type SheetView as View } from "@/data/sheets";
import { useUiStore } from "@/data/uiStore";
import { distinctKeys, sectionKeys, type ProblemStatus, type Sheet, type SheetProblem } from "@/engine/sheets";
import type { LcDifficulty } from "@/data/types";
import { cn } from "@/lib/utils";
import { FollowButton, NextTile, OpenButton, PathStepProgress, SheetCredit, sourceLabel, TickBox, topicName } from "./parts";
import { PATH_SHEET_ID } from "@/data/sheets";
import { SectionStrip } from "./SectionStrip";

type StatusFilter = "all" | "unsolved" | "solved";
const DIFFS: LcDifficulty[] = ["Easy", "Medium", "Hard"];

const fetchedLabel = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { month: "short", year: "numeric" });

/** "I've finished Steps 1–5": tick every problem in a range of sections at once. */
function BulkPanel({ view, onClose }: { view: View; onClose: () => void }) {
  const { sheet, status } = view;
  const id = useId();
  const [from, setFrom] = useState(0);
  const [to, setTo] = useState(0);
  const bulk = useBulkTick();
  const keys = sectionKeys(sheet, from, to);
  const open = keys.filter((k) => !status(k).done).length;
  const label = sheet.sectionLabel;
  const name = (i: number) => `${label} ${i + 1}: ${sheet.sections[i]?.title ?? ""}`;
  const select =
    "h-[38px] min-w-0 rounded-sm border border-glass-border bg-abyss-sunken px-2 text-body text-ink hover:border-glass-border-strong focus-visible:border-accent";
  const range = from === to ? `${label} ${from + 1}` : `${label}s ${Math.min(from, to) + 1}–${Math.max(from, to) + 1}`;
  const box = useRef<HTMLDivElement>(null);
  // It opens under the progress block: bring it into view so the choice is right there.
  useEffect(() => {
    box.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, []);
  return (
    <div ref={box} role="group" aria-labelledby={`${id}-t`} className="flex flex-col gap-3 rounded-md border border-glass-border-strong bg-abyss-sunken p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h3 id={`${id}-t`} className="text-title font-semibold text-ink">
            Mark sections done
          </h3>
          <p className="max-w-[62ch] text-body-sm text-ink-muted">
            Already partway through? Tick every problem in the sections you've finished. Imported ticks don't count as today's solves, and you can
            untick any of them.
          </p>
        </div>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted hover:bg-glass-hover hover:text-ink">
          <X aria-hidden className="size-4" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-body-sm text-ink">
        <label htmlFor={`${id}-from`}>I've finished</label>
        <select id={`${id}-from`} className={cn(select, "max-w-[260px]")} value={from} onChange={(e) => setFrom(Number(e.target.value))}>
          {sheet.sections.map((_, i) => (
            <option key={i} value={i}>
              {name(i)}
            </option>
          ))}
        </select>
        <label htmlFor={`${id}-to`}>through</label>
        <select id={`${id}-to`} className={cn(select, "max-w-[260px]")} value={to} onChange={(e) => setTo(Number(e.target.value))}>
          {sheet.sections.map((_, i) => (
            <option key={i} value={i}>
              {name(i)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Button
          size="sm"
          disabled={bulk.isPending || open === 0}
          onClick={() => bulk.mutate({ keys, label: range }, { onSuccess: onClose })}
        >
          Mark {open} {open === 1 ? "problem" : "problems"} done
        </Button>
        <span className="numeric text-body-sm text-ink-muted">
          {range}: {keys.length} problems, {keys.length - open} already done
        </span>
      </div>
    </div>
  );
}

function NoteEditor({ problemKey, initial, onClose }: { problemKey: string; initial: string; onClose: () => void }) {
  const [body, setBody] = useState(initial);
  const save = useSaveNote();
  const id = useId();
  const commit = () => {
    if (body !== initial) save.mutate({ key: problemKey, body });
  };
  return (
    <div className="flex flex-col gap-1.5 px-3 pb-3 pl-11">
      <label htmlFor={id} className="sr-only">
        Note
      </label>
      <textarea
        id={id}
        autoFocus
        rows={3}
        value={body}
        placeholder="Your approach, the trick you missed, what to revisit…"
        onChange={(e) => setBody(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            commit();
            onClose();
          }
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            commit();
            onClose();
          }
        }}
        className="w-full resize-y rounded-sm border border-glass-border bg-abyss-sunken px-3 py-2 text-body text-ink placeholder:text-ink-faint hover:border-glass-border-strong focus-visible:border-accent"
      />
      <span className="text-label text-ink-faint">
        Private: kept only on this computer. Saved when you leave the box; Ctrl Enter or Esc saves and closes.
      </span>
    </div>
  );
}

const Row = memo(function Row({
  p,
  status,
  note,
  noteOpen,
  onToggleNote,
  sectionTopic,
}: {
  p: SheetProblem;
  /** The section's own topic: a row only shows a chip for a topic beyond it. */
  sectionTopic: string | undefined;
  status: ProblemStatus;
  note: string | undefined;
  noteOpen: boolean;
  onToggleNote: (key: string) => void;
}) {
  const openTopic = useUiStore((s) => s.openTopic);
  const site = p.lc ? "LeetCode" : p.cf ? "Codeforces" : p.links?.tuf ? "takeUforward" : p.links?.gfg ? "GeeksforGeeks" : p.links?.code360 ? "Code360" : null;
  const dot = p.lc ? "bg-platform-lc" : p.cf ? "bg-platform-cf" : null;
  const lead = p.topics.find((t) => t !== sectionTopic);
  return (
    <>
      <li className="group flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
        <TickBox problem={p} status={status} />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("truncate text-body", status.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
            {p.premium && <span className="shrink-0 rounded-full border border-glass-border px-2 text-label text-ink-muted">Premium</span>}
          </span>
          <span className="flex min-w-0 items-center gap-1.5 text-label text-ink-muted">
            {status.done ? (
              <Check aria-hidden className="size-3.5 shrink-0 text-success" strokeWidth={2.4} />
            ) : (
              dot && <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", dot)} />
            )}
            <span className="min-w-0 truncate">
              <span className={status.done ? "text-ink" : undefined}>{status.done ? sourceLabel(p, status) : (site ?? "")}</span>
              {p.sourceTitle && <span className="text-ink-faint">{`, "${p.sourceTitle}" in the sheet`}</span>}
              {note && !noteOpen && <span className="text-ink-faint">{`, note: ${note}`}</span>}
            </span>
          </span>
        </span>
        {lead && (
          <button
            type="button"
            onClick={() => openTopic(lead)}
            className="hidden h-6 max-w-[150px] shrink-0 truncate rounded-full border border-glass-border bg-glass px-2.5 text-label text-ink-muted transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:text-ink lg:block"
          >
            {topicName(lead)}
          </button>
        )}
        <span className="w-14 shrink-0 text-right text-body-sm text-ink-muted">{p.difficulty ?? <span className="text-ink-faint">–</span>}</span>
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              aria-expanded={noteOpen}
              aria-label={note ? `Edit your note on ${p.title}` : `Add a note to ${p.title}`}
              onClick={() => onToggleNote(p.key)}
              className={cn(
                "grid size-8 shrink-0 place-items-center rounded-sm transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink",
                note ? "text-accent" : "text-ink-faint",
              )}
            >
              <NotebookPen aria-hidden className="size-4" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top">{note ? "Your note" : "Add a private note"}</TooltipContent>
        </Tooltip>
        <OpenButton problem={p} />
      </li>
      {noteOpen && (
        <li>
          <NoteEditor problemKey={p.key} initial={note ?? ""} onClose={() => onToggleNote(p.key)} />
        </li>
      )}
    </>
  );
});

function SectionCard({
  sheet,
  index,
  problems,
  progress,
  open,
  onToggle,
  view,
  notes,
  noteKey,
  setNoteKey,
}: {
  sheet: Sheet;
  index: number;
  problems: SheetProblem[];
  progress: { done: number; total: number; pct: number };
  open: boolean;
  onToggle: () => void;
  view: View;
  notes: ReadonlyMap<string, { body: string }>;
  noteKey: string | null;
  setNoteKey: (k: string | null) => void;
}) {
  const section = sheet.sections[index]!;
  const bodyId = useId();
  const toggleNote = (k: string) => setNoteKey(noteKey === k ? null : k);
  // The section's topic (its most common lead topic) goes without saying on every row.
  const leadCounts = new Map<string, number>();
  for (const p of section.problems) if (p.topics[0]) leadCounts.set(p.topics[0], (leadCounts.get(p.topics[0]) ?? 0) + 1);
  const sectionTopic = [...leadCounts].sort((a, b) => b[1] - a[1])[0]?.[0];
  // Sub-sections (A2Z's "FAQs (Medium)") as quiet headings inside the card.
  const groups: { sub: string | null; items: SheetProblem[] }[] = [];
  for (const p of problems) {
    const last = groups[groups.length - 1];
    if (last && last.sub === (p.sub ?? null)) last.items.push(p);
    else groups.push({ sub: p.sub ?? null, items: [p] });
  }
  const seen = new Set<string>();
  return (
    <section id={`section-${index}`} className="glass-card scroll-mt-4 overflow-hidden">
      <div className="flex items-center">
        <h3 className="min-w-0 flex-1">
          <button
            type="button"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={onToggle}
            className="flex w-full items-center gap-4 px-6 py-4 text-left transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
          >
            <span className="numeric grid size-8 shrink-0 place-items-center rounded-sm bg-abyss-sunken font-display text-body font-semibold text-ink-muted">
              {index + 1}
            </span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-title font-semibold text-ink">{section.title}</span>
              <span className="text-label text-ink-muted">
                {sheet.sectionLabel} {index + 1}, {distinctKeys(section.problems).length} problems
              </span>
            </span>
            <span className="flex shrink-0 items-center gap-3">
              {progress.total > 0 && progress.done === progress.total ? (
                <span className="flex items-center gap-1 text-body-sm text-ink">
                  <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />
                  Done
                </span>
              ) : (
                <span className="numeric text-body-sm text-ink-muted">
                  {progress.done}/{progress.total}
                </span>
              )}
              <span
                role="meter"
                aria-label={`${section.title} progress`}
                aria-valuemin={0}
                aria-valuemax={progress.total}
                aria-valuenow={progress.done}
                className="relative block h-1.5 w-28 overflow-hidden rounded-full bg-glass-border-strong"
              >
                <span
                  className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
                  style={{ transform: `scaleX(${progress.total ? progress.done / progress.total : 0})` }}
                />
              </span>
              <ChevronDown aria-hidden className={cn("size-4 text-ink-muted transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} />
            </span>
          </button>
        </h3>
        {/* v1.3: the section's topic in Learn (beside the toggle, never inside it). */}
        {sectionTopic && (RESOURCES[sectionTopic]?.videos.length ?? 0) > 0 && (
          <Link
            to={learnTopicPath(sectionTopic)}
            aria-label={`Learn this topic: ${topicName(sectionTopic)} videos`}
            title={`${topicName(sectionTopic)} videos in Learn`}
            className="mr-4 flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-body-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
          >
            <PlayCircle aria-hidden className="size-4" strokeWidth={1.8} />
            Learn this topic
          </Link>
        )}
      </div>
      {open && (
        <div id={bodyId} className="flex flex-col gap-2 px-3 pb-3">
          {groups.map((g, gi) => (
            <div key={gi} className="flex flex-col">
              {g.sub && <h4 className="px-3 pt-2 pb-1 text-label text-ink-muted">{g.sub}</h4>}
              <ul className="flex flex-col">
                {g.items.map((p) => {
                  // A problem listed twice in a section keeps one row id for its note editor.
                  const dupe = seen.has(p.key);
                  seen.add(p.key);
                  return (
                    <Row
                      key={`${p.key}${dupe ? `#${gi}` : ""}`}
                      p={p}
                      status={view.status(p.key)}
                      note={notes.get(p.key)?.body}
                      noteOpen={noteKey === p.key && !dupe}
                      onToggleNote={toggleNote}
                      sectionTopic={sectionTopic}
                    />
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Toolbar({
  query,
  setQuery,
  filter,
  setFilter,
  diffs,
  setDiffs,
  allOpen,
  setAllOpen,
}: {
  query: string;
  setQuery: (q: string) => void;
  filter: StatusFilter;
  setFilter: (f: StatusFilter) => void;
  diffs: ReadonlySet<LcDifficulty>;
  setDiffs: (d: Set<LcDifficulty>) => void;
  allOpen: boolean;
  setAllOpen: (v: boolean) => void;
}) {
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="relative w-72">
        <label htmlFor={id} className="sr-only">
          Search problems and notes
        </label>
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
        <Input id={id} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search problems and notes" className="pl-9" />
      </div>
      <div role="radiogroup" aria-label="Show" className="flex h-[38px] items-center gap-1 rounded-sm border border-glass-border bg-glass p-1">
        {(["all", "unsolved", "solved"] as const).map((f) => (
          <button
            key={f}
            type="button"
            role="radio"
            aria-checked={filter === f}
            onClick={() => setFilter(f)}
            className={cn(
              "h-7 rounded-xs px-3 text-body-sm font-medium capitalize transition-colors duration-[var(--dur-fast)]",
              filter === f ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <div role="group" aria-label="Difficulty" className="flex items-center gap-1.5">
        {DIFFS.map((d) => {
          const on = diffs.has(d);
          return (
            <button
              key={d}
              type="button"
              aria-pressed={on}
              onClick={() => {
                const next = new Set(diffs);
                if (on) next.delete(d);
                else next.add(d);
                setDiffs(next);
              }}
              className={cn(
                "h-7 rounded-full border px-3 text-label transition-colors duration-[var(--dur-fast)]",
                on ? "border-accent bg-accent-soft text-ink" : "border-glass-border bg-glass text-ink-muted hover:border-glass-border-strong hover:text-ink",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        onClick={() => setAllOpen(!allOpen)}
        className="ml-auto rounded-xs py-1 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
      >
        {allOpen ? "Collapse all" : "Expand all"}
      </button>
    </div>
  );
}

function SheetBody({ view }: { view: View }) {
  const { sheet, progress, next } = view;
  const followed = usePrefs().data?.followedSheet === sheet.id;
  const notes = useSheetNotes().data ?? new Map<string, { key: string; body: string; updatedAt: number }>();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [diffs, setDiffs] = useState<Set<LcDifficulty>>(new Set());
  const [open, setOpen] = useState<Set<number>>(() => new Set(next ? [next.sectionIndex] : [0]));
  const [noteKey, setNoteKey] = useState<string | null>(null);
  const [bulk, setBulk] = useState(false);
  const pending = useRef<number | null>(null);

  const q = query.trim().toLowerCase();
  const filtering = q !== "" || filter !== "all" || diffs.size > 0;
  const visible = useMemo(
    () =>
      sheet.sections.map((s) =>
        s.problems.filter((p) => {
          const st = view.status(p.key);
          if (filter === "solved" && !st.done) return false;
          if (filter === "unsolved" && st.done) return false;
          if (diffs.size && (!p.difficulty || !diffs.has(p.difficulty))) return false;
          if (!q) return true;
          const hay = `${p.title} ${p.sourceTitle ?? ""} ${p.sub ?? ""} ${notes.get(p.key)?.body ?? ""}`.toLowerCase();
          return hay.includes(q);
        }),
      ),
    [sheet, view, filter, diffs, q, notes],
  );
  const matches = visible.reduce((n, v) => n + v.length, 0);

  // Jumping from the strip: open the section, then scroll to it once it's rendered.
  useEffect(() => {
    if (pending.current === null) return;
    document.getElementById(`section-${pending.current}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
    pending.current = null;
  });
  const jump = (i: number) => {
    pending.current = i;
    setOpen((o) => new Set(o).add(i));
  };
  const allOpen = open.size === sheet.sections.length;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="sheet-title" className="glass-card flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1.5">
            <Link to="/practice/sheets" className="flex items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted hover:text-ink">
              <ChevronLeft aria-hidden className="size-4" />
              All sheets
            </Link>
            <h2 id="sheet-title" className="font-display text-display font-semibold text-ink">
              {sheet.name}
            </h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <SheetCredit sheet={sheet} />
              <span className="text-body-sm text-ink-faint">Built from the original list, {fetchedLabel(sheet.fetched)}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FollowButton sheetId={sheet.id} followed={followed} />
            <Button variant="outline" size="sm" aria-expanded={bulk} onClick={() => setBulk((b) => !b)}>
              <ListChecks aria-hidden />
              Mark sections done
            </Button>
          </div>
        </div>
        {sheet.status === "partial" && (
          <div className="rounded-md border border-dashed border-glass-border-strong p-4 text-body-sm text-ink-muted">
            <p className="text-ink">This sheet is partial: some of the original couldn't be verified.</p>
            <ul className="mt-1 list-disc pl-5">
              {sheet.notes.map((n) => (
                <li key={n}>{n}</li>
              ))}
            </ul>
          </div>
        )}
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
          <div className="flex min-w-0 flex-col gap-4">
            {sheet.id === PATH_SHEET_ID ? (
              <PathStepProgress size="lg" />
            ) : (
              <p className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="numeric font-display text-display leading-none font-semibold text-ink">{progress.pct}%</span>
                <span className="numeric text-body-sm text-ink-muted">
                  {progress.done} of {progress.total} problems done
                  {progress.done > 0 &&
                    ` (${[
                      progress.bySource.auto && `${progress.bySource.auto} from your solves`,
                      progress.bySource.manual && `${progress.bySource.manual} by hand`,
                      progress.bySource.bulk && `${progress.bySource.bulk} imported`,
                    ]
                      .filter(Boolean)
                      .join(", ")})`}
                </span>
              </p>
            )}
            <SectionStrip sections={progress.sections} titles={sheet.sections.map((s) => s.title)} label={sheet.sectionLabel} onSelect={jump} current={next?.sectionIndex} />
            <p className="max-w-[68ch] text-body-sm text-ink-muted">
              Problems you solve on LeetCode or Codeforces tick themselves after the next update. LeetCode's API only shows your 20 most recent solves,
              so older ones won't appear: tick them here or use Mark sections done.
            </p>
          </div>
          <NextTile sheet={sheet} next={next} />
        </div>
        {bulk && <BulkPanel view={view} onClose={() => setBulk(false)} />}
      </section>

      <Toolbar
        query={query}
        setQuery={setQuery}
        filter={filter}
        setFilter={setFilter}
        diffs={diffs}
        setDiffs={setDiffs}
        allOpen={allOpen}
        setAllOpen={(v) => setOpen(v ? new Set(sheet.sections.map((_, i) => i)) : new Set())}
      />

      {filtering && matches === 0 ? (
        <p className="text-body-sm text-ink-muted">No problems match. Clear the search or the filters to see the whole sheet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {sheet.sections.map((_, i) => {
            const problems = visible[i]!;
            if (filtering && problems.length === 0) return null;
            return (
              <SectionCard
                key={i}
                sheet={sheet}
                index={i}
                problems={problems}
                progress={progress.sections[i]!}
                open={filtering || open.has(i)}
                onToggle={() =>
                  setOpen((o) => {
                    const n = new Set(o);
                    if (n.has(i)) n.delete(i);
                    else n.add(i);
                    return n;
                  })
                }
                view={view}
                notes={notes}
                noteKey={noteKey}
                setNoteKey={setNoteKey}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Practice → Sheets → one sheet: progress, Next in this sheet, and every problem by section. */
export function SheetView() {
  const { sheetId } = useParams();
  const id = isSheetId(sheetId) ? sheetId : null;
  const view = useSheet(id);
  if (!id) {
    return (
      <EmptyState icon={ListChecks} title="No such sheet" action={<Link to="/practice/sheets" className="text-body-sm text-ink underline underline-offset-4">See all sheets</Link>}>
        This link doesn't point at a sheet AlgoCompass has.
      </EmptyState>
    );
  }
  if (view.isLoading || !view.data) return <p className="text-body-sm text-ink-muted">Loading the sheet…</p>;
  return <SheetBody view={view.data} />;
}
