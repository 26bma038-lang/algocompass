import { Check, Play } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeChip } from "@/components/CodeChip";
import { watchPath } from "@/components/shell/nav";
import { usePrefs } from "@/data/prefs";
import type { LibraryRole, LibraryVideo } from "@/engine/learn";
import { Thumb } from "@/features/path/VideoPlayer";
import { cn } from "@/lib/utils";

/** Pieces Learn, the lesson page and the watch page share (the breadcrumb is @/components/Breadcrumb since v1.8). */

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


/**
 * One library video: thumbnail with its length, the title, then what it codes in (v1.5), the channel and what it is. A
 * watched video says so in words and with a Success check. Opens the big player.
 */
export function VideoRow({ v, topicId, watched, showLang }: { v: LibraryVideo; topicId: string; watched: boolean; showLang: boolean }) {
  const mine = usePrefs().data?.codeLang;
  return (
    <li>
      <Link
        to={`${watchPath(v.id)}?topic=${encodeURIComponent(topicId)}`}
        className="group flex items-start gap-3 rounded-sm p-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
      >
        <span className="relative aspect-video w-28 shrink-0 overflow-hidden rounded-xs bg-abyss-sunken">
          <Thumb id={v.id} size="mq" />
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
          <span className="flex min-w-0 items-center gap-1.5">
            <CodeChip video={v} mine={mine} />
            <span className="truncate text-label text-ink-muted">
              {roleLabel(v)}, {v.channel}
              {showLang ? `, ${LANG_NAME[v.lang]}` : ""}
            </span>
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
