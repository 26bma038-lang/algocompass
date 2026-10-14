import { Link } from "react-router-dom";
import { CalendarClock, Flame, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useHandles } from "@/data/settings";

function PlatformChip({ platform, handle }: { platform: "cf" | "lc"; handle: string | undefined }) {
  const name = platform === "cf" ? "Codeforces" : "LeetCode";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Link
          to="/settings"
          className="inline-flex h-6 max-w-[22ch] items-center gap-1.5 rounded-full border border-glass-border bg-glass px-2.5 text-label text-ink-muted transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:text-ink"
        >
          <span
            aria-hidden
            className={platform === "cf" ? "size-1.5 shrink-0 rounded-full bg-platform-cf" : "size-1.5 shrink-0 rounded-full bg-platform-lc"}
          />
          <span className="sr-only">{name} handle:</span>
          <span className="truncate">{handle ?? "…"}</span>
        </Link>
      </TooltipTrigger>
      <TooltipContent side="bottom">Change {name} handle</TooltipContent>
    </Tooltip>
  );
}

/**
 * Home Base answers "am I on track today?" first: today's practice and streak lead,
 * quest and next contest sit beside it, the slower-moving rating follows.
 * No data exists before the first sync, so every slot says so plainly.
 */
export function HomeBase() {
  const { data: handles } = useHandles();

  return (
    <div className="grid grid-cols-12 gap-4">
      <section
        aria-labelledby="today-title"
        className="glass-card col-span-12 row-span-2 flex flex-col justify-between gap-8 p-6 lg:col-span-7 xl:col-span-8"
      >
        <div className="flex items-start gap-5">
          <span className="grid size-16 shrink-0 place-items-center rounded-md bg-abyss-sunken">
            <Flame aria-hidden className="size-8 text-ink-faint" strokeWidth={1.6} />
          </span>
          <div className="flex flex-col gap-1.5">
            <h2 id="today-title" className="font-display text-display font-semibold text-ink">
              Today
            </h2>
            <p className="max-w-[46ch] text-body text-ink-muted">
              Nothing is tracked yet. Once your Codeforces and LeetCode history syncs, this shows
              whether you've practiced today and how long your streak runs.
            </p>
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-4 border-t border-glass-border pt-5">
          <div className="flex flex-col gap-1">
            <dt className="text-label text-ink-muted">Current streak</dt>
            <dd className="numeric font-display text-headline font-semibold text-ink-faint">–</dd>
          </div>
          <div className="flex flex-col gap-1">
            <dt className="text-label text-ink-muted">Solved today</dt>
            <dd className="numeric font-display text-headline font-semibold text-ink-faint">–</dd>
          </div>
        </dl>
      </section>

      <section
        aria-labelledby="quest-title"
        className="glass-card col-span-12 flex flex-col gap-2 p-5 sm:col-span-6 lg:col-span-5 xl:col-span-4"
      >
        <div className="flex items-center gap-2">
          <ScrollText aria-hidden className="size-4 text-ink-muted" strokeWidth={1.8} />
          <h2 id="quest-title" className="text-title font-semibold text-ink">
            Today's quest
          </h2>
        </div>
        <p className="text-body-sm text-ink-muted">
          Quests target your weakest topics, so the first one is picked after your solve history loads.
        </p>
      </section>

      <section
        aria-labelledby="contest-title"
        className="glass-card col-span-12 flex flex-col gap-2 p-5 sm:col-span-6 lg:col-span-5 xl:col-span-4"
      >
        <div className="flex items-center gap-2">
          <CalendarClock aria-hidden className="size-4 text-ink-muted" strokeWidth={1.8} />
          <h2 id="contest-title" className="text-title font-semibold text-ink">
            Next contest
          </h2>
        </div>
        <p className="text-body-sm text-ink-muted">
          A countdown to the next Codeforces round goes here, with LeetCode contests listed under it.
        </p>
        <Button asChild variant="outline" size="sm" className="mt-1 self-start">
          <Link to="/contests">Open contests</Link>
        </Button>
      </section>

      <section
        aria-labelledby="rating-title"
        className="glass-card col-span-12 flex flex-wrap items-center justify-between gap-x-8 gap-y-4 px-6 py-5"
      >
        <div className="flex items-center gap-5">
          <span className="numeric font-display text-hero font-semibold text-ink-faint" aria-hidden>
            –
          </span>
          <div className="flex flex-col gap-1">
            <h2 id="rating-title" className="text-title font-semibold text-ink">
              Codeforces rating
            </h2>
            <p className="text-body-sm text-ink-muted">
              <span className="sr-only">No rating yet. </span>
              Your rating, rank and progress to the next rank appear after the first sync.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <PlatformChip platform="cf" handle={handles?.codeforces} />
          <PlatformChip platform="lc" handle={handles?.leetcode} />
        </div>
      </section>
    </div>
  );
}
