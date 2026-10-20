import { Link } from "react-router-dom";
import { usePrefs } from "@/data/prefs";
import { isSheetId, useSheet } from "@/data/sheets";
import { OpenButton } from "./parts";
import { SectionStrip } from "./SectionStrip";
import { sheetPath } from "./paths";

/**
 * Today: the sheet you follow, in one line ("A2Z: 62%, next: Two Sum") with its strip and Open.
 * Nothing renders when you don't follow a sheet.
 */
export function FollowedSheetCard() {
  const followed = usePrefs().data?.followedSheet ?? null;
  const id = isSheetId(followed) ? followed : null;
  const view = useSheet(id);
  if (!id || !view.data) return null;
  const { sheet, progress, next } = view.data;
  return (
    <section aria-labelledby="followed-sheet-title" className="glass-card grid grid-cols-1 items-center gap-x-6 gap-y-3 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)_auto]">
      <div className="flex min-w-0 flex-col gap-1">
        <h2 id="followed-sheet-title" className="flex items-baseline gap-2 font-display text-headline font-semibold text-ink">
          <Link to={sheetPath(sheet.id)} className="truncate rounded-xs hover:underline hover:decoration-glass-border-strong hover:underline-offset-4">
            {sheet.short}
          </Link>
          <span className="numeric">{progress.pct}%</span>
        </h2>
        <SectionStrip size="sm" sections={progress.sections} titles={sheet.sections.map((s) => s.title)} label={sheet.sectionLabel} current={next?.sectionIndex} />
        <span className="numeric text-label text-ink-muted">
          {progress.done} of {progress.total} done, sheet by {sheet.creator}
        </span>
      </div>
      <p className="min-w-0 text-body-sm text-ink-muted">
        {next ? (
          <>
            <span className="text-ink-muted">Next: </span>
            <span className="text-body font-semibold text-ink">{next.problem.title}</span>
            <span className="block truncate">
              {sheet.sectionLabel} {next.sectionIndex + 1}, {sheet.sections[next.sectionIndex]?.title}
              {next.problem.difficulty ? `. ${next.problem.difficulty}` : ""}
            </span>
          </>
        ) : (
          <span className="text-ink">Every problem in this sheet is done.</span>
        )}
      </p>
      {next && <OpenButton problem={next.problem} />}
    </section>
  );
}
