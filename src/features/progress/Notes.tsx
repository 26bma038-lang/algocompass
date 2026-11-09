import { useMemo, useState } from "react";
import { NotebookPen, Search } from "lucide-react";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useProblemPool } from "@/data/mustDo";
import { useSheetNotes } from "@/data/sheets";
import { useUiStore } from "@/data/uiStore";
import { filterNotes, noteEntries, type NoteEntry } from "@/engine/notes";
import type { ProblemRef } from "@/engine/problemRef";
import { LABELS } from "@/lib/glossary";

const when = (ts: number) => new Date(ts * 1000).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });

const refOf = (e: NoteEntry): ProblemRef => ({
  key: e.key,
  title: e.title,
  platform: e.key.startsWith("lc:") ? "lc" : e.key.startsWith("cf:") ? "cf" : "other",
  topics: [],
  difficulty: null,
  rating: null,
  url: null,
});

/** Progress → Your notes: every note you wrote on a problem, newest first, searchable. */
export function NotesList() {
  const notes = useSheetNotes();
  const pool = useProblemPool().data;
  const open = useUiStore((s) => s.openTool);
  const [query, setQuery] = useState("");
  const titles = useMemo(() => new Map(pool?.problems.map((p) => [p.key, p.title])), [pool]);
  const entries = useMemo(() => noteEntries([...(notes.data?.values() ?? [])], (k) => titles.get(k)), [notes.data, titles]);
  const shown = useMemo(() => filterNotes(entries, query), [entries, query]);

  if (notes.isLoading) return <p className="text-body-sm text-ink-muted">Loading your notes…</p>;
  if (entries.length === 0) {
    return (
      <EmptyState icon={NotebookPen} title="No notes yet">
        Open the ⋯ menu on any problem and choose {LABELS.addNote}: why you got Wrong Answer, the key idea, what to remember. They're kept only on this computer, and show up here.
      </EmptyState>
    );
  }
  return (
    <section aria-labelledby="notes-title" className="glass-card flex flex-col gap-5 p-6">
      <CardHeader id="notes-title" title={LABELS.yourNotes} description="Private, kept on this computer. Newest first." pill={`${entries.length} ${entries.length === 1 ? "note" : "notes"}`} />
      <div className="relative max-w-md">
        <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-muted" />
        <Input type="search" aria-label="Search your notes" placeholder="Search by problem or by what you wrote" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
      </div>
      {shown.length === 0 ? (
        <p className="text-body-sm text-ink-muted">No note matches "{query}".</p>
      ) : (
        <ul className="flex flex-col divide-y divide-glass-border">
          {shown.map((e) => (
            <li key={e.key} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <h3 className="truncate text-body font-semibold text-ink">{e.title}</h3>
                <p className="text-body whitespace-pre-wrap text-ink-muted">{e.body}</p>
                <span className="text-label text-ink-faint">{when(e.updatedAt)}</span>
              </div>
              <Button variant="ghost" size="sm" onClick={() => open("note", refOf(e))} aria-label={`Edit your note on ${e.title}`}>
                Edit
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
