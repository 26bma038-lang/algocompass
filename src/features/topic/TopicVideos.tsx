import { useState } from "react";
import { Check, Play } from "lucide-react";
import { RESOURCES, type TopicVideo } from "@/data/catalog";
import { useWatchedVideos } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { VideoPlayer } from "@/features/path/VideoPlayer";
import { cn } from "@/lib/utils";

const ROLE: Record<TopicVideo["role"], string> = { intro: "Intro", lecture: "Full lecture", walkthrough: "Problem walkthrough" };
const LANG_NAME = { en: "English", hi: "Hindi" } as const;

/**
 * Topic Detail → Watch: the topic's videos in your lesson language first (intro, full lecture,
 * problem walkthrough), the other language one click away. Pick one and it plays here, in the
 * privacy-enhanced YouTube embed.
 */
export function TopicVideos({ topicId }: { topicId: string }) {
  const lang = usePrefs().data?.videoLang ?? "en";
  const watched = useWatchedVideos().data ?? new Map<string, number>();
  const [showOther, setShowOther] = useState(false);
  const [playing, setPlaying] = useState<string | null>(null);
  const all = RESOURCES[topicId]?.videos ?? [];
  if (!all.length) return null;
  const other = lang === "en" ? "hi" : "en";
  const mine = all.filter((v) => v.lang === lang);
  const rest = all.filter((v) => v.lang === other);
  // No video in your language: show the others straight away, and say so.
  const shown = mine.length ? (showOther ? [...mine, ...rest] : mine) : rest;
  const current = all.find((v) => v.id === playing);
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-label text-ink-muted">Watch</h4>
      {!mine.length && <p className="text-body-sm text-ink-muted">No {LANG_NAME[lang]} video for this topic yet; these are in {LANG_NAME[other]}.</p>}
      {current && <VideoPlayer key={current.id} video={current} watched={watched.has(current.id)} />}
      <ul className="-mx-2 flex flex-col">
        {shown.map((v) => {
          const seen = watched.has(v.id);
          return (
            <li key={`${v.lang}-${v.id}`}>
              <button
                type="button"
                aria-pressed={playing === v.id}
                onClick={() => setPlaying(playing === v.id ? null : v.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover",
                  playing === v.id && "bg-glass-hover",
                )}
              >
                <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-abyss-sunken text-ink-muted">
                  {seen ? <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} /> : <Play aria-hidden className="ml-0.5 size-3.5" fill="currentColor" />}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="line-clamp-2 text-body-sm text-ink">{v.title}</span>
                  <span className="truncate text-label text-ink-muted">
                    {ROLE[v.role]}, {v.channel}, {v.minutes} min{v.lang !== lang ? `, ${LANG_NAME[v.lang]}` : ""}
                    {seen ? ", watched" : ""}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {mine.length > 0 && rest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowOther((s) => !s)}
          className="self-start rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
        >
          {showOther ? `Hide ${LANG_NAME[other]} videos` : `Also in ${LANG_NAME[other]} (${rest.length})`}
        </button>
      )}
    </div>
  );
}
