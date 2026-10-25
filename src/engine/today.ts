/**
 * Smart Today's "Do this next" (v1.4): the single best next problem. Today's problems come first
 * (the recommender already put your weakest topics in them); once they're all done, the next
 * problem in the sheet you follow. Pure: the data layer hands in the mix and the sheet's next.
 */

export interface MixPick<P> {
  rec: P | null;
  done: boolean;
}

export type DoThisNext<P, S> =
  | { kind: "mix"; problem: P; done: number; total: number }
  | { kind: "sheet"; next: S; done: number; total: number }
  | { kind: "all-done"; done: number; total: number }
  | { kind: "none" };

export function pickDoThisNext<P, S>(mix: readonly MixPick<P>[] | null | undefined, sheetNext: S | null | undefined): DoThisNext<P, S> {
  const items = (mix ?? []).filter((i): i is { rec: P; done: boolean } => i.rec !== null);
  const done = items.filter((i) => i.done).length;
  const first = items.find((i) => !i.done);
  if (first) return { kind: "mix", problem: first.rec, done, total: items.length };
  if (sheetNext) return { kind: "sheet", next: sheetNext, done, total: items.length };
  if (items.length) return { kind: "all-done", done, total: items.length };
  return { kind: "none" };
}
