import type { ReactNode } from "react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLearnHistory } from "@/data/learn";
import { usePath } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { lessonNext, todayLessonAction } from "@/engine/learn";
import { mainVideo } from "@/engine/path";
import { lessonPath, PathDots } from "@/features/path/shared";
import { useRewardPulse } from "@/features/quests/QuestList";
import { LABELS } from "@/lib/glossary";
import { cn } from "@/lib/utils";

/**
 * "Do this next" (v1.4): the current step and the exact next thing to do in it, as one big
 * button: watch the video, read the lesson, or solve problem N. It opens the lesson at that part.
 * v1.4 polish: the button is the loudest thing in the card (full width, under a headline-size
 * title), the path is a compact strip of 14 dots, and a line says nothing leaves the PC.
 */
function DoThisNextLesson() {
  const { data: view } = usePath();
  const history = useLearnHistory().data;
  const lang = usePrefs().data?.videoLang ?? "en";
  const navigate = useNavigate();
  const cur = view && view.current !== null ? view.steps[view.current]! : null;
  const pulse = useRewardPulse(cur ? `path:${cur.step.id}` : "");
  if (!view) return <section aria-busy className="glass-card h-[300px] p-6" />;
  const total = view.steps.length;

  const action = cur
    ? todayLessonAction(
        lessonNext({
          progress: cur,
          read: history?.read.includes(cur.step.id) ?? false,
          stepDone: false,
          problems: cur.step.problems,
          isDone: view.isDone,
          opened: new Set(),
          nextStep: null,
        }),
        mainVideo(cur.step, lang),
        cur.required - cur.requiredDone,
      )
    : null;

  return (
    <section aria-labelledby="start-title" className={cn("glass-card flex h-full flex-col gap-6 p-6", pulse && "aura-pulse")}>
      <div className="flex flex-col gap-2">
        <p className="text-body-sm font-medium text-accent">{LABELS.doThisNext}</p>
        {cur ? (
          <>
            <h2 id="start-title" className="font-display text-headline font-semibold text-ink">
              {cur.step.title}
            </h2>
            <p className="text-body text-ink-muted">{cur.step.subtitle}</p>
          </>
        ) : (
          <>
            <h2 id="start-title" className="font-display text-headline font-semibold text-ink">
              You finished the Beginner Path
            </h2>
            <p className="text-body text-ink-muted">All {total} steps are done. A full problem list (a sheet) like Striver's A2Z or NeetCode 150 is the next step.</p>
          </>
        )}
      </div>
      <PathDots view={view} />
      <div className="mt-auto flex flex-col gap-3">
        {action && cur ? (
          <>
            <p className="text-body text-ink">{action.detail}</p>
            <Button
              size="lg"
              className="w-full"
              onClick={() => navigate(lessonPath(cur.step.id), { state: action.focus ? { focus: action.focus } : undefined })}
            >
              <span className="truncate">{action.button}</span>
              <ArrowRight aria-hidden />
            </Button>
          </>
        ) : (
          <Button size="lg" className="w-full" onClick={() => navigate("/practice/sheets")}>
            Pick a sheet
            <ArrowRight aria-hidden />
          </Button>
        )}
        <p className="flex items-center gap-1.5 text-label text-ink-muted">
          <ShieldCheck aria-hidden className="size-3.5 shrink-0" strokeWidth={1.8} />
          No account needed. Your progress stays on this PC.
        </p>
      </div>
    </section>
  );
}

/**
 * Today in Beginner mode (v1.4): one big "Do this next" card for the current lesson, and today's
 * goals in plain words beside it. Nothing else: no charts, no streak before there's one, no
 * "connect an account" card (that's offered inside the lesson, when it helps).
 */
export function BeginnerToday({ goals }: { goals: ReactNode }) {
  return (
    <div className="grid grid-cols-12 items-stretch gap-6">
      <div className="col-span-12 lg:col-span-7">
        <DoThisNextLesson />
      </div>
      <div className="col-span-12 lg:col-span-5">{goals}</div>
    </div>
  );
}
