/**
 * Smart Today's "Do this next" (v1.4): the single best next problem. Today's problems come first
 * (the recommender already put your weakest topics in them); once they're all done, the next
 * problem in the sheet you follow. Pure: the data layer hands in the mix and the sheet's next.
 */

export interface MixPick<P> {
  rec: P | null;
  done: boolean;
}

export type DoThisNext<P, S, D = never> =
  | { kind: "review"; due: D; done: number; total: number }
  | { kind: "mix"; problem: P; done: number; total: number }
  | { kind: "sheet"; next: S; done: number; total: number }
  | { kind: "all-done"; done: number; total: number }
  | { kind: "none" };

/**
 * Practice's "Recommended next" tag (v1.4 polish): the first problem of today's set not solved yet,
 * in the order Practice lists them (Codeforces, then LeetCode), so it's the same problem Today's Do
 * this next picks.
 */
export function recommendedNextId(items: readonly { platform: "cf" | "lc"; problemId: string; done: boolean; rec: unknown }[]): string | null {
  const listed = [...items.filter((i) => i.platform === "cf"), ...items.filter((i) => i.platform === "lc")];
  return listed.find((i) => i.rec !== null && !i.done)?.problemId ?? null;
}

/** v1.7: a problem due for review comes before everything else (the one most overdue). */
export function pickDoThisNext<P, S, D = never>(mix: readonly MixPick<P>[] | null | undefined, sheetNext: S | null | undefined, due?: D | null): DoThisNext<P, S, D> {
  const items = (mix ?? []).filter((i): i is { rec: P; done: boolean } => i.rec !== null);
  const done = items.filter((i) => i.done).length;
  const first = items.find((i) => !i.done);
  if (due) return { kind: "review", due, done, total: items.length };
  if (first) return { kind: "mix", problem: first.rec, done, total: items.length };
  if (sheetNext) return { kind: "sheet", next: sheetNext, done, total: items.length };
  if (items.length) return { kind: "all-done", done, total: items.length };
  return { kind: "none" };
}
