import { useEffect, useState } from "react";
import { Check, Lock, Play } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { lessonPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { useLearnHistory, useRecordLearn } from "@/data/learn";
import { usePath, useSetWatched, type PathView } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { openTarget, useSolveIndex, useTickProblem } from "@/data/sheets";
import { lessonChecks, lessonNext, lessonStage, type LessonNext, type LessonStage } from "@/engine/learn";
import { mainVideo, type PathStep, type PathVideo, type VideoLang } from "@/engine/path";
import { problemStatus } from "@/engine/sheets";
import { LangToggle } from "@/features/path/shared";
import { VideoPlayer, WatchedButton, YouTubeButton } from "@/features/path/VideoPlayer";
import { useRewardPulse } from "@/features/quests/QuestList";
import { OpenButton, sourceLabel, TickBox } from "@/features/sheets/parts";
import { openExternal } from "@/lib/openExternal";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "./parts";

function videosFor(step: PathStep, lang: VideoLang): PathVideo[] {
  const own = step.videos[lang];
  return own.length ? own : step.videos[lang === "en" ? "hi" : "en"];
}

const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

/** Read: the pattern in five lines (when to use it, the idea, common mistakes). */
function ReadCard({ step, ahead = false, checked = false }: { step: PathStep; ahead?: boolean; checked?: boolean }) {
  return (
    <section id="read" aria-labelledby="read-title" className="glass-card flex h-full scroll-mt-4 flex-col gap-4 p-6">
      <CardHeader
        id="read-title"
        title={ahead ? "Read ahead" : "2. Read"}
        description="The pattern in five lines."
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
    </section>
  );
}

/** Other videos for this step: play one in the big player instead. */
function MoreVideos({ list, current, main, view, onPick }: { list: PathVideo[]; current: PathVideo; main: PathVideo | null; view: PathView; onPick: (id: string) => void }) {
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
                <span className="text-label text-ink-muted">
                  {v.role === "main" ? "Main video, " : ""}
                  {v.channel}, {v.minutes} min{view.watched.has(v.id) ? ", watched" : ""}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Solve: the step's problems in order. Required ones finish the step; the rest are extra practice. */
function SolveCard({ step, view, focusKey }: { step: PathStep; view: PathView; focusKey: string | null }) {
  const idx = useSolveIndex().data;
  const s = view.steps.find((x) => x.step.id === step.id)!;
  return (
    <section id="solve" aria-labelledby="solve-title" className="glass-card flex scroll-mt-4 flex-col gap-4 p-6">
      <CardHeader
        id="solve-title"
        title="3. Solve"
        description="Easy problems, in order. Solve each one on LeetCode, then tick it here."
        pill={`${s.requiredDone}/${s.required} required`}
      />
      <ul className="-mx-3 flex flex-col">
        {step.problems.map((p) => {
          const st = idx ? problemStatus(p.key, idx) : { done: view.isDone(p.key), source: null, at: null };
          return (
            <li
              key={p.key}
              aria-current={focusKey === p.key ? "step" : undefined}
              className={cn("flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover", focusKey === p.key && "bg-abyss-sunken")}
            >
              <TickBox problem={p} status={st} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className={cn("truncate text-body", st.done ? "text-ink-muted" : "text-ink")}>{p.title}</span>
                <span className="flex items-center gap-1.5 text-label text-ink-muted">
                  {st.done ? (
                    <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.4} />
                  ) : (
                    <span aria-hidden className={cn("size-1.5 rounded-full", p.cf ? "bg-platform-cf" : "bg-platform-lc")} />
                  )}
                  <span>
                    <span className={st.done ? "text-ink" : undefined}>{st.done ? sourceLabel(p, st) : p.cf ? "Codeforces" : "LeetCode"}</span>
                    {p.required ? ", required" : ", extra practice"}
                  </span>
                </span>
              </span>
              <span className="w-16 shrink-0 text-right text-body-sm text-ink-muted">
                {p.difficulty ?? (p.rating ? <span className="numeric font-display font-semibold text-ink">{p.rating}</span> : "–")}
              </span>
              <OpenButton problem={p} />
            </li>
          );
        })}
      </ul>
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
 * Sticky at the bottom of the screen, on the Float plane, so the next action is always in view.
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
    <div className="sticky bottom-4 z-20 col-span-12 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 rounded-md border border-glass-border-strong bg-abyss-raised px-4 py-3 shadow-float">
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
  const [playingId, setPlayingId] = useState<string | null>(null);
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
  const current = list.find((v) => v.id === playingId) ?? main ?? list[0]!;
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
        <div className="mx-auto w-full" style={{ maxWidth: "min(1120px, calc((100vh - 380px) * 16 / 9))" }}>
          <VideoPlayer key={current.id} video={current} watched={view.watched.has(current.id)} frameOnly />
          <div className="mt-3 flex flex-wrap items-start justify-between gap-3">
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="text-body font-semibold text-ink">{current.title}</span>
              <span className="text-body-sm text-ink-muted">
                {current.id === main?.id ? "Main video" : "Extra video"}, {current.channel}, {current.minutes} min
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
      <div className="col-span-12 lg:col-span-5">
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
      />
    </div>
  );
}
