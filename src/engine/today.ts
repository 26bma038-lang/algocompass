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

/**
 * Practice's "Recommended next" tag (v1.4 polish): the first problem of today's set not solved yet,
 * in the order Practice lists them (Codeforces, then LeetCode), so it's the same problem Today's Do
 * this next picks.
 */
export function recommendedNextId(items: readonly { platform: "cf" | "lc"; problemId: string; done: boolean; rec: unknown }[]): string | null {
  const listed = [...items.filter((i) => i.platform === "cf"), ...items.filter((i) => i.platform === "lc")];
  return listed.find((i) => i.rec !== null && !i.done)?.problemId ?? null;
}

export function pickDoThisNext<P, S>(mix: readonly MixPick<P>[] | null | undefined, sheetNext: S | null | undefined): DoThisNext<P, S> {
  const items = (mix ?? []).filter((i): i is { rec: P; done: boolean } => i.rec !== null);
  const done = items.filter((i) => i.done).length;
  const first = items.find((i) => !i.done);
  if (first) return { kind: "mix", problem: first.rec, done, total: items.length };
  if (sheetNext) return { kind: "sheet", next: sheetNext, done, total: items.length };
  if (items.length) return { kind: "all-done", done, total: items.length };
  return { kind: "none" };
}
