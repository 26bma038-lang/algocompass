import { useEffect, useLayoutEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePrefs } from "@/data/prefs";
import { readPref, writePref } from "@/data/settings";
import { useUiStore } from "@/data/uiStore";
import type { NavItem } from "./nav";
import { useNav } from "./useNav";

/**
 * Bump to show the tour again after a navigation change. v2 (v1.3): Sheets. v3 (v1.3): Learn.
 * v4 (v1.4): one sidebar order, Learn above Practice.
 */
export const TOUR_VERSION = 4;
const PREF_KEY = "tipTourSeen";

export interface TourStep {
  /** The sidebar item it points at (its data-tour attribute). */
  anchor: string;
  /** Where the step navigates. */
  to: string;
  title: string;
  shortcut: string;
  body: string;
}

type StepText = Omit<TourStep, "shortcut">;

const TODAY: StepText = { anchor: "/", to: "/", title: "Today", body: "Start here every day. The one problem to do next, today's goals and your rating, so you know what to do in a couple of seconds." };
const LEARN: StepText = { anchor: "/learn", to: "/learn", title: "Learn", body: "Every video lesson in one place, in English or Hindi, with the topics you're weakest at first. It sits above Practice now: learn a topic, then practise it." };
const PRACTICE: StepText = { anchor: "/practice", to: "/practice", title: "Practice", body: "When you want more: today's problems, Codeforces problems you didn't finish, and problems for each topic you're working on." };
const SHEETS: StepText = {
  anchor: "/practice",
  to: "/practice/sheets",
  title: "Sheets",
  body: "Follow a sheet like Striver's A2Z or NeetCode 150. Problems you solve on LeetCode or Codeforces tick themselves, in every sheet that has them.",
};
const PROGRESS: StepText = { anchor: "/progress", to: "/progress", title: "Progress", body: "How you're doing. Your rating chart, level, weekly goals and activity, your topics, and your achievements, as three tabs." };
const CONTESTS: StepText = { anchor: "/contests", to: "/contests", title: "Contests", body: "Upcoming Codeforces rounds first, LeetCode contests below. Turn on \"I'll attend\" for a reminder before it starts." };

/**
 * One step per screen, in sidebar order (smart mode). Beginners get no tour (v1.4): onboarding
 * takes them straight into Step 1, and a tour would walk them away from it. Their sidebar has
 * labels and a one-line hint on every item.
 */
export function tourSteps(nav: readonly NavItem[], mode: "smart" | "beginner"): TourStep[] {
  if (mode === "beginner") return [];
  return [TODAY, LEARN, PRACTICE, SHEETS, PROGRESS, CONTESTS].flatMap((st) => {
    const item = nav.find((n) => n.to === st.anchor);
    return item ? [{ ...st, shortcut: item.shortcut }] : [];
  });
}

/** Whether the tour should run: once per TOUR_VERSION, after onboarding and for existing users alike. */
export async function shouldShowTour(): Promise<boolean> {
  const seen = await readPref<number>(PREF_KEY);
  return (seen ?? 0) < TOUR_VERSION;
}

/**
 * The one-time tip tour: one step per screen plus Sheets (v1.3), each pointing at its sidebar item.
 * Non-modal and skippable (×, Skip or Esc); it never blocks input.
 */
export function TipTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const navigate = useNavigate();
  const expanded = useUiStore((s) => s.sidebarExpanded);
  const { primary, mode } = useNav();
  const prefsReady = usePrefs().isSuccess;
  // Fixed once the tour opens, so a mode or milestone change mid-tour doesn't reshuffle it.
  const [frozen, setFrozen] = useState<TourStep[]>([]);
  const tour = frozen.length ? frozen : tourSteps(primary, mode);
  const item = tour[Math.min(step, tour.length - 1)];

  useEffect(() => {
    let alive = true;
    void shouldShowTour().then((show) => {
      if (!alive || !show) return;
      setOpen(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Point at the step's sidebar item; follow the sidebar as it expands or the window resizes.
  useLayoutEffect(() => {
    if (!open || !item) return;
    const measure = () => setRect(document.querySelector(`[data-tour="${item.anchor}"]`)?.getBoundingClientRect() ?? null);
    measure();
    const t = window.setTimeout(measure, 320); // after the sidebar's spring settles
    window.addEventListener("resize", measure);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("resize", measure);
    };
  }, [open, item?.anchor, expanded]);

  const finish = () => {
    setOpen(false);
    void writePref(PREF_KEY, TOUR_VERSION);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Freeze the steps the first time the tour shows (the prefs have loaded by then).
  useEffect(() => {
    if (open && prefsReady && !frozen.length) setFrozen(tourSteps(primary, mode));
  }, [open, prefsReady]); // eslint-disable-line react-hooks/exhaustive-deps

  const go = (n: number) => {
    setStep(n);
    navigate(tour[n]!.to);
  };
  const last = step === tour.length - 1;

  return (
    <AnimatePresence>
      {open && prefsReady && rect && item && (
        <>
          {/* The highlighted sidebar item: an accent outline, no dimming (the tour never blocks the app). */}
          <motion.span
            key="ring"
            aria-hidden
            className="pointer-events-none fixed z-50 rounded-sm border-2 border-accent shadow-aura"
            initial={false}
            animate={{ top: rect.top - 3, left: rect.left - 3, width: rect.width + 6, height: rect.height + 6, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          />
          <motion.div
            key="card"
            role="dialog"
            aria-modal={false}
            aria-labelledby="tour-title"
            aria-describedby="tour-body"
            className="fixed z-50 w-[320px] rounded-md border border-glass-border-strong bg-abyss-raised p-5 shadow-float"
            initial={{ opacity: 0, x: -6 }}
            animate={{ opacity: 1, x: 0, top: Math.max(48, Math.min(rect.top - 12, window.innerHeight - 240)), left: rect.right + 16 }}
            exit={{ opacity: 0, transition: { duration: 0.12 } }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex flex-col gap-0.5">
                <span className="numeric text-label text-ink-muted">
                  Tip {step + 1} of {tour.length}
                </span>
                <h2 id="tour-title" className="font-display text-headline font-semibold text-ink">
                  {item.title}
                </h2>
              </div>
              <button
                type="button"
                onClick={finish}
                aria-label="Skip the tour"
                className="grid size-8 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
              >
                <X aria-hidden className="size-4" />
              </button>
            </div>
            <p id="tour-body" className="mt-2 text-body-sm text-ink-muted">
              {item.body}
            </p>
            <p className="mt-2 text-label text-ink-faint">
              {item.title === "Sheets" ? `A tab in Practice (Ctrl ${item.shortcut}).` : `Ctrl ${item.shortcut} jumps here from anywhere.`}
            </p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button type="button" onClick={finish} className="rounded-xs text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
                Skip
              </button>
              <div className="flex gap-2">
                {step > 0 && (
                  <Button variant="outline" size="sm" onClick={() => go(step - 1)}>
                    Back
                  </Button>
                )}
                <Button size="sm" autoFocus onClick={() => (last ? finish() : go(step + 1))}>
                  {last ? "Got it" : "Next"}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
