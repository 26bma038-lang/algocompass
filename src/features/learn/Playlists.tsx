import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronDown, ListVideo, X } from "lucide-react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
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
import { LABELS, myLangAndConcepts, partOf, plainTopicName } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { Thumb } from "@/features/path/VideoPlayer";
import { PlaylistMeter } from "./Playlist";
import { LANG_NAME, Segmented } from "./parts";

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
          <span className="line-clamp-2 text-body-sm font-medium text-ink">{p.title}</span>
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

/**
 * Learn → Playlists (v1.6): whole YouTube courses and topic series, every video in order. Full
 * courses first, then one group per topic in the library's order (weakest first in smart mode, the
 * path's order for beginners). Filters: video language and your coding language plus concepts, and
 * the library's topic (`?topic=`).
 */
export function PlaylistsCard({ groups }: { groups: TopicGroup[] }) {
  const prefs = usePrefs().data;
  const [params, setParams] = useSearchParams();
  const topicParam = params.get("topic");
  const topic = topicParam && TOPIC_BY_ID.has(topicParam) ? topicParam : null;
  const [lang, setLang] = useState<PlaylistFilter["lang"]>(prefs?.videoLang ?? "en");
  const [code, setCode] = useState<"mine" | "all">("mine");
  const [allTopics, setAllTopics] = useState(false);
  const codeLang = prefs?.codeLang ?? DEFAULT_CODE_LANG;
  const playlists = usePlaylists().data;
  const at = useLearnHistory().data?.playlistAt ?? {};
  const watchedMap = useWatchedVideos().data;
  const watched = useMemo(() => new Set(watchedMap?.keys() ?? []), [watchedMap]);
  const ref = useRef<HTMLElement>(null);
  const atHash = useLocation().hash === "#playlists";
  // The playlist page's "Playlists" crumb lands here (/learn#playlists).
  useEffect(() => {
    if (atHash && playlists) ref.current?.scrollIntoView({ block: "start" });
  }, [atHash, !!playlists]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!playlists) return <section aria-busy className="glass-card col-span-12 h-[220px]" />;
  const shown = filterPlaylists(playlists, { lang, codeLang: code === "mine" ? codeLang : null, topic });
  const { courses, groups: byTopic } = groupPlaylists(shown, groups.map((g) => g.topicId));
  const videos = shown.reduce((n, p) => n + p.videos.length, 0);
  const visibleGroups = topic || allTopics ? byTopic : byTopic.slice(0, GROUPS_SHOWN);
  const clearTopic = () => {
    const next = new URLSearchParams(params);
    next.delete("topic");
    setParams(next, { replace: true });
  };

  return (
    <section ref={ref} id="playlists" aria-labelledby="playlists-title" className="glass-card col-span-12 flex scroll-mt-4 flex-col gap-5 p-6">
      <CardHeader
        id="playlists-title"
        title={LABELS.playlists}
        description="Whole YouTube courses and topic series, every video in order. Each one remembers where you left off."
        pill={`${shown.length} playlists, ${videos} videos`}
      />
      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label={LABELS.videoLanguage}
          value={lang}
          onChange={setLang}
          options={[
            { id: "en", label: "English" },
            { id: "hi", label: "Hindi" },
            { id: "all", label: "Both" },
          ]}
        />
        <Segmented
          label="Coding language"
          value={code}
          onChange={setCode}
          options={[
            { id: "mine", label: myLangAndConcepts(codeLang) },
            { id: "all", label: LABELS.allLanguages },
          ]}
        />
      </div>
      {topic && (
        <div className="-mt-1 flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
          <span>
            Showing playlists that cover <span className="text-ink">{topicName(topic)}</span>.
          </span>
          <button type="button" onClick={clearTopic} className="flex items-center gap-1 rounded-xs text-ink underline decoration-glass-border-strong underline-offset-4">
            <X aria-hidden className="size-3.5" />
            Show every topic
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-glass-border-strong p-5">
          <p className="text-body text-ink">No playlists match.</p>
          <p className="max-w-[56ch] text-body-sm text-ink-muted">
            {topic ? `No ${lang === "all" ? "" : `${LANG_NAME[lang]} `}playlist covers ${topicName(topic).toLowerCase()} yet.` : "Nothing in this language yet."} Try Both, or All languages.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setLang("all");
              setCode("all");
            }}
          >
            Show every language
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {courses.length > 0 && <Group id="pl-courses" title={LABELS.fullCourses} playlists={courses} watched={watched} at={at} showLang={lang === "all"} open={false} />}
          {visibleGroups.map((g) => (
            <Group key={g.topicId} id={`pl-${g.topicId}`} title={topicName(g.topicId)} playlists={g.playlists} watched={watched} at={at} showLang={lang === "all"} open={topic === g.topicId} />
          ))}
          {!topic && byTopic.length > GROUPS_SHOWN && (
            <Button variant="outline" className="self-start" aria-expanded={allTopics} onClick={() => setAllTopics((a) => !a)}>
              {allTopics ? "Show fewer topics" : `Show all ${byTopic.length} topics`}
              <ChevronDown aria-hidden className={cn("transition-transform duration-[var(--dur-fast)]", allTopics && "rotate-180")} />
            </Button>
          )}
        </div>
      )}
    </section>
  );
}
