import { useState } from "react";
import { Check, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useSetWatched } from "@/data/path";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";

export interface Video {
  id: string;
  title: string;
  channel: string;
  minutes: number;
}

export const watchUrl = (id: string) => `https://www.youtube.com/watch?v=${id}`;

/**
 * A lesson video, played inside the app with YouTube's privacy-enhanced embed (youtube-nocookie.com).
 * Nothing loads from YouTube until you press play: a thumbnail stands in. "Watch on YouTube" is
 * always there too, for when the embed can't play (offline, or a video that blocks embedding).
 * Videos are never downloaded or rehosted.
 */
export function VideoPlayer({
  video,
  watched,
  autoStart = false,
  onPlay,
  frameOnly = false,
}: {
  video: Video;
  watched: boolean;
  /** Start playing straight away (you picked this video, e.g. from the library). */
  autoStart?: boolean;
  /** Called when playback starts (Learn remembers the last video). */
  onPlay?: () => void;
  /** Just the 16:9 frame: the page lays out the title and actions itself (the lesson page). */
  frameOnly?: boolean;
}) {
  const [playing, setPlaying] = useState(autoStart);
  const play = () => {
    setPlaying(true);
    onPlay?.();
  };
  const [thumbFailed, setThumbFailed] = useState(false);
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-video overflow-hidden rounded-md bg-abyss-sunken">
        {/* Thumbnails are 480x360 (hqdefault); maxres isn't there for every video. */}
        {playing ? (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`}
            title={video.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 size-full border-0"
          />
        ) : (
          <button type="button" onClick={play} aria-label={`Play ${video.title}`} className="group absolute inset-0 grid place-items-center">
            {!thumbFailed && (
              <img
                src={thumbUrl(video.id)}
                alt=""
                loading="lazy"
                onError={() => setThumbFailed(true)}
                className="absolute inset-0 size-full object-cover"
              />
            )}
            <span
              aria-hidden
              className="relative grid size-16 place-items-center rounded-full bg-[color-mix(in_oklab,var(--abyss)_72%,transparent)] text-ink shadow-float transition-transform duration-[var(--dur-fast)] group-hover:scale-105"
            >
              <Play className="ml-1 size-7" fill="currentColor" strokeWidth={1.5} />
            </span>
            <span className="absolute right-3 bottom-3 rounded-xs bg-[color-mix(in_oklab,var(--abyss)_72%,transparent)] px-2 py-0.5 text-label text-ink">
              {video.minutes} min
            </span>
          </button>
        )}
      </div>
      {!frameOnly && (
        <div className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="text-body font-semibold text-ink">{video.title}</span>
            <span className="text-body-sm text-ink-muted">
              {video.channel}, {video.minutes} min
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <WatchedButton videoId={video.id} watched={watched} />
            <YouTubeButton id={video.id} />
          </div>
        </div>
      )}
    </div>
  );
}

/** "Mark as watched", stored in SQLite. Watched shows a Success check and the word, never colour alone. */
export function WatchedButton({ videoId, watched, compact = false }: { videoId: string; watched: boolean; compact?: boolean }) {
  const set = useSetWatched();
  return (
    <Button
      variant={watched ? "ghost" : "outline"}
      size="sm"
      aria-pressed={watched}
      disabled={set.isPending}
      onClick={() => set.mutate({ videoId, watched: !watched })}
      className={cn(compact && "h-7 px-2")}
    >
      {watched ? (
        <>
          <Check aria-hidden className="text-success" strokeWidth={2.4} />
          Watched
        </>
      ) : (
        "Mark as watched"
      )}
    </Button>
  );
}

/** Opens the video on youtube.com in the browser (for when the embed can't play). */
export function YouTubeButton({ id }: { id: string }) {
  return (
    <Button variant="ghost" size="sm" onClick={() => openExternal(watchUrl(id))}>
      <ExternalLink aria-hidden />
      Watch on YouTube
    </Button>
  );
}

/** YouTube's thumbnail for a video (no request to YouTube beyond the image, CSP allows i.ytimg.com). */
export const thumbUrl = (id: string, size: "mq" | "hq" = "hq") => `https://i.ytimg.com/vi/${id}/${size}default.jpg`;

/**
 * A video thumbnail that never reads as blank (v1.4: the audit's library showed an empty grey tile).
 * A faint play glyph sits underneath until the image loads; a size that fails falls back to the
 * other one, and if both fail the glyph stays. Fill a positioned, sunken box with it.
 */
export function Thumb({ id, size = "hq", lazy = true }: { id: string; size?: "mq" | "hq"; lazy?: boolean }) {
  const order: ("mq" | "hq")[] = size === "mq" ? ["mq", "hq"] : ["hq", "mq"];
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const src = order[attempt];
  return (
    <>
      <span aria-hidden className="absolute inset-0 grid place-items-center text-ink-faint">
        <Play className="size-5 opacity-60" strokeWidth={1.5} />
      </span>
      {src && (
        <img
          key={src}
          src={thumbUrl(id, src)}
          alt=""
          loading={lazy ? "lazy" : "eager"}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setAttempt((a) => a + 1)}
          className={cn("absolute inset-0 size-full object-cover transition-opacity duration-[var(--dur-fast)]", loaded ? "opacity-100" : "opacity-0")}
        />
      )}
    </>
  );
}
