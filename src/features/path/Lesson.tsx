import { useState } from "react";
import { Check, ChevronLeft, Lock, Play } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { CardHeader, Pill } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { usePath, type PathView } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { useSolveIndex } from "@/data/sheets";
import { mainVideo, type PathStep, type PathVideo, type VideoLang } from "@/engine/path";
import { problemStatus } from "@/engine/sheets";
import { useRewardPulse } from "@/features/quests/QuestList";
import { OpenButton, sourceLabel, TickBox } from "@/features/sheets/parts";
import { cn } from "@/lib/utils";
import { LangToggle, lessonPath } from "./shared";
import { VideoPlayer, WatchedButton } from "./VideoPlayer";

function videosFor(step: PathStep, lang: VideoLang): PathVideo[] {
  const own = step.videos[lang];
  return own.length ? own : step.videos[lang === "en" ? "hi" : "en"];
}

/** Watch: the main video in your language (pick an extra to play it instead), then the extras. */
function WatchCard({ step, view, lang }: { step: PathStep; view: PathView; lang: VideoLang }) {
  const list = videosFor(step, lang);
  const main = mainVideo(step, lang);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const current = list.find((v) => v.id === playingId) ?? main ?? list[0];
  if (!current) return null;
  const extras = list.filter((v) => v.id !== current.id);
  return (
    <section aria-labelledby="watch-title" className="glass-card flex h-full flex-col gap-4 p-6">
      <CardHeader
        id="watch-title"
        title="1. Watch"
        description={current.id === main?.id ? "The main video. Mark it watched when you're done." : "An extra. The main video is what finishes the step."}
        actions={<LangToggle />}
      />
      {/* key: a new video starts on its thumbnail, not mid-play. */}
      <VideoPlayer key={current.id} video={current} watched={view.watched.has(current.id)} />
      {extras.length > 0 && (
        <div className="flex flex-col gap-1">
          <h3 className="text-label text-ink-muted">{current.id === main?.id ? "Extras, if you want more" : "More videos for this step"}</h3>
          <ul className="-mx-2 flex flex-col">
            {extras.map((v) => (
              <li key={v.id} className="flex items-center gap-3 rounded-sm px-2 py-1.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
                <button
                  type="button"
                  onClick={() => setPlayingId(v.id)}
                  className="flex min-w-0 flex-1 items-center gap-3 rounded-xs text-left"
                  aria-label={`Play ${v.title} here`}
                >
                  <span className="grid size-8 shrink-0 place-items-center rounded-sm bg-abyss-sunken text-ink-muted">
                    <Play aria-hidden className="ml-0.5 size-3.5" fill="currentColor" />
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate text-body-sm text-ink">{v.title}</span>
                    <span className="text-label text-ink-muted">
                      {v.role === "main" ? "Main video, " : ""}
                      {v.channel}, {v.minutes} min
                    </span>
                  </span>
                </button>
                <WatchedButton videoId={v.id} watched={view.watched.has(v.id)} compact />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

/** Read: the pattern in five lines (when to use it, the idea, common mistakes). */
function ReadCard({ step, ahead = false }: { step: PathStep; ahead?: boolean }) {
  return (
    <section aria-labelledby="read-title" className="glass-card flex h-full flex-col gap-4 p-6">
      <CardHeader id="read-title" title={ahead ? "Read ahead" : "2. Read"} description="The pattern in five lines." />
      <dl className="flex flex-col gap-4 text-body-sm">
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

/** Solve: the step's problems in order. Required ones finish the step; the rest are extra practice. */
function SolveCard({ step, view }: { step: PathStep; view: PathView }) {
  const idx = useSolveIndex().data;
  const s = view.steps.find((x) => x.step.id === step.id)!;
  return (
    <section aria-labelledby="solve-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="solve-title"
        title="3. Solve"
        description="Easy problems, in order. Solve them on LeetCode and they tick themselves after the next sync; solved one somewhere else? Tick it here."
        pill={`${s.requiredDone}/${s.required} required`}
      />
      <ul className="-mx-3 flex flex-col">
        {step.problems.map((p) => {
          const st = idx ? problemStatus(p.key, idx) : { done: view.isDone(p.key), source: null, at: null };
          return (
            <li key={p.key} className="flex items-center gap-3 rounded-sm px-3 py-2 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
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

/** Practice → Beginner Path → one step: Watch, Read, Solve. */
export function Lesson() {
  const { stepId } = useParams();
  const path = usePath();
  const navigate = useNavigate();
  const lang = usePrefs().data?.videoLang ?? "en";
  const pulse = useRewardPulse(`path:${stepId ?? ""}`);
  if (path.isLoading) return <p className="text-body-sm text-ink-muted">Loading the lesson…</p>;
  const view = path.data;
  const index = view?.steps.findIndex((s) => s.step.id === stepId) ?? -1;
  if (!view || index < 0) {
    return (
      <EmptyState icon={Lock} title="No such lesson" action={<Link to="/practice/path" className="text-body-sm text-ink underline underline-offset-4">See the Beginner Path</Link>}>
        This link doesn't point at a step of the Beginner Path.
      </EmptyState>
    );
  }
  const s = view.steps[index]!;
  const step = s.step;
  const total = view.steps.length;
  const next = view.steps[index + 1];
  const prevStep = view.steps[index - 1];

  return (
    <div className="grid grid-cols-12 items-stretch gap-6">
      <section aria-labelledby="lesson-title" className={cn("glass-card col-span-12 flex flex-col gap-3 p-6", pulse && "aura-pulse")}>
        <Link to="/practice/path" className="flex items-center gap-1 self-start rounded-xs text-body-sm text-ink-muted hover:text-ink">
          <ChevronLeft aria-hidden className="size-4" />
          Beginner Path
        </Link>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="numeric text-body-sm text-ink-muted">
              Step {index + 1} of {total}
            </span>
            <h2 id="lesson-title" className="font-display text-display font-semibold text-ink">
              {step.title}
            </h2>
            <p className="text-body text-ink-muted">{step.subtitle}</p>
          </div>
          {s.state !== "locked" && (
            <ul aria-label="To finish this step" className="flex flex-wrap items-center gap-2">
              <li>
                <Pill className={s.watched ? undefined : "bg-abyss-sunken text-ink-muted"}>
                  {s.watched && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />}
                  {s.watched ? "Main video watched" : "Main video not watched yet"}
                </Pill>
              </li>
              <li>
                <Pill className={s.requiredDone === s.required ? undefined : "bg-abyss-sunken text-ink-muted"}>
                  {s.requiredDone === s.required && <Check aria-hidden className="size-3.5 text-success" strokeWidth={2.6} />}
                  {s.requiredDone}/{s.required} required problems
                </Pill>
              </li>
            </ul>
          )}
        </div>
        {s.state === "done" && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-abyss-sunken p-4">
            <p className="flex items-center gap-2 text-body text-ink">
              <Check aria-hidden className="size-4 text-success" strokeWidth={2.6} />
              Step done.{next ? ` Step ${index + 2}, ${next.step.title}, is unlocked.` : " That's the whole path."}
            </p>
            {next ? (
              <Button onClick={() => navigate(lessonPath(next.step.id))}>Go to step {index + 2}</Button>
            ) : (
              <Button onClick={() => navigate("/practice/sheets")}>Pick a sheet</Button>
            )}
          </div>
        )}
        {s.state === "locked" && prevStep && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-dashed border-glass-border-strong p-4">
            <p className="flex items-center gap-2 text-body text-ink-muted">
              <Lock aria-hidden className="size-4" strokeWidth={2} />
              Locked. It opens when step {index}, {prevStep.step.title}, is done. You can read ahead below.
            </p>
            <Button variant="outline" size="sm" onClick={() => navigate(lessonPath(view.steps[view.current ?? 0]!.step.id))}>
              Go to step {(view.current ?? 0) + 1}
            </Button>
          </div>
        )}
      </section>

      {s.state === "locked" ? (
        <div className="col-span-12 lg:col-span-6">
          <ReadCard step={step} ahead />
        </div>
      ) : (
        <>
          <div className="col-span-12 lg:col-span-8">
            <WatchCard step={step} view={view} lang={lang} />
          </div>
          <div className="col-span-12 lg:col-span-4">
            <ReadCard step={step} />
          </div>
          <div className="col-span-12">
            <SolveCard step={step} view={view} />
          </div>
        </>
      )}
    </div>
  );
}
