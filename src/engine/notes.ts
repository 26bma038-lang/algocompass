/**
 * "Your notes" (v1.7): the per-problem notes in one searchable list. Pure: the data layer hands in
 * the saved notes and a way to look a problem's title up (the sheets), since a note only stores the
 * title when it was written from a row that knew it.
 */

export interface SavedNote {
  key: string;
  body: string;
  updatedAt: number;
  title: string | null;
}

export interface NoteEntry {
  key: string;
  title: string;
  body: string;
  updatedAt: number;
}

/** "lc:two-sum" → "two sum": the last resort when no title is known anywhere. */
export function titleFromKey(key: string): string {
  const rest = key.slice(key.indexOf(":") + 1);
  return rest.replace(/[-_]+/g, " ").trim() || key;
}

/** Newest first, each with the best title we have: the stored one, then the sheets', then the key's words. */
export function noteEntries(notes: readonly SavedNote[], lookupTitle: (key: string) => string | undefined): NoteEntry[] {
  return notes
    .filter((n) => n.body.trim() !== "")
    .map((n) => ({ key: n.key, title: n.title?.trim() || lookupTitle(n.key) || titleFromKey(n.key), body: n.body, updatedAt: n.updatedAt }))
    .sort((a, b) => b.updatedAt - a.updatedAt || a.title.localeCompare(b.title));
}

/** Every word of the query must appear in the title or the note, in any order, ignoring case. */
export function filterNotes(entries: readonly NoteEntry[], query: string): NoteEntry[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [...entries];
  return entries.filter((e) => {
    const hay = `${e.title} ${e.body}`.toLowerCase();
    return words.every((w) => hay.includes(w));
  });
}
