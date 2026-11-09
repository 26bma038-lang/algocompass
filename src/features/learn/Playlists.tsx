import { useMemo, useState } from "react";
import { ChevronDown, ListVideo } from "lucide-react";
import { Link } from "react-router-dom";
import { CodeChip } from "@/components/CodeChip";
import { playlistPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { useLearnHistory } from "@/data/learn";
import { useWatchedVideos } from "@/data/path";
import { usePlaylists } from "@/data/playlists";
import { usePrefs } from "@/data/prefs";
import { DEFAULT_CODE_LANG } from "@/engine/codeLang";
import type { TopicGroup } from "@/engine/learn";
import { filterPlaylists, groupPlaylists, lengthLabel, playlistMinutes, playlistProgress, resumeIndex, type Playlist, type PlaylistFilter } from "@/engine/playlists";
import { TOPIC_BY_ID } from "@/engine/topics";
import { LABELS, partOf, plainTopicName } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { Thumb } from "@/features/path/VideoPlayer";
import { PlaylistMeter } from "./Playlist";
import { LANG_NAME } from "./parts";

/** Playlists a group shows before "Show all" (two rows of two), and topic groups before "Show all topics". */
const PER_GROUP = 4;
const GROUPS_SHOWN = 4;

const topicName = (id: string) => plainTopicName(id, TOPIC_BY_ID.get(id)?.name ?? id);

/**
 * One playlist: its first video's thumbnail on a stacked edge with the video count, the title, what
 * it codes in, channel and length, and once started, how far along you are. Opens where you left off.
 */
function PlaylistRow({ p, watched, lastOpened, showLang }: { p: Playlist; watched: ReadonlySet<string>; lastOpened?: string; showLang: boolean }) {
  const mine = usePrefs().data?.codeLang;
  const prog = playlistProgress(p, watched);
  const started = prog.watched > 0 || !!lastOpened;
  const at = resumeIndex(p, lastOpened, watched);
  return (
    <li>
      <Link to={playlistPath(p.id)} className="group flex items-start gap-3 rounded-sm p-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
        <span className="relative mt-1.5 w-28 shrink-0">
          {/* The stacked edge says "a series, not one video". */}
          <span aria-hidden className="absolute inset-x-2 -top-1.5 h-2 rounded-t-xs bg-glass-border-strong" />
          <span className="relative block aspect-video overflow-hidden rounded-xs bg-abyss-sunken">
            <Thumb id={p.videos[0]!.id} size="mq" />
            <span className="numeric absolute inset-y-0 right-0 flex w-12 flex-col items-center justify-center gap-0.5 bg-[color-mix(in_oklab,var(--abyss)_78%,transparent)] text-label text-ink">
              <ListVideo aria-hidden className="size-3.5" />
              {p.videos.length}
            </span>
          </span>
        </span>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
          <span className="line-clamp-2 text-body-sm font-medium text-ink" title={p.title}>
            {p.name}
          </span>
          <span className="flex min-w-0 flex-wrap items-center gap-x-1.5 gap-y-0.5">
            <CodeChip video={p} mine={mine} />
            <span className="text-label text-ink-muted">
              {p.channel}, {p.videos.length} videos, {lengthLabel(playlistMinutes(p))}
              {showLang ? `, ${LANG_NAME[p.lang]}` : ""}
            </span>
          </span>
          {started && (
            <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <PlaylistMeter p={p} watched={watched} />
              {prog.watched < prog.total && <span className="numeric text-label text-ink">Next: {partOf(at + 1, prog.total).toLowerCase()}</span>}
            </span>
          )}
        </span>
      </Link>
    </li>
  );
}

function Group({ id, title, playlists, watched, at, showLang, open }: { id: string; title: string; playlists: Playlist[]; watched: ReadonlySet<string>; at: Record<string, string>; showLang: boolean; open: boolean }) {
  const [all, setAll] = useState(open);
  const shown = all ? playlists : playlists.slice(0, PER_GROUP);
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2 border-t border-glass-border pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h3 id={id} className="text-title font-semibold text-ink">
          {title}
        </h3>
        <span className="numeric text-label text-ink-muted">
          {playlists.length} {playlists.length === 1 ? "playlist" : "playlists"}
        </span>
      </div>
      <ul className="-mx-2 grid grid-cols-1 gap-x-4 gap-y-1 lg:grid-cols-2">
        {shown.map((p) => (
          <PlaylistRow key={p.id} p={p} watched={watched} lastOpened={at[p.id]} showLang={showLang} />
        ))}
      </ul>
      {playlists.length > PER_GROUP && (
        <button type="button" aria-expanded={all} onClick={() => setAll((a) => !a)} className="flex items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted hover:text-ink">
          <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-[var(--dur-fast)]", all && "rotate-180")} />
          {all ? "Show fewer" : `Show all ${playlists.length}`}
        </button>
      )}
    </section>
  );
}

/** What Learn's browse card hands the playlists view (v1.8: one toolbar for playlists and videos). */
export interface BrowseFilters {
  lang: PlaylistFilter["lang"];
  /** Your language plus concepts ("mine"), or every language. */
  code: "mine" | "all";
  topic: string | null;
  query: string;
}

/** A playlist matches a search when its name, YouTube title or channel has every word. */
function matchesQuery(p: Playlist, query: string): boolean {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = `${p.name} ${p.title} ${p.channel}`.toLowerCase();
  return words.every((w) => hay.includes(w));
}

/** How many playlists and videos the filters leave (the browse card's pill). */
export function usePlaylistCount(f: BrowseFilters): { playlists: number; videos: number } | null {
  const codeLang = usePrefs().data?.codeLang ?? DEFAULT_CODE_LANG;
  const playlists = usePlaylists().data;
  if (!playlists) return null;
  const shown = filterPlaylists(playlists, { lang: f.lang, codeLang: f.code === "mine" ? codeLang : null, topic: f.topic }).filter((p) => matchesQuery(p, f.query));
  return { playlists: shown.length, videos: shown.reduce((n, p) => n + p.videos.length, 0) };
}

/**
 * Learn → Playlists (v1.6; v1.8 the body of Learn's browse card, whose one toolbar sets `f`): whole
 * YouTube courses and topic series, every video in order. Full courses first, then one group per
 * topic in the library's order (weakest first in smart mode, the path's order for beginners).
 */
export function PlaylistsBody({ groups, f, onEveryLanguage }: { groups: TopicGroup[]; f: BrowseFilters; onEveryLanguage: () => void }) {
  const prefs = usePrefs().data;
  const [allTopics, setAllTopics] = useState(false);
  const codeLang = prefs?.codeLang ?? DEFAULT_CODE_LANG;
  const playlists = usePlaylists().data;
  const at = useLearnHistory().data?.playlistAt ?? {};
  const watchedMap = useWatchedVideos().data;
  const watched = useMemo(() => new Set(watchedMap?.keys() ?? []), [watchedMap]);

  if (!playlists) return <div aria-busy className="h-[220px]" />;
  const shown = filterPlaylists(playlists, { lang: f.lang, codeLang: f.code === "mine" ? codeLang : null, topic: f.topic }).filter((p) => matchesQuery(p, f.query));
  const { courses, groups: byTopic } = groupPlaylists(shown, groups.map((g) => g.topicId));
  const narrowed = !!f.topic || f.query.trim() !== "";
  const visibleGroups = narrowed || allTopics ? byTopic : byTopic.slice(0, GROUPS_SHOWN);

  if (shown.length === 0) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-glass-border-strong p-5">
        <p className="text-body text-ink">No playlists match.</p>
        <p className="max-w-[56ch] text-body-sm text-ink-muted">
          {f.topic ? `No ${f.lang === "all" ? "" : `${LANG_NAME[f.lang]} `}playlist covers ${topicName(f.topic).toLowerCase()} yet.` : "Nothing in this language yet."} Try Both, or All languages,
          or switch to {LABELS.singleVideos.toLowerCase()}.
        </p>
        <Button variant="outline" size="sm" onClick={onEveryLanguage}>
          Show every language
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-6">
      {courses.length > 0 && <Group id="pl-courses" title={LABELS.fullCourses} playlists={courses} watched={watched} at={at} showLang={f.lang === "all"} open={false} />}
      {visibleGroups.map((g) => (
        <Group key={g.topicId} id={`pl-${g.topicId}`} title={topicName(g.topicId)} playlists={g.playlists} watched={watched} at={at} showLang={f.lang === "all"} open={f.topic === g.topicId} />
      ))}
      {!narrowed && byTopic.length > GROUPS_SHOWN && (
        <Button variant="outline" className="self-start" aria-expanded={allTopics} onClick={() => setAllTopics((a) => !a)}>
          {allTopics ? "Show fewer topics" : `Show all ${byTopic.length} topics`}
          <ChevronDown aria-hidden className={cn("transition-transform duration-[var(--dur-fast)]", allTopics && "rotate-180")} />
        </Button>
      )}
    </div>
  );
}
