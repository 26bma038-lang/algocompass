import { Check, ChevronRight, GraduationCap, Lock } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { EmptyState } from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { usePath, type PathView as View } from "@/data/path";
import { usePrefs, useUpdatePrefs, type VideoLang } from "@/data/prefs";
import { mainVideo, nextAction } from "@/engine/path";
import { useRewardPulse } from "@/features/quests/QuestList";
import { SectionStrip } from "@/features/sheets/SectionStrip";
import { cn } from "@/lib/utils";

export const lessonPath = (stepId: string) => `/practice/path/${stepId}`;

/** English or Hindi lesson videos. Saved as a pref; Settings has the same switch. */
export function LangToggle() {
  const lang = usePrefs().data?.videoLang ?? "en";
  const update = useUpdatePrefs();
  const opts: { id: VideoLang; label: string }[] = [
    { id: "en", label: "English" },
    { id: "hi", label: "Hindi" },
  ];
  return (
    <div role="radiogroup" aria-label="Video language" className="flex h-9 items-center gap-1 rounded-md border border-glass-border bg-glass p-1">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={lang === o.id}
          onClick={() => lang !== o.id && update.mutate({ videoLang: o.id })}
          className={cn(
            "flex h-7 items-center rounded-sm px-3 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
            lang === o.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Per step for the strip: a done step is full; the current one fills with its progress. */
export function stripProgress(view: View) {
  return view.steps.map((s) => {
    if (s.state === "done") return { done: 1, total: 1, pct: 100 };
    if (s.state === "locked") return { done: 0, total: 1, pct: 0 };
    // Current: the video is one part, each required problem another.
    const parts = 1 + s.required;
    const got = (s.watched ? 1 : 0) + s.requiredDone;
    return { done: got, total: parts, pct: Math.floor((got / parts) * 100) };
  });
}

function StepRow({ view, index }: { view: View; index: number }) {
  const s = view.steps[index]!;
  const lang = usePrefs().data?.videoLang ?? "en";
  const pulse = useRewardPulse(`path:${s.step.id}`);
  const locked = s.state === "locked";
  const action = s.state === "current" ? nextAction(s, mainVideo(s.step, lang)).label : null;
  const body = (
    <>
      <span
        className={cn(
          "numeric grid size-9 shrink-0 place-items-center rounded-sm font-display text-body font-semibold",
          s.state === "done" ? "bg-[color-mix(in_oklab,var(--success)_16%,transparent)] text-success" : s.state === "current" ? "bg-accent-soft text-ink" : "bg-abyss-sunken text-ink-faint",
        )}
      >
        {s.state === "done" ? <Check aria-hidden className="size-4" strokeWidth={2.6} /> : index + 1}
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("truncate text-title font-semibold", locked ? "text-ink-muted" : "text-ink")}>{s.step.title}</span>
        <span className="truncate text-body-sm text-ink-muted">{s.step.subtitle}</span>
      </span>
      <span className="flex shrink-0 items-center gap-2 text-body-sm">
        {s.state === "done" && <span className="text-ink">Done</span>}
        {s.state === "current" && <span className="text-ink">{action}</span>}
        {locked && (
          <span className="flex items-center gap-1.5 text-ink-muted">
            <Lock aria-hidden className="size-3.5" strokeWidth={2} />
            Locked
          </span>
        )}
        {!locked && <ChevronRight aria-hidden className="size-4 text-ink-muted" />}
      </span>
    </>
  );
  const cls = cn("flex items-center gap-4 rounded-md px-4 py-3", pulse && "aura-pulse", s.state === "current" && "bg-abyss-sunken");
  return (
    <li>
      {locked ? (
        <div className={cls} aria-label={`Step ${index + 1}, ${s.step.title}: locked until step ${index} is done`}>
          {body}
        </div>
      ) : (
        <Link
          to={lessonPath(s.step.id)}
          aria-current={s.state === "current" ? "step" : undefined}
          className={cn(cls, "transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover")}
        >
          <span className="sr-only">
            Step {index + 1}, {s.state === "done" ? "done" : "current"}:{" "}
          </span>
          {body}
        </Link>
      )}
    </li>
  );
}

/** Practice → Beginner Path: where you are in the 14 steps, and the way into the current lesson. */
export function PathView() {
  const path = usePath();
  const navigate = useNavigate();
  const lang = usePrefs().data?.videoLang ?? "en";
  if (path.isLoading) return <p className="text-body-sm text-ink-muted">Loading the Beginner Path…</p>;
  if (!path.data) {
    return (
      <EmptyState icon={GraduationCap} title="The Beginner Path didn't load">
        {String(path.error ?? "Something went wrong reading the lessons.")}
      </EmptyState>
    );
  }
  const view = path.data;
  const cur = view.current !== null ? view.steps[view.current]! : null;
  const total = view.steps.length;
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <section aria-labelledby="path-title" className="glass-card col-span-12 flex flex-col gap-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h2 id="path-title" className="font-display text-display font-semibold text-ink">
              {view.path.name}
            </h2>
            <p className="max-w-[62ch] text-body text-ink-muted">
              {total} steps from loops to dynamic programming. Each one is a lesson: watch a short video, read the pattern in five lines, then solve a
              few easy problems.
            </p>
          </div>
          <LangToggle />
        </div>
        <div className="grid grid-cols-1 items-end gap-6 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="flex min-w-0 flex-col gap-3">
            <p className="flex items-baseline gap-3">
              <span className="numeric font-display text-display leading-none font-semibold text-ink">
                {view.doneCount}/{total}
              </span>
              <span className="text-body-sm text-ink-muted">steps done</span>
            </p>
            <SectionStrip
              sections={stripProgress(view)}
              titles={view.steps.map((s) => s.step.title)}
              label="Step"
              current={view.current ?? undefined}
              onSelect={(i) => view.steps[i]!.state !== "locked" && navigate(lessonPath(view.steps[i]!.step.id))}
            />
          </div>
          {cur ? (
            <Button onClick={() => navigate(lessonPath(cur.step.id))}>
              {cur.watched || cur.requiredDone > 0 ? "Continue" : "Start"} step {(view.current ?? 0) + 1}: {cur.step.title}
            </Button>
          ) : (
            <Link to="/practice/sheets" className="text-body-sm text-ink underline decoration-glass-border-strong underline-offset-4">
              Path done. Pick a sheet to keep going
            </Link>
          )}
        </div>
        {cur && <p className="text-body-sm text-ink-muted">Next: {nextAction(cur, mainVideo(cur.step, lang)).label}.</p>}
      </section>

      <section aria-labelledby="steps-title" className="glass-card col-span-12 flex flex-col gap-3 p-6">
        <CardHeader
          id="steps-title"
          title="Steps"
          description="A step is done when you've watched its main video and solved its required problems. That unlocks the next one."
        />
        <ol className="-mx-2 flex flex-col gap-1">
          {view.steps.map((_, i) => (
            <StepRow key={i} view={view} index={i} />
          ))}
        </ol>
      </section>
    </div>
  );
}
