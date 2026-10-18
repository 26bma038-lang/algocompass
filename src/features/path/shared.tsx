import { useUpdatePrefs, usePrefs, type VideoLang } from "@/data/prefs";
import type { PathView as View } from "@/data/path";
import { cn } from "@/lib/utils";

/** Small pieces the Path view, lessons, Today and Settings share (kept out of the lazy Path chunk). */

export const lessonPath = (stepId: string) => `/practice/path/${stepId}`;

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
