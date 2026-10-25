import { Fragment, type ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TERMS, type TermId } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * A word that needs explaining (XP, rating, Div. 2, strength…): a dotted underline and a one-line
 * tooltip from the glossary. Focusable, so the explanation is reachable from the keyboard too.
 */
export function Term({ id, children, className }: { id: TermId; children?: ReactNode; className?: string }) {
  const t = TERMS[id];
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className={cn("cursor-help rounded-xs underline decoration-ink-faint decoration-dotted underline-offset-[3px]", className)}
        >
          {children ?? t.label}
        </span>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        {t.hint}
      </TooltipContent>
    </Tooltip>
  );
}

/** Splits text around "Div. 2"-style words (contest names), so each gets the Div. tooltip. */
export function splitDivisions(text: string): { text: string; div: boolean }[] {
  const out: { text: string; div: boolean }[] = [];
  let last = 0;
  for (const m of text.matchAll(/Div\.\s?\d(?:\s?\+\s?Div\.\s?\d)?/g)) {
    if (m.index! > last) out.push({ text: text.slice(last, m.index), div: false });
    out.push({ text: m[0], div: true });
    last = m.index! + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last), div: false });
  return out;
}

/** A contest name with its "Div. N" explained. */
export function ContestName({ name }: { name: string }) {
  return (
    <>
      {splitDivisions(name).map((p, i) =>
        p.div ? (
          <Term key={i} id="div">
            {p.text}
          </Term>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
