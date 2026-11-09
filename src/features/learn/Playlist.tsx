import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronLeft, ChevronRight, ListVideo } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { CodeChip } from "@/components/CodeChip";
import { EmptyState } from "@/components/EmptyState";
import { playlistPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { useLearnHistory, useRecordLearn } from "@/data/learn";
import { useSetWatched, useWatchedVideos } from "@/data/path";
import { useProblemPool } from "@/data/mustDo";
import { usePlaylists } from "@/data/playlists";
import { usePrefs } from "@/data/prefs";
import { partTopics } from "@/engine/mustDo";
import { frontierIndex, lengthLabel, playlistMinutes, playlistProgress, resumeIndex, type Playlist } from "@/engine/playlists";
import { LABELS, partOf, watchedOf } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { VideoPlayer, WatchedButton, YouTubeButton } from "@/features/path/VideoPlayer";
import { Breadcrumb, LANG_NAME } from "./parts";
import { PracticeThis } from "./PracticeThis";

/** Learn's Playlists card lives at /learn#playlists. */
const PLAYLISTS_CRUMB = "/learn#playlists";

/** "12 of 56 watched" over a thin accent meter: how far along a playlist you are. */
export function PlaylistMeter({ p, watched, className }: { p: Pick<Playlist, "videos" | "name">; watched: ReadonlySet<string>; className?: string }) {
  const prog = playlistProgress(p, watched);
  return (
    <span className={cn("flex items-center gap-2", className)}>
      <span
        role="meter"
        aria-label={`${p.name}: ${watchedOf(prog.watched, prog.total)}`}
        aria-valuemin={0}
        aria-valuemax={prog.total}
        aria-valuenow={prog.watched}
        className="relative block h-1.5 w-20 shrink-0 overflow-hidden rounded-full bg-glass-border-strong"
      >
        <span
          className="absolute inset-0 origin-left rounded-full bg-accent transition-transform duration-[var(--dur-slow)] ease-out-quint"
          style={{ transform: `scaleX(${prog.total ? prog.watched / prog.total : 0})` }}
        />
      </span>
      <span className="numeric text-label text-ink-muted">{watchedOf(prog.watched, prog.total)}</span>
    </span>
  );
}

/**
 * One full playlist (v1.6): the current part big on the left, every part in order on the right
 * (numbered discs that turn into checks as you watch). Opens where you left off; `?v=` picks a part.
 * The one primary button marks the part watched and moves to the next (v1.8: once a part is watched
 * it says Next part, with Watched beside it to undo; there's no second "Mark as watched").
 */
export function PlaylistPage() {
  const { playlistId } = useParams();
  const [params, setParams] = useSearchParams();
  const playlists = usePlaylists();
  const history = useLearnHistory().data;
  const watchedMap = useWatchedVideos().data;
  const watched = useMemo(() => new Set(watchedMap?.keys() ?? []), [watchedMap]);
  const record = useRecordLearn();
  const setWatched = useSetWatched();
  const navigate = useNavigate();
  const codeLang = usePrefs().data?.codeLang;
  // Playback starts on its own only once you've picked a part on this page.
  const [picked, setPicked] = useState(false);
  // v1.6: after "I've watched it, next part", Practice this stays on the part you just watched.
  const [justWatched, setJustWatched] = useState<number | null>(null);
  const pool = useProblemPool().data;
  const listRef = useRef<HTMLOListElement>(null);

  const p = playlists.data?.find((x) => x.id === playlistId);
  const lastOpened = p ? history?.playlistAt[p.id] : undefined;
  const resumeAt = p ? resumeIndex(p, lastOpened, watched) : 0;
  const asked = params.get("v");
  const askedAt = p && asked ? p.videos.findIndex((v) => v.id === asked) : -1;
  // The part on screen: the one in the link, or (once history and watched have loaded) where you left off.
  const ready = !!p && history !== undefined && watchedMap !== undefined;
  const index = askedAt >= 0 ? askedAt : resumeAt;
  const v = p?.videos[index];
  // Each part's topic: its own words, the problem it solves, or the part before it (partTopics).
  const topics = useMemo(() => (p && pool ? partTopics(p.videos.map((x) => x.title), p.scope === "course" ? [] : p.topics, pool) : null), [p, pool]);

  // Pin the part in the URL once known, so moving around (and Back) is stable.
  useEffect(() => {
    if (ready && v && askedAt < 0) setParams({ v: v.id }, { replace: true });
  }, [ready, v?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Remember the part as the last one opened (Continue learning, Continue where I left off).
  useEffect(() => {
    if (ready && p && v && askedAt >= 0) record.mutate({ kind: "playlist", id: p.id, videoId: v.id });
  }, [ready, p?.id, v?.id, askedAt >= 0]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the current part in view in the list. Only the list scrolls (scrollIntoView would move the
  // whole page and hide the breadcrumb).
  useEffect(() => {
    const list = listRef.current;
    const row = list?.querySelector<HTMLElement>("[aria-current='true']");
    if (!list || !row) return;
    if (row.offsetTop < list.scrollTop || row.offsetTop + row.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = row.offsetTop - list.clientHeight / 3;
    }
  }, [index, ready]);

  if (playlists.isLoading || (p && !ready)) return <p className="text-body-sm text-ink-muted">Loading the playlist…</p>;
  if (!p || !v) {
    return (
      <EmptyState
        icon={ListVideo}
        title="No such playlist"
        action={
          <Link to={PLAYLISTS_CRUMB} className="text-body-sm text-ink underline underline-offset-4">
            See all playlists
          </Link>
        }
      >
        This link doesn't point at a playlist in Learn.
      </EmptyState>
    );
  }

  const total = p.videos.length;
  const go = (i: number) => {
    setPicked(true);
    setJustWatched(null);
    navigate(playlistPath(p.id, p.videos[i]!.id), { replace: true });
  };
  const seen = watched.has(v.id);
  const last = index === total - 1;
  const next = () => {
    if (!seen) setWatched.mutate({ videoId: v.id, watched: true });
    if (!last) {
      go(index + 1);
      setJustWatched(index);
    }
  };
  const practiceAt = justWatched !== null && justWatched === index - 1 ? justWatched : index;
  const practiced = p.videos[practiceAt]!;
  // "Continue where I left off" on the page: the part after the furthest one you've watched, when
  // you've wandered off it (not when it's simply the next part after the one you just watched).
  const frontier = frontierIndex(p, watched);
  const away = frontier !== null && frontier !== index && !(frontier === index + 1 && seen);

  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12">
        <Breadcrumb crumbs={[{ label: "Learn", to: "/learn" }, { label: LABELS.playlists, to: PLAYLISTS_CRUMB }, { label: p.name }]} />
      </div>
      <section aria-labelledby="part-title" className="col-span-12 flex min-w-0 flex-col gap-3 lg:col-span-8">
        <VideoPlayer key={v.id} video={{ ...v, channel: p.channel }} watched={seen} autoStart={picked} frameOnly />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center justify-between gap-3">
            <p className="numeric text-body-sm text-ink-muted">{partOf(index + 1, total)}</p>
            <span className="-my-1 flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-7 px-2" disabled={index === 0} onClick={() => go(index - 1)} aria-label="Previous part" title="Previous part">
                <ChevronLeft aria-hidden />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 px-2" disabled={last} onClick={() => go(index + 1)} aria-label="Next part" title="Next part">
                <ChevronRight aria-hidden />
              </Button>
            </span>
          </div>
          <h2 id="part-title" className="text-title font-semibold text-ink">
            {v.title}
          </h2>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-muted">
            <CodeChip video={p} mine={codeLang} />
            <span>
              {p.channel}, {v.minutes} min, {LANG_NAME[p.lang]}
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* v1.8: one watched action. Not watched: mark it and move on. Watched: move on, with the Watched state (click to undo) beside it. */}
          {!seen ? (
            <Button onClick={next} disabled={setWatched.isPending}>
              {last ? LABELS.watchedLast : LABELS.watchedNext}
              {!last && <ChevronRight aria-hidden />}
            </Button>
          ) : (
            !last && (
              <Button onClick={() => go(index + 1)}>
                {LABELS.nextPart}
                <ChevronRight aria-hidden />
              </Button>
            )
          )}
          {seen && <WatchedButton videoId={v.id} watched />}
          <YouTubeButton id={v.id} />
        </div>
      </section>
      <aside aria-labelledby="parts-title" className="glass-card col-span-12 flex min-w-0 flex-col lg:col-span-4">
        <div className="flex flex-col gap-2 border-b border-glass-border p-4">
          <h3 id="parts-title" className="line-clamp-2 text-body font-semibold text-ink" title={p.title}>
            {p.name}
          </h3>
          <p className="text-label text-ink-muted">
            {p.channel}, {total} videos, {lengthLabel(playlistMinutes(p))}
          </p>
          <PlaylistMeter p={p} watched={watched} />
          {away && (
            <Button variant="outline" size="sm" className="w-full" onClick={() => go(frontier)} title={partOf(frontier + 1, total)}>
              {LABELS.continuePlaylist}
            </Button>
          )}
        </div>
        <ol ref={listRef} aria-label="Parts" className="relative flex max-h-[max(320px,calc(100vh-300px))] flex-col overflow-y-auto p-2">
          {p.videos.map((x, i) => {
            const done = watched.has(x.id);
            const current = i === index;
            return (
              <li key={x.id}>
                <button
                  type="button"
                  aria-current={current ? "true" : undefined}
                  onClick={() => go(i)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-sm px-2 py-2 text-left transition-colors duration-[var(--dur-fast)]",
                    current ? "bg-abyss-sunken" : "hover:bg-glass-hover",
                  )}
                >
                  <span
                    className={cn(
                      "numeric grid size-6 shrink-0 place-items-center rounded-full text-label font-semibold",
                      done ? "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success" : current ? "bg-accent text-accent-ink" : "bg-abyss-sunken text-ink-muted",
                    )}
                  >
                    {done ? <Check aria-hidden className="size-3.5" strokeWidth={2.8} /> : i + 1}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className={cn("line-clamp-2 text-body-sm", current ? "font-medium text-ink" : "text-ink")}>{x.title}</span>
                    <span className="numeric text-label text-ink-muted">
                      {x.minutes} min{done ? ", watched" : ""}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </aside>
      {/* v1.6: must-do problems for the part, full width so every row fits on one line. */}
      <PracticeThis
        videoTitle={practiced.title}
        topic={topics?.[practiceAt] ?? null}
        watched={watched.has(practiced.id)}
        title={practiceAt !== index ? LABELS.practiceJustWatched : LABELS.practiceThis}
        subtitle={practiceAt !== index ? `${partOf(practiceAt + 1, total)}: ${practiced.title}` : undefined}
        actions={
          practiceAt !== index ? (
            <button
              type="button"
              onClick={() => setJustWatched(null)}
              className="rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
            >
              This part's problems
            </button>
          ) : undefined
        }
        className="col-span-12"
      />
    </div>
  );
}
