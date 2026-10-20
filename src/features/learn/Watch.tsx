import { useEffect, useMemo } from "react";
import { PlayCircle } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { learnTopicPath, lessonPath } from "@/components/shell/nav";
import { useLibrary, useRecordLearn } from "@/data/learn";
import { useWatchedVideos } from "@/data/path";
import { useUiStore } from "@/data/uiStore";
import { findVideo } from "@/engine/learn";
import { VideoPlayer, WatchedButton, YouTubeButton } from "@/features/path/VideoPlayer";
import { Breadcrumb, LANG_NAME, roleLabel, VideoRow } from "./parts";

/**
 * Learn → one video, big. Opened from the library or Continue learning, so it starts playing
 * straight away. The rest of the topic's videos sit below, unwatched first.
 */
export function Watch() {
  const { videoId } = useParams();
  const [params] = useSearchParams();
  const { groups, path, ready } = useLibrary();
  const watched = useWatchedVideos().data ?? new Map<string, number>();
  const record = useRecordLearn();
  const openTopic = useUiStore((s) => s.openTopic);
  const found = useMemo(() => {
    const topic = params.get("topic");
    const inTopic = groups.find((g) => g.topicId === topic);
    const v = inTopic?.videos.find((x) => x.id === videoId);
    return v && inTopic ? { video: v, group: inTopic } : findVideo(groups, videoId ?? "");
  }, [groups, params, videoId]);

  useEffect(() => {
    if (found) record.mutate({ kind: "video", id: found.video.id });
  }, [found?.video.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!ready) return <p className="text-body-sm text-ink-muted">Loading the video…</p>;
  if (!found) {
    return (
      <EmptyState
        icon={PlayCircle}
        title="No such video"
        action={
          <Link to="/learn" className="text-body-sm text-ink underline underline-offset-4">
            Go to Learn
          </Link>
        }
      >
        This link doesn't point at a video in the library.
      </EmptyState>
    );
  }
  const { video: v, group } = found;
  const seen = watched.has(v.id);
  const step = v.step !== undefined ? path?.steps[v.step] : undefined;
  // The rest of the topic, unwatched first, in your language first.
  const rest = group.videos
    .filter((x) => x.id !== v.id)
    .sort((a, b) => Number(watched.has(a.id)) - Number(watched.has(b.id)) || Number(a.lang !== v.lang) - Number(b.lang !== v.lang));

  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12">
        <Breadcrumb crumbs={[{ label: "Learn", to: "/learn" }, { label: group.name, to: learnTopicPath(group.topicId) }, { label: v.title }]} />
      </div>
      <section aria-labelledby="video-title" className="col-span-12">
        <div className="mx-auto w-full" style={{ maxWidth: "min(1120px, calc((100vh - 300px) * 16 / 9))" }}>
          <VideoPlayer key={v.id} video={v} watched={seen} autoStart frameOnly />
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <h2 id="video-title" className="text-title font-semibold text-ink">
                {v.title}
              </h2>
              <p className="text-body-sm text-ink-muted">
                {roleLabel(v)}, {v.channel}, {v.minutes} min, {LANG_NAME[v.lang]}
              </p>
              {step && (
                <p className="text-body-sm text-ink-muted">
                  Part of the Beginner Path:{" "}
                  <Link to={lessonPath(step.id)} className="text-ink underline decoration-glass-border-strong underline-offset-4">
                    step {v.step! + 1}, {step.title}
                  </Link>
                </p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WatchedButton videoId={v.id} watched={seen} />
              <YouTubeButton id={v.id} />
            </div>
          </div>
        </div>
      </section>
      {rest.length > 0 && (
        <section aria-labelledby="more-title" className="glass-card col-span-12 flex flex-col gap-3 p-6">
          <CardHeader
            id="more-title"
            title={`More on ${group.name.toLowerCase()}`}
            description="Not watched yet comes first."
            actions={
              <button
                type="button"
                onClick={() => openTopic(group.topicId)}
                className="rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
              >
                Topic details
              </button>
            }
          />
          <ul className="-mx-2 grid grid-cols-1 gap-x-4 lg:grid-cols-2">
            {rest.map((x) => (
              <VideoRow key={`${x.lang}-${x.id}`} v={x} topicId={group.topicId} watched={watched.has(x.id)} showLang={x.lang !== v.lang} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
