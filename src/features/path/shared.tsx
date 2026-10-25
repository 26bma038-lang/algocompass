import { Link } from "react-router-dom";
import { stepLabel } from "@/components/shell/topBarItems";
import { useUpdatePrefs, usePrefs, type VideoLang } from "@/data/prefs";
import { pathDots } from "@/engine/path";
import type { PathView as View } from "@/data/path";
import { cn } from "@/lib/utils";

/** Small pieces Learn, lessons, Today and Settings share (kept out of the lazy Learn chunk). */

export { lessonPath } from "@/components/shell/nav";

/** English or Hindi lesson videos. Saved as a pref; Settings has the same switch. */
export function LangToggle() {
  const lang = usePrefs().data?.videoLang ?? "en";
  const update = useUpdatePrefs();
  const opts: { id: VideoLang; label: string }[] = [
    { id: "en", label: "English" },
    { id: "hi", label: "Hindi" },
  ];
  return (
    <div role="radiogroup" aria-label="Video language" className="flex h-9 items-center gap-1 rounded-md border border-glass-border bg-glass p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={lang === o.id}
          onClick={() => lang !== o.id && update.mutate({ videoLang: o.id })}
          className={cn(
            "flex h-7 items-center rounded-sm px-3 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
            lang === o.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Today's compact path strip (v1.4 polish): "Step 1 of 14", one dot per step (done in Success, the
 * current one in the accent with a soft ring, the rest faint), and a quiet link to the roadmap.
 */
export function PathDots({ view }: { view: View }) {
  const total = view.steps.length;
  const label = stepLabel(view.current, total);
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <span className="numeric text-body-sm font-semibold text-ink">{label}</span>
      <span role="img" aria-label={`Beginner Path: ${view.doneCount} of ${total} steps done`} className="flex items-center gap-1.5">
        {pathDots(view).map((d, i) => (
          <span
            key={i}
            className={cn(
              "rounded-full",
              d === "current" ? "size-2.5 bg-accent ring-[3px] ring-accent-soft" : "size-2",
              d === "done" && "bg-success",
              d === "todo" && "bg-ink-faint/45",
            )}
          />
        ))}
      </span>
      <Link to="/learn#path" className="ml-auto rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
        View Beginner Path
      </Link>
    </div>
  );
}

/** Per step for the strip: a done step is full; the current one fills with its progress. */
export function stripProgress(view: View) {
  return view.steps.map((s) => {
    if (s.state === "done") return { done: 1, total: 1, pct: 100 };
    if (s.state === "locked") return { done: 0, total: 1, pct: 0 };
    // Current: the video is one part, each required problem another.
    const parts = 1 + s.required;
    const got = (s.watched ? 1 : 0) + s.requiredDone;
    return { done: got, total: parts, pct: Math.floor((got / parts) * 100) };
  });
}
