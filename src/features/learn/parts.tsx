import { Fragment } from "react";
import { Check, ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { watchPath } from "@/components/shell/nav";
import type { LibraryRole, LibraryVideo } from "@/engine/learn";
import { thumbUrl } from "@/features/path/VideoPlayer";
import { cn } from "@/lib/utils";

/** Pieces Learn, the lesson page and the watch page share. */

export const LANG_NAME = { en: "English", hi: "Hindi" } as const;

export function roleLabel(v: Pick<LibraryVideo, "role" | "step">): string {
  const r: Record<LibraryRole, string> = {
    lesson: `Step ${(v.step ?? 0) + 1} lesson`,
    "lesson-extra": `Step ${(v.step ?? 0) + 1} extra`,
    intro: "Intro",
    lecture: "Full lecture",
    walkthrough: "Problem walkthrough",
  };
  return r[v.role];
}

export interface Crumb {
  label: string;
  to?: string;
}

/**
 * "‹ Learn › Beginner Path › Step 3". The back arrow goes back in history when there is some (so
 * Back from a lesson opened on Today returns to Today), and otherwise to the parent crumb.
 */
export function Breadcrumb({ crumbs }: { crumbs: Crumb[] }) {
  const navigate = useNavigate();
  const parent = [...crumbs].reverse().find((c) => c.to)?.to ?? "/learn";
  const back = () => {
    const idx = (window.history.state as { idx?: number } | null)?.idx ?? 0;
    if (idx > 0) navigate(-1);
    else navigate(parent);
  };
  return (
    <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1">
      <button
        type="button"
        onClick={back}
        aria-label="Back"
        title="Back (Alt Left)"
        className="-ml-2 grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
      >
        <ChevronLeft aria-hidden className="size-4" />
      </button>
      <ol className="flex min-w-0 items-center gap-1 text-body-sm">
        {crumbs.map((c, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <li aria-hidden className="text-ink-faint">
                <ChevronRight className="size-3.5" />
              </li>
            )}
            <li className={cn("min-w-0", i === crumbs.length - 1 ? "truncate" : "shrink-0")}>
              {c.to ? (
                <Link to={c.to} className="rounded-xs text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  {c.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-ink">
                  {c.label}
                </span>
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}

/**
 * One library video: thumbnail with its length, the title, then the channel and what it is. A
 * watched video says so in words and with a Success check. Opens the big player.
 */
export function VideoRow({ v, topicId, watched, showLang }: { v: LibraryVideo; topicId: string; watched: boolean; showLang: boolean }) {
  return (
    <li>
      <Link
        to={`${watchPath(v.id)}?topic=${encodeURIComponent(topicId)}`}
        className="group flex items-start gap-3 rounded-sm p-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
      >
        <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xs bg-abyss-sunken">
          <img src={thumbUrl(v.id, "mq")} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" />
          <span
            aria-hidden
            className="absolute inset-0 grid place-items-center opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
          >
            <span className="grid size-8 place-items-center rounded-full bg-[color-mix(in_oklab,var(--abyss)_72%,transparent)] text-ink">
              <Play className="ml-0.5 size-3.5" fill="currentColor" />
            </span>
          </span>
          <span className="numeric absolute right-1 bottom-1 rounded-xs bg-[color-mix(in_oklab,var(--abyss)_78%,transparent)] px-1 text-label text-ink">
            {v.minutes} min
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          <span className="line-clamp-2 text-body-sm font-medium text-ink">{v.title}</span>
          <span className="truncate text-label text-ink-muted">
            {roleLabel(v)}, {v.channel}
            {showLang ? `, ${LANG_NAME[v.lang]}` : ""}
          </span>
          {watched && (
            <span className="flex items-center gap-1 text-label text-ink">
              <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />
              Watched
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

/** Segmented control in the toolbar style (a 38px glass track). */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="flex h-[38px] items-center gap-1 rounded-sm border border-glass-border bg-glass p-1">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn(
            "h-7 rounded-xs px-3 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
            value === o.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
