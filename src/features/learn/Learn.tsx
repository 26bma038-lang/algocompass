import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Lock, Play, Search, Trophy, X } from "lucide-react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { CardHeader, Pill } from "@/components/CardHeader";
import { lessonPath, watchPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLearnHistory, useLibrary } from "@/data/learn";
import { usePath, useWatchedVideos, type PathView } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { useTopicReport } from "@/data/queries";
import { useUiStore } from "@/data/uiStore";
import { CONTESTS_MILESTONE_STEP, continueLearning, filterLibrary, findVideo, libraryVideoCount, type LibraryFilter, type TopicGroup } from "@/engine/learn";
import { mainVideo, nextAction } from "@/engine/path";
import type { TopicStatus } from "@/engine/strength";
import { TOPIC_BY_ID } from "@/engine/topics";
import { stripProgress } from "@/features/path/shared";
import { thumbUrl } from "@/features/path/VideoPlayer";
import { useRewardPulse } from "@/features/quests/QuestList";
import { SectionStrip } from "@/features/sheets/SectionStrip";
import { cn } from "@/lib/utils";
import { LANG_NAME, Segmented, VideoRow } from "./parts";

/** A big thumbnail that resumes with one click (the card's one bold element). */
function ResumeThumb({ id, label, onClick, minutes }: { id: string | null; label: string; onClick: () => void; minutes?: number }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="group relative aspect-video w-full overflow-hidden rounded-md bg-abyss-sunken">
      {id && <img src={thumbUrl(id)} alt="" className="absolute inset-0 size-full object-cover" />}
      <span className="absolute inset-0 grid place-items-center">
        <span
          aria-hidden
          className="grid size-14 place-items-center rounded-full bg-[color-mix(in_oklab,var(--abyss)_72%,transparent)] text-ink shadow-float transition-transform duration-[var(--dur-fast)] group-hover:scale-105"
        >
          <Play className="ml-1 size-6" fill="currentColor" strokeWidth={1.5} />
        </span>
      </span>
      {minutes !== undefined && (
        <span className="numeric absolute right-2 bottom-2 rounded-xs bg-[color-mix(in_oklab,var(--abyss)_72%,transparent)] px-2 py-0.5 text-label text-ink">{minutes} min</span>
      )}
    </button>
  );
}

/** "Continue learning": the current lesson or the last video, one click to resume. */
function ContinueCard({ view, groups, weakness }: { view: PathView; groups: TopicGroup[]; weakness: ReadonlyMap<string, number> }) {
  const navigate = useNavigate();
  const history = useLearnHistory().data;
  const prefs = usePrefs().data;
  const lang = prefs?.videoLang ?? "en";
  const mode = prefs?.mode ?? "smart";
  const watched = useWatchedVideos().data ?? new Map<string, number>();
  if (!history) return <section aria-busy className="glass-card col-span-12 h-[228px]" />;
  const target = continueLearning({ history, path: view, pathData: view.path, groups, mode, weakness, watched: new Set(watched.keys()), lang });
  const total = view.steps.length;

  if (target.kind === "done") {
    return (
      <section aria-labelledby="continue-title" className="glass-card col-span-12 flex flex-col gap-3 p-6">
        <p className="text-body-sm text-ink-muted">Continue learning</p>
        <h2 id="continue-title" className="font-display text-display font-semibold text-ink">
          You finished the Beginner Path
        </h2>
        <p className="max-w-[62ch] text-body text-ink-muted">All {total} steps are done. Pick any topic below to keep watching, or follow a full sheet in Practice.</p>
        <div>
          <Button onClick={() => navigate("/practice/sheets")}>Pick a sheet</Button>
        </div>
      </section>
    );
  }

  if (target.kind === "video") {
    const found = findVideo(groups, target.videoId)!;
    const v = found.video;
    const seen = watched.has(v.id);
    const topic = groups.find((g) => g.topicId === target.topicId)?.name ?? found.group.name;
    const open = () => navigate(`${watchPath(v.id)}?topic=${encodeURIComponent(target.topicId)}`);
    const fromHistory = history.video?.id === v.id;
    const cur = view.current !== null ? view.steps[view.current]! : null;
    return (
      <section aria-labelledby="continue-title" className="glass-card col-span-12 grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[320px_minmax(0,1fr)]">
        <ResumeThumb id={v.id} label={`Play ${v.title}`} onClick={open} minutes={v.minutes} />
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <p className="text-body-sm text-ink-muted">{fromHistory ? "Continue learning" : `Suggested for you: ${topic}, a topic to work on`}</p>
            <h2 id="continue-title" className="line-clamp-2 font-display text-headline font-semibold text-ink">
              {v.title}
            </h2>
            <p className="text-body-sm text-ink-muted">
              {topic}, {v.channel}, {v.minutes} min, {LANG_NAME[v.lang]}
            </p>
            <p className="flex items-center gap-1.5 text-body-sm text-ink">
              {seen ? (
                <>
                  <Check aria-hidden className="size-4 text-success" strokeWidth={2.6} />
                  Watched. The next video in {topic.toLowerCase()} is a click away.
                </>
              ) : (
                "Not marked watched yet."
              )}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button onClick={open}>{fromHistory ? "Resume video" : "Play video"}</Button>
            {cur && (
              <Link to={lessonPath(cur.step.id)} className="text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
                Or the Beginner Path, step {(view.current ?? 0) + 1}: {cur.step.title}
              </Link>
            )}
          </div>
        </div>
      </section>
    );
  }

  const s = view.steps[target.stepIndex]!;
  const video = mainVideo(s.step, lang);
  const action = nextAction(s, video);
  const open = () => navigate(lessonPath(s.step.id));
  return (
    <section aria-labelledby="continue-title" className="glass-card col-span-12 grid grid-cols-1 items-center gap-6 p-6 md:grid-cols-[320px_minmax(0,1fr)]">
      <ResumeThumb id={video?.id ?? null} label={`Open step ${target.stepIndex + 1}, ${s.step.title}`} onClick={open} minutes={video?.minutes} />
      <div className="flex min-w-0 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <p className="text-body-sm text-ink-muted">{target.fresh ? "Start here" : "Continue learning"}</p>
          <h2 id="continue-title" className="font-display text-display font-semibold text-ink">
            Step {target.stepIndex + 1} of {total}: {s.step.title}
          </h2>
          <p className="text-body text-ink-muted">{s.step.subtitle}</p>
          <p className="text-title font-semibold text-ink">{action.label}</p>
        </div>
        <ul aria-label="This step" className="flex flex-wrap items-center gap-2">
          <li>
            <Pill className={s.watched ? undefined : "bg-abyss-sunken text-ink-muted"}>
              {s.watched && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />}
              {s.watched ? "Video watched" : "Video not watched yet"}
            </Pill>
          </li>
          <li>
            <Pill className={s.requiredDone === s.required ? undefined : "bg-abyss-sunken text-ink-muted"}>
              {s.requiredDone === s.required && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />}
              {s.requiredDone}/{s.required} problems
            </Pill>
          </li>
        </ul>
        <div>
          <Button onClick={open}>{target.fresh ? `Start step ${target.stepIndex + 1}` : `Continue step ${target.stepIndex + 1}`}</Button>
        </div>
      </div>
    </section>
  );
}

function StepRow({ view, index, milestone }: { view: PathView; index: number; milestone: boolean }) {
  const s = view.steps[index]!;
  const pulse = useRewardPulse(`path:${s.step.id}`);
  const locked = s.state === "locked";
  const body = (
    <>
      <span
        className={cn(
          "numeric grid size-8 shrink-0 place-items-center rounded-sm font-display text-body font-semibold",
          s.state === "done" ? "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success" : s.state === "current" ? "bg-accent-soft text-ink" : "bg-abyss-sunken text-ink-faint",
        )}
      >
        {s.state === "done" ? <Check aria-hidden className="size-4" strokeWidth={2.6} /> : index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-body font-medium", locked ? "text-ink-muted" : "text-ink")}>{s.step.title}</span>
        <span className="truncate text-label text-ink-muted">
          {s.state === "done" ? "Done" : s.state === "current" ? `You're here, ${s.requiredDone}/${s.required} problems` : milestone ? "Unlocks Contests" : s.step.subtitle}
        </span>
      </span>
      {locked ? (
        <span className="flex shrink-0 items-center gap-1 text-label text-ink-muted">
          {milestone ? <Trophy aria-hidden className="size-3.5" strokeWidth={2} /> : <Lock aria-hidden className="size-3.5" strokeWidth={2} />}
          <span className="sr-only">Locked</span>
        </span>
      ) : (
        <ChevronRight aria-hidden className="size-4 shrink-0 text-ink-muted" />
      )}
    </>
  );
  const cls = cn("flex items-center gap-3 rounded-sm px-3 py-2", pulse && "aura-pulse", s.state === "current" && "bg-abyss-sunken");
  return (
    <li>
      {locked ? (
        <div className={cls} aria-label={`Step ${index + 1}, ${s.step.title}: locked until step ${index} is done${milestone ? ". Finishing it adds Contests to the sidebar" : ""}`}>
          {body}
        </div>
      ) : (
        <Link to={lessonPath(s.step.id)} aria-current={s.state === "current" ? "step" : undefined} className={cn(cls, "transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover")}>
          <span className="sr-only">Step {index + 1}, {s.state === "done" ? "done" : "current"}: </span>
          {body}
        </Link>
      )}
    </li>
  );
}

/** The Beginner Path's 14 steps: done, current, locked. Open in Beginner mode; folded in smart mode. */
function RoadmapCard({ view }: { view: PathView }) {
  const mode = usePrefs().data?.mode ?? "smart";
  const navigate = useNavigate();
  const atPath = useLocation().hash === "#path";
  const [open, setOpen] = useState(mode === "beginner" || atPath);
  const listId = useId();
  const ref = useRef<HTMLElement>(null);
  // "Beginner Path" in a lesson's breadcrumb lands here (/learn#path).
  useEffect(() => {
    if (atPath) ref.current?.scrollIntoView({ block: "start" });
  }, [atPath]);
  const total = view.steps.length;
  const half = Math.ceil(total / 2);
  return (
    <section ref={ref} id="path" aria-labelledby="path-title" className="glass-card col-span-12 flex scroll-mt-4 flex-col gap-5 p-6">
      <CardHeader
        id="path-title"
        title={view.path.name}
        description={`${total} steps from loops to dynamic programming. Each is a lesson: watch a short video, read the pattern, solve a few easy problems.`}
        pill={`${view.doneCount}/${total} steps done`}
      />
      <SectionStrip
        sections={stripProgress(view)}
        titles={view.steps.map((s) => s.step.title)}
        label="Step"
        current={view.current ?? undefined}
        onSelect={(i) => view.steps[i]!.state !== "locked" && navigate(lessonPath(view.steps[i]!.step.id))}
      />
      {open && (
        <ol id={listId} className="-mx-3 grid grid-cols-1 gap-x-6 gap-y-0.5 lg:grid-flow-col lg:grid-cols-2" style={{ gridTemplateRows: `repeat(${half}, auto)` }}>
          {view.steps.map((s, i) => (
            <StepRow key={s.step.id} view={view} index={i} milestone={mode === "beginner" && s.step.id === CONTESTS_MILESTONE_STEP && s.state !== "done"} />
          ))}
        </ol>
      )}
      <button
        type="button"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted hover:text-ink"
      >
        <ChevronDown aria-hidden className={cn("size-4 transition-transform duration-[var(--dur-fast)]", open && "rotate-180")} />
        {open ? "Hide the steps" : `Show all ${total} steps`}
      </button>
    </section>
  );
}

const STATUS_WORD: Partial<Record<TopicStatus, string>> = { Weak: "Weak topic", Developing: "Still developing" };

/** Every verified video, grouped by topic, with search and filters. */
function LibraryCard({ groups }: { groups: TopicGroup[] }) {
  const [params, setParams] = useSearchParams();
  const topicParam = params.get("topic");
  const topic = topicParam && TOPIC_BY_ID.has(topicParam) ? topicParam : null;
  const prefs = usePrefs().data;
  const mode = prefs?.mode ?? "smart";
  const [lang, setLang] = useState<LibraryFilter["lang"]>(prefs?.videoLang ?? "en");
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [unwatchedOnly, setUnwatchedOnly] = useState(false);
  const watchedMap = useWatchedVideos().data;
  const watched = useMemo(() => new Set(watchedMap?.keys() ?? []), [watchedMap]);
  const report = useTopicReport().data;
  const openTopic = useUiStore((s) => s.openTopic);
  const ref = useRef<HTMLElement>(null);
  const searchId = useId();
  const topicSelectId = useId();

  // Arriving filtered to a topic (Topic Detail, a sheet section, Ctrl+K): bring the library into view.
  useEffect(() => {
    if (topic) ref.current?.scrollIntoView({ block: "start" });
  }, [topic]);

  const shown = filterLibrary(groups, { lang, query, topic, unwatchedOnly }, watched);
  const status = new Map(report?.hasData ? report.topics.map((t) => [t.topicId, t.status]) : []);
  const setTopic = (id: string | null) => {
    const next = new URLSearchParams(params);
    if (id) next.set("topic", id);
    else next.delete("topic");
    setParams(next, { replace: true });
  };
  const count = libraryVideoCount(groups);
  const order =
    mode === "smart" ? (report?.hasData ? " Your weakest topics come first." : " Your weakest topics move to the top after your first sync.") : " Beginner Path topics first, in step order.";
  const clear = () => {
    setQuery("");
    setUnwatchedOnly(false);
    setTopic(null);
    setLang("all");
  };

  return (
    <section ref={ref} id="library" aria-labelledby="library-title" className="glass-card col-span-12 flex scroll-mt-4 flex-col gap-5 p-6">
      <CardHeader id="library-title" title="Video library" description={`${count} videos across ${groups.length} topics, each checked on YouTube.${order}`} pill={`${watched.size} watched`} />
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-52 flex-1 basis-52">
          <label htmlFor={searchId} className="sr-only">
            Search topics and video titles
          </label>
          <Search aria-hidden className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-faint" />
          <Input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search topics and videos" className="pl-9" />
        </div>
        <Segmented
          label="Video language"
          value={lang}
          onChange={setLang}
          options={[
            { id: "en", label: "English" },
            { id: "hi", label: "Hindi" },
            { id: "all", label: "Both" },
          ]}
        />
        <button
          type="button"
          aria-pressed={unwatchedOnly}
          onClick={() => setUnwatchedOnly((u) => !u)}
          className={cn(
            "h-7 rounded-full border px-3 text-label transition-colors duration-[var(--dur-fast)]",
            unwatchedOnly ? "border-accent bg-accent-soft text-ink" : "border-glass-border bg-glass text-ink-muted hover:border-glass-border-strong hover:text-ink",
          )}
        >
          Not watched yet
        </button>
        <label htmlFor={topicSelectId} className="sr-only">
          Topic
        </label>
        <select
          id={topicSelectId}
          value={topic ?? ""}
          onChange={(e) => setTopic(e.target.value || null)}
          className="h-[38px] w-44 rounded-sm border border-glass-border bg-abyss-sunken px-3 text-body-sm text-ink hover:border-glass-border-strong"
        >
          <option value="">All topics</option>
          {groups.map((g) => (
            <option key={g.topicId} value={g.topicId}>
              {g.name}
            </option>
          ))}
        </select>
      </div>
      {topic && (
        <div className="-mt-1 flex flex-wrap items-center gap-2 text-body-sm text-ink-muted">
          <span>
            Showing <span className="text-ink">{TOPIC_BY_ID.get(topic)?.name}</span> only.
          </span>
          <button type="button" onClick={() => setTopic(null)} className="flex items-center gap-1 rounded-xs text-ink underline decoration-glass-border-strong underline-offset-4">
            <X aria-hidden className="size-3.5" />
            Show every topic
          </button>
        </div>
      )}
      {shown.length === 0 ? (
        <div className="flex flex-col items-start gap-3 rounded-md border border-dashed border-glass-border-strong p-5">
          <p className="text-body text-ink">No videos match.</p>
          <p className="max-w-[56ch] text-body-sm text-ink-muted">
            {lang !== "all" && !query && topic ? `This topic has no ${LANG_NAME[lang]} video yet. Try Both.` : "Try a topic name like \"binary search\", or clear the filters."}
          </p>
          <Button variant="outline" size="sm" onClick={clear}>
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          {shown.map((g) => {
            const st = mode === "smart" ? STATUS_WORD[status.get(g.topicId) ?? "Mastered"] : undefined;
            const seen = g.videos.filter((v) => watched.has(v.id)).length;
            return (
              <section key={g.topicId} aria-labelledby={`lib-${g.topicId}`} className="flex flex-col gap-2 border-t border-glass-border pt-4 first:border-t-0 first:pt-0">
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <h3 id={`lib-${g.topicId}`} className="text-title font-semibold text-ink">
                    {g.name}
                  </h3>
                  {st && <Pill>{st}</Pill>}
                  <span className="numeric text-label text-ink-muted">
                    {g.videos.length} {g.videos.length === 1 ? "video" : "videos"}
                    {seen > 0 ? `, ${seen} watched` : ""}
                  </span>
                  <button
                    type="button"
                    onClick={() => openTopic(g.topicId)}
                    className="ml-auto rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
                  >
                    Topic details
                  </button>
                </div>
                <ul className="-mx-2 grid grid-cols-1 gap-x-4 lg:grid-cols-2">
                  {g.videos.map((v) => (
                    <VideoRow key={`${v.lang}-${v.id}`} v={v} topicId={g.topicId} watched={watched.has(v.id)} showLang={lang === "all"} />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </section>
  );
}

/**
 * Learn (v1.3): Continue learning, the Beginner Path's roadmap, and every verified video by topic.
 * Lessons open at /learn/path/:step, single videos at /learn/watch/:id.
 */
export function Learn() {
  const path = usePath();
  const { groups, weakness } = useLibrary();
  if (path.isLoading) return <p className="text-body-sm text-ink-muted">Loading your lessons…</p>;
  if (!path.data) return <p className="text-body-sm text-ink-muted">The lessons didn't load: {String(path.error ?? "unknown error")}</p>;
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <ContinueCard view={path.data} groups={groups} weakness={weakness} />
      <RoadmapCard view={path.data} />
      <LibraryCard groups={groups} />
    </div>
  );
}
