import { ChevronRight, ListChecks } from "lucide-react";
import { Link } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePrefs } from "@/data/prefs";
import { useSheets, type SheetView } from "@/data/sheets";
import { FollowButton, NextTile, SheetCredit } from "./parts";
import { SectionStrip } from "./SectionStrip";
import { sheetPath } from "./paths";


/** The sheet you follow, leading the tab: progress, its shape, and the next problem to open. */
function FollowedCard({ view }: { view: SheetView }) {
  const { sheet, progress, next } = view;
  return (
    <section aria-labelledby="followed-title" className="glass-card grid grid-cols-1 gap-6 p-6 lg:grid-cols-[minmax(0,1fr)_minmax(300px,380px)]">
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1">
          <h2 id="followed-title" className="font-display text-headline font-semibold text-ink">
            <Link to={sheetPath(sheet.id)} className="rounded-xs hover:underline hover:decoration-glass-border-strong hover:underline-offset-4">
              {sheet.name}
            </Link>
          </h2>
          <SheetCredit sheet={sheet} />
        </div>
        <p className="flex items-baseline gap-3">
          <span className="numeric font-display text-display leading-none font-semibold text-ink">{progress.pct}%</span>
          <span className="numeric text-body-sm text-ink-muted">
            {progress.done} of {progress.total} problems done
          </span>
        </p>
        <SectionStrip sections={progress.sections} titles={sheet.sections.map((s) => s.title)} label={sheet.sectionLabel} current={next?.sectionIndex} />
        <div className="mt-auto flex flex-wrap items-center gap-3">
          <Link
            to={sheetPath(sheet.id)}
            className="inline-flex h-8 items-center gap-1 rounded-sm border border-glass-border-strong bg-glass px-3 text-body-sm font-semibold text-ink transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
          >
            View the sheet
            <ChevronRight aria-hidden className="size-4" />
          </Link>
          <FollowButton sheetId={sheet.id} followed />
        </div>
      </div>
      <NextTile sheet={sheet} next={next} />
    </section>
  );
}

function SheetRow({ view, followed }: { view: SheetView; followed: boolean }) {
  const { sheet, progress } = view;
  return (
    <li className="grid grid-cols-[minmax(0,1.2fr)_minmax(0,1.5fr)_auto_auto] items-center gap-5 rounded-md px-3 py-3 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="flex min-w-0 items-center gap-2">
          <Link to={sheetPath(sheet.id)} className="truncate rounded-xs text-title font-semibold text-ink hover:underline hover:decoration-glass-border-strong hover:underline-offset-4">
            {sheet.name}
          </Link>
          {sheet.status === "partial" && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span tabIndex={0} className="shrink-0 rounded-full border border-dashed border-glass-border-strong px-2 text-label text-ink-muted">
                  Partial
                </span>
              </TooltipTrigger>
              <TooltipContent side="top">Some problems from the original couldn't be verified. The sheet lists what's missing.</TooltipContent>
            </Tooltip>
          )}
        </span>
        <SheetCredit sheet={sheet} />
      </div>
      <div className="flex min-w-0 flex-col gap-1">
        <SectionStrip size="sm" sections={progress.sections} titles={sheet.sections.map((s) => s.title)} label={sheet.sectionLabel} />
        <span className="numeric text-label text-ink-muted">
          {sheet.sections.length} {sheet.sectionLabel.toLowerCase()}s, {progress.total} problems
        </span>
      </div>
      <span className="flex w-24 flex-col items-end">
        <span className="numeric font-display text-headline leading-none font-semibold text-ink">{progress.pct}%</span>
        <span className="numeric text-label text-ink-muted">
          {progress.done}/{progress.total}
        </span>
      </span>
      <FollowButton sheetId={sheet.id} followed={followed} />
    </li>
  );
}

/** Practice → Sheets: the sheet you follow first, then every bundled sheet with its progress. */
export function SheetList() {
  const sheets = useSheets();
  const followedId = usePrefs().data?.followedSheet ?? null;
  if (sheets.isLoading) return <p className="text-body-sm text-ink-muted">Loading sheets…</p>;
  if (!sheets.data) {
    return (
      <EmptyState icon={ListChecks} title="Sheets didn't load">
        {String(sheets.error ?? "Something went wrong reading the bundled sheets.")}
      </EmptyState>
    );
  }
  const followed = sheets.data.find((v) => v.sheet.id === followedId);
  // The followed sheet leads in its own card, so the list holds the others (no duplicate row).
  const others = sheets.data.filter((v) => v !== followed);
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      {followed && (
        <div className="col-span-12">
          <FollowedCard view={followed} />
        </div>
      )}
      <section aria-labelledby="sheets-title" className="glass-card col-span-12 flex flex-col gap-4 p-6">
        <CardHeader
          id="sheets-title"
          title={followed ? "Other sheets" : "Pick a sheet to follow"}
          description={
            followed
              ? "Every sheet ticks itself from your LeetCode and Codeforces solves. A problem in several sheets is ticked in all of them."
              : "The sheet you follow is pinned here and on Today with your next problem, and gives you a daily goal. Every sheet ticks itself from your LeetCode and Codeforces solves."
          }
          pill={`${others.length} sheets`}
        />
        <ul className="-mx-3 flex flex-col">
          {others.map((v) => (
            <SheetRow key={v.sheet.id} view={v} followed={v.sheet.id === followedId} />
          ))}
        </ul>
        <p className="text-label text-ink-muted">
          Sheets are built from each creator's original list and keep its order. LeetCode's API only shows your 20 most recent solves, so older solves
          won't tick on their own: open a sheet and use Mark sections done, or tick them one by one.
        </p>
      </section>
    </div>
  );
}

