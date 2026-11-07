import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Check, Lock, Play } from "lucide-react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { lessonPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { useDismissSolveGuide, useLearnHistory, useLibrary, useRecordLearn, useSolveGuideSeen } from "@/data/learn";
import { usePath, useSetWatched, type PathView } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { openTarget, useSolveIndex, useTickProblem } from "@/data/sheets";
import { lessonChecks, lessonNext, lessonStage, type LessonNext, type LessonStage } from "@/engine/learn";
import { mainVideo, type PathStep, type PathVideo, type VideoLang } from "@/engine/path";
import { DEFAULT_CODE_LANG, lessonCandidates, pickCodeItIn, type CodeItIn, type CodeLang } from "@/engine/codeLang";
import type { LibraryVideo } from "@/engine/learn";
import { CODE_TEMPLATES } from "@/data/path/templates";
import { CodeChip } from "@/components/CodeChip";
import { CodeTemplate } from "./CodeTemplate";
import { problemStatus } from "@/engine/sheets";
import { LangToggle } from "@/features/path/shared";
import { VideoPlayer, WatchedButton, YouTubeButton } from "@/features/path/VideoPlayer";
import { useRewardPulse } from "@/features/quests/QuestList";
import { LessonProblemRow } from "@/features/path/LessonProblemRow";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { useShellFooter } from "@/components/shell/footerSlot";
import { Breadcrumb, LANG_NAME } from "./parts";
import { ConnectLeetCode, SolveGuide } from "./SolveHelp";
import { solveGuideOpen } from "./solveGuide";
import { CODE_LANG_NAMES, codeItIn, LABELS } from "@/lib/glossary";

function videosFor(step: PathStep, lang: VideoLang): PathVideo[] {
  const own = step.videos[lang];
  return own.length ? own : step.videos[lang === "en" ? "hi" : "en"];
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Read: the pattern in five lines (when to use it, the idea, common mistakes), then a code template in your language (v1.5). */
function ReadCard({ step, ahead = false, checked = false }: { step: PathStep; ahead?: boolean; checked?: boolean }) {
  const codeLang = usePrefs().data?.codeLang ?? DEFAULT_CODE_LANG;
  const code = CODE_TEMPLATES[step.id];
  return (
    <section id="read" aria-labelledby="read-title" className="glass-card flex h-full scroll-mt-4 flex-col gap-4 p-6">
      <CardHeader
        id="read-title"
        title={ahead ? "Read ahead" : "2. Read"}
        description={code ? "The pattern in five lines, and code to start from." : "The pattern in five lines."}
        pill={
          checked ? (
            <>
              <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />
              Read
            </>
          ) : undefined
        }
      />
      <dl className="flex flex-col gap-4 text-body">
        <div className="flex flex-col gap-1">
          <dt className="text-label font-semibold text-ink-muted">When to use it</dt>
          <dd className="text-ink">{step.read.when}</dd>
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label font-semibold text-ink-muted">The idea</dt>
          {step.read.idea.map((l) => (
            <dd key={l} className="text-ink">
              {l}
            </dd>
          ))}
        </div>
        <div className="flex flex-col gap-1">
          <dt className="text-label font-semibold text-ink-muted">Common mistakes</dt>
          {step.read.mistakes.map((l) => (
            <dd key={l} className="text-ink">
              {l}
            </dd>
          ))}
        </div>
      </dl>
      {code && (
        <div className="flex flex-col gap-1">
          <h3 className="text-label font-semibold text-ink-muted">The code</h3>
          <CodeTemplate key={codeLang} code={code} mine={codeLang} />
        </div>
      )}
    </section>
  );
}

/** Other videos for this step: play one in the big player instead. */
function MoreVideos({ list, current, main, view, onPick }: { list: PathVideo[]; current: { id: string }; main: PathVideo | null; view: PathView; onPick: (id: string) => void }) {
  const codeLang = usePrefs().data?.codeLang;
  const others = list.filter((v) => v.id !== current.id);
  if (!others.length) return null;
  return (
    <section aria-labelledby="more-title" className="glass-card flex h-full flex-col gap-3 p-6">
      <CardHeader id="more-title" title="More videos" description={current.id === main?.id ? "Extras for this step, if you want more." : "The main video is the one that finishes the step."} />
      <ul className="-mx-2 flex flex-col">
        {others.map((v) => (
          <li key={v.id} className="flex items-center gap-3 rounded-sm px-2 py-1.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
            <button type="button" onClick={() => onPick(v.id)} className="flex min-w-0 flex-1 items-center gap-3 rounded-xs text-left" aria-label={`Play ${v.title} in the player`}>
              <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-abyss-sunken text-ink-muted">
                {view.watched.has(v.id) ? <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} /> : <Play aria-hidden className="ml-0.5 size-3.5" fill="currentColor" />}
              </span>
              <span className="flex min-w-0 flex-col">
                <span className="line-clamp-2 text-body-sm text-ink">{v.title}</span>
                <span className="flex min-w-0 items-center gap-1.5">
                  <CodeChip video={v} mine={codeLang} />
                  <span className="truncate text-label text-ink-muted">
                    {v.role === "main" ? "Main video, " : ""}
                    {v.channel}, {v.minutes} min{view.watched.has(v.id) ? ", watched" : ""}
                  </span>
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * "Code it in <language>" (v1.5): the lesson's main video explains the idea; this points at a verified
 * walkthrough that writes the code in your language. With none yet, it says so and offers the closest
 * one in another language. Playing it uses the big player above.
 */
function CodeItCard({ result, codeLang, videoLang, playingId, watched, onPlay }: {
  result: CodeItIn<LibraryVideo>;
  codeLang: CodeLang;
  videoLang: VideoLang;
  playingId: string | null;
  watched: ReadonlySet<string>;
  onPlay: (id: string) => void;
}) {
  const name = CODE_LANG_NAMES[codeLang];
  const video = result.kind === "match" ? result.video : result.alternative?.video;
  return (
    <section aria-labelledby="codeit-title" className="glass-card flex flex-col gap-3 p-6">
      <CardHeader
        id="codeit-title"
        title={codeItIn(codeLang)}
        description={
          result.kind === "match"
            ? `A walkthrough that writes the code in ${name}.`
            : result.alternative
              ? `No verified ${name} walkthrough for this lesson yet. The closest is in ${CODE_LANG_NAMES[result.alternative.lang]}; the code under Read is in ${name}.`
              : `No verified ${name} walkthrough for this lesson yet. The code under Read is in ${name}.`
        }
      />
      {video && (
        <button
          type="button"
          onClick={() => onPlay(video.id)}
          aria-pressed={playingId === video.id}
          aria-label={`Play ${video.title} in the player`}
          className={cn(
            "-mx-2 flex items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover",
            playingId === video.id && "bg-glass-hover",
          )}
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-abyss-sunken text-ink-muted">
            {watched.has(video.id) ? <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} /> : <Play aria-hidden className="ml-0.5 size-3.5" fill="currentColor" />}
          </span>
          <span className="flex min-w-0 flex-col">
            <span className="line-clamp-2 text-body-sm text-ink">{video.title}</span>
            <span className="flex min-w-0 items-center gap-1.5">
              <CodeChip video={video} mine={codeLang} />
              <span className="truncate text-label text-ink-muted">
                {video.channel}, {video.minutes} min{video.lang !== videoLang ? `, ${LANG_NAME[video.lang]}` : ""}
                {watched.has(video.id) ? ", watched" : ""}
              </span>
            </span>
          </span>
        </button>
      )}
      <Link to="/settings" className="self-start rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
        Change the language you code in
      </Link>
    </section>
  );
}

/**
 * Solve: the step's problems in order. Required ones finish the step; the rest are extra practice.
 * v1.4: a beginner sees "How to solve on LeetCode" here until "Got it" (anyone can reopen it), and
 * "Connect LeetCode to tick automatically" while there's no username.
 */
function SolveCard({ step, view, focusKey }: { step: PathStep; view: PathView; focusKey: string | null }) {
  const idx = useSolveIndex().data;
  const mode = usePrefs().data?.mode ?? "smart";
  const seen = useSolveGuideSeen().data;
  const dismiss = useDismissSolveGuide();
  const [requested, setRequested] = useState(false);
  const s = view.steps.find((x) => x.step.id === step.id)!;
  // Wait for the pref, so a returning beginner never sees the guide flash open.
  const open = seen !== undefined && solveGuideOpen({ mode, seen, requested });
  return (
    <section id="solve" aria-labelledby="solve-title" className="glass-card flex scroll-mt-4 flex-col gap-4 p-6">
      <CardHeader
        id="solve-title"
        title="3. Solve"
        description="Easy problems, in order. Solve each one on LeetCode, then tick it here."
        pill={`${s.requiredDone} of ${s.required} solved`}
        actions={
          !open ? (
            <button
              type="button"
              onClick={() => setRequested(true)}
              className="rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
            >
              {LABELS.howToSolve}
            </button>
          ) : undefined
        }
      />
      {open && (
        <SolveGuide
          doneLabel={requested && seen ? "Hide" : "Got it"}
          onDone={() => {
            setRequested(false);
            if (!seen) dismiss.mutate();
          }}
        />
      )}
      <ul className="-mx-3 flex flex-col">
        {step.problems.map((p) => (
          <LessonProblemRow key={p.key} p={p} status={idx ? problemStatus(p.key, idx) : { done: view.isDone(p.key), source: null, at: null }} next={focusKey === p.key} />
        ))}
      </ul>
      <ConnectLeetCode />
    </section>
  );
}

const STAGES: { id: Exclude<LessonStage, "done">; label: string; target: string }[] = [
  { id: "watch", label: "Watch", target: "watch" },
  { id: "read", label: "Read", target: "read" },
  { id: "solve", label: "Solve", target: "solve" },
];

/**
 * The flow bar: Watch → Read → Solve with checkmarks, and the lesson's one primary Next button.
 * v1.4: it sits in the shell's footer strip, under the scroll area (not over it), on the Float plane,
 * so the next action is always in view and nothing on the page is ever hidden behind it.
 */
function FlowBar({
  checks,
  stage,
  solveCount,
  next,
  onNext,
  busy,
  secondary,
}: {
  checks: Record<"watch" | "read" | "solve", boolean>;
  stage: LessonStage;
  solveCount: string;
  next: LessonNext;
  onNext: () => void;
  busy: boolean;
  secondary?: React.ReactNode;
}) {
  return (
    <div data-flow-bar className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md border border-glass-border-strong bg-abyss-raised px-4 py-3 shadow-float">
      <ol aria-label="Lesson steps" className="flex items-center gap-2">
        {STAGES.map((st, i) => {
          const done = checks[st.id];
          const here = stage === st.id;
          return (
            <li key={st.id} className="flex items-center gap-2">
              {i > 0 && <span aria-hidden className={cn("h-px w-5", checks[STAGES[i - 1]!.id] ? "bg-success" : "bg-glass-border-strong")} />}
              <button
                type="button"
                onClick={() => scrollTo(st.target)}
                aria-current={here ? "step" : undefined}
                className={cn(
                  "flex h-8 items-center gap-2 rounded-full pr-3 pl-1 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
                  here ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
                )}
              >
                <span
                  className={cn(
                    "numeric grid size-6 place-items-center rounded-full text-label font-semibold",
                    done ? "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-success" : here ? "bg-accent text-accent-ink" : "bg-abyss-sunken text-ink-muted",
                  )}
                >
                  {done ? <Check aria-hidden className="size-3.5" strokeWidth={3} /> : i + 1}
                </span>
                {st.label}
                {st.id === "solve" && <span className="numeric text-ink-muted">{solveCount}</span>}
                <span className="sr-only">{done ? ", done" : here ? ", now" : ""}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <div className="flex min-w-0 items-center gap-3">
        {secondary}
        <Button onClick={onNext} disabled={busy} className="max-w-[420px]">
          <span className="truncate">{next.label}</span>
        </Button>
      </div>
    </div>
  );
}

/** Learn → Beginner Path → one step, in focus mode: a big video, then Read and Solve, and one Next button. */
export function Lesson() {
  const { stepId } = useParams();
  const path = usePath();
  const navigate = useNavigate();
  const lang = usePrefs().data?.videoLang ?? "en";
  const history = useLearnHistory().data;
  const record = useRecordLearn();
  const setWatched = useSetWatched();
  const tick = useTickProblem();
  const idx = useSolveIndex().data;
  const pulse = useRewardPulse(`path:${stepId ?? ""}`);
  const footer = useShellFooter();
  const [playingId, setPlayingId] = useState<string | null>(null);
  const prefs = usePrefs().data;
  const codeLang = prefs?.codeLang ?? DEFAULT_CODE_LANG;
  const library = useLibrary();
  const [opened, setOpened] = useState<Set<string>>(new Set());

  const view = path.data;
  const index = view?.steps.findIndex((s) => s.step.id === stepId) ?? -1;
  const s = view && index >= 0 ? view.steps[index]! : null;

  // Remember the lesson for "Continue learning" (not a locked one: you can't work on it yet).
  useEffect(() => {
    if (s && s.state !== "locked") record.mutate({ kind: "lesson", stepId: s.step.id });
  }, [s?.step.id, s?.state]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new lesson starts on its main video, with nothing opened.
  useEffect(() => {
    setPlayingId(null);
    setOpened(new Set());
  }, [stepId]);
  // Arriving from Today's "Do this next" (v1.4): land on the part it named (Read or Solve).
  const focus = (useLocation().state as { focus?: string } | null)?.focus;
  const loaded = !!s;
  useEffect(() => {
    if (!loaded || (focus !== "read" && focus !== "solve")) return;
    const t = window.setTimeout(() => scrollTo(focus), 150);
    return () => window.clearTimeout(t);
  }, [stepId, focus, loaded]);

  if (path.isLoading) return <p className="text-body-sm text-ink-muted">Loading the lesson…</p>;
  if (!view || !s) {
    return (
      <EmptyState
        icon={Lock}
        title="No such lesson"
        action={
          <Link to="/learn" className="text-body-sm text-ink underline underline-offset-4">
            Go to Learn
          </Link>
        }
      >
        This link doesn't point at a step of the Beginner Path.
      </EmptyState>
    );
  }
  const step = s.step;
  const total = view.steps.length;
  const nextStep = view.steps[index + 1] ?? null;
  const prevStep = view.steps[index - 1];
  const crumbs = [{ label: "Learn", to: "/learn" }, { label: "Beginner Path", to: "/learn#path" }, { label: `Step ${index + 1}` }];

  if (s.state === "locked") {
    const cur = view.steps[view.current ?? 0]!;
    return (
      <div className="flex flex-col gap-6">
        <Breadcrumb crumbs={crumbs} />
        <section aria-labelledby="lesson-title" className="glass-card flex flex-col gap-3 p-6">
          <span className="numeric text-body-sm text-ink-muted">
            Step {index + 1} of {total}
          </span>
          <h2 id="lesson-title" className="font-display text-display font-semibold text-ink">
            {step.title}
          </h2>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-glass-border-strong p-4">
            <p className="flex items-center gap-2 text-body text-ink-muted">
              <Lock aria-hidden className="size-4" strokeWidth={2} />
              Locked. It opens when step {index}, {prevStep?.step.title}, is done. You can read ahead below.
            </p>
            <Button onClick={() => navigate(lessonPath(cur.step.id))}>
              Go to step {(view.current ?? 0) + 1}: {cur.step.title}
            </Button>
          </div>
        </section>
        <div className="max-w-[720px]">
          <ReadCard step={step} ahead />
        </div>
      </div>
    );
  }

  const list = videosFor(step, lang);
  const main = mainVideo(step, lang);
  // v1.5: the "Code it in" video can come from the library (another video language, or the lesson's topics).
  const codeIt = pickCodeItIn<LibraryVideo>(lessonCandidates(library.groups, index, step.topics), codeLang, lang);
  const codeItVideo = codeIt.kind === "match" ? codeIt.video : (codeIt.alternative?.video ?? null);
  const pool: (PathVideo | LibraryVideo)[] = codeItVideo && !list.some((v) => v.id === codeItVideo.id) ? [...list, codeItVideo] : list;
  const current = pool.find((v) => v.id === playingId) ?? main ?? list[0]!;
  const currentKind = current.id === main?.id ? "Main video" : current.id === codeItVideo?.id ? "Walkthrough" : "Extra video";
  const stepDone = s.state === "done";
  const read = history?.read.includes(step.id) ?? false;
  const isDone = (key: string) => (idx ? problemStatus(key, idx).done : view.isDone(key));
  const next = lessonNext({ progress: s, read, stepDone, problems: step.problems, isDone, opened, nextStep: nextStep?.step ?? null });
  const checks = lessonChecks(s, read, stepDone);
  const stage = lessonStage(next);
  const focusKey = next.kind === "open" || next.kind === "solved" ? next.problem.key : null;
  const busy = setWatched.isPending || tick.isPending || record.isPending;

  const onNext = () => {
    switch (next.kind) {
      case "watch":
        if (main) setWatched.mutate({ videoId: main.id, watched: true }, { onSuccess: () => scrollTo("read") });
        return;
      case "read":
        record.mutate({ kind: "read", stepId: step.id }, { onSuccess: () => scrollTo("solve") });
        return;
      case "open": {
        const p = step.problems.find((x) => x.key === next.problem.key)!;
        const t = openTarget(p);
        if (t) openExternal(t.url);
        setOpened((o) => new Set(o).add(p.key));
        scrollTo("solve");
        return;
      }
      case "solved": {
        const p = step.problems.find((x) => x.key === next.problem.key)!;
        tick.mutate({ problem: p, done: true });
        return;
      }
      case "next-step":
        navigate(lessonPath(next.step.id));
        return;
      case "finish":
        navigate("/practice/sheets");
    }
  };
  const solvedProblem = next.kind === "solved" ? step.problems.find((x) => x.key === next.problem.key) : undefined;
  const reopen = solvedProblem && openTarget(solvedProblem);

  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <section id="watch" aria-labelledby="lesson-title" className={cn("col-span-12 flex scroll-mt-4 flex-col gap-4 rounded-lg", pulse && "aura-pulse")}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Breadcrumb crumbs={crumbs} />
          <LangToggle />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="numeric text-body-sm text-ink-muted">
            Step {index + 1} of {total}
          </span>
          <h2 id="lesson-title" className="font-display text-headline font-semibold text-ink">
            {step.title}
          </h2>
          <p className="text-body-sm text-ink-muted">{step.subtitle}</p>
        </div>
        {/* As wide as the column allows while its title row and the Next bar still fit on screen (1100x700 included). */}
        <div className="mx-auto w-full" style={{ maxWidth: "min(1120px, calc((100vh - 410px) * 16 / 9))" }}>
          <VideoPlayer key={current.id} video={current} watched={view.watched.has(current.id)} frameOnly />
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{current.title}</span>
              <span className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-ink-muted">
                <CodeChip video={current} mine={codeLang} />
                <span>
                  {currentKind}, {current.channel}, {current.minutes} min
                </span>
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <WatchedButton videoId={current.id} watched={view.watched.has(current.id)} />
              <YouTubeButton id={current.id} />
            </div>
          </div>
        </div>
      </section>

      {stepDone && (
        <div className="col-span-12 flex flex-wrap items-center gap-2 rounded-md bg-abyss-sunken p-4 text-body text-ink">
          <Check aria-hidden className="size-4 text-success" strokeWidth={2.6} />
          Step done.{nextStep ? ` Step ${index + 2}, ${nextStep.step.title}, is unlocked.` : " That's the whole Beginner Path."}
        </div>
      )}

      <div className="col-span-12 lg:col-span-7">
        <ReadCard step={step} checked={checks.read} />
      </div>
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-5">
        <CodeItCard
          result={codeIt}
          codeLang={codeLang}
          videoLang={lang}
          playingId={playingId}
          watched={view.watched}
          onPlay={(id) => {
            setPlayingId(id);
            scrollTo("watch");
          }}
        />
        <MoreVideos
          list={list}
          current={current}
          main={main}
          view={view}
          onPick={(id) => {
            setPlayingId(id);
            scrollTo("watch");
          }}
        />
      </div>
      <div className="col-span-12">
        <SolveCard step={step} view={view} focusKey={focusKey} />
      </div>

      {footer &&
        createPortal(
          <FlowBar
            checks={checks}
            stage={stage}
            solveCount={`${s.requiredDone}/${s.required}`}
            next={next}
            onNext={onNext}
            busy={busy}
            secondary={
              reopen ? (
                <Button variant="ghost" size="sm" onClick={() => openExternal(reopen.url)}>
                  Open it again
                </Button>
              ) : undefined
            }
          />,
          footer,
        )}
    </div>
  );
}
