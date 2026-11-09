import { lazy, Suspense } from "react";
import { Link, Outlet } from "react-router-dom";
import { ArrowRight, LineChart, RefreshCw } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { lessonPath } from "@/components/shell/nav";
import { Button } from "@/components/ui/button";
import { usePath } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { useHomeData, useTopicReport } from "@/data/queries";
import { useHandles } from "@/data/settings";
import { useSyncStore } from "@/data/syncStore";
import { LevelCard, WeeklyGoalsCard } from "@/features/quests/Quests";
import { WeeklyReviewFold } from "@/features/quests/WeeklyReview";
import { ActivityHeatmap } from "@/features/home/ActivityHeatmap";
import { LABELS } from "@/lib/glossary";
import { BadgeTiles } from "./BadgesCard";
import { BeginnerOverview } from "./BeginnerOverview";
import { LcCard } from "./LcCard";
import { RatingGoalSection } from "./RatingGoal";
import { ShareWeekButton } from "./ShareWeek";
import { continuePractice, friendsTabShown, progressTabs } from "./tabs";

// Recharts loads only when the Overview tab opens.
const RatingChart = lazy(() => import("@/features/home/RatingChart").then((m) => ({ default: m.RatingChart })));

/**
 * Progress looks back. v1.8: Overview · Topics, plus Friends once there's someone to compare (your
 * notes moved to Practice), and one button beside the tabs back to doing. Badges
 * (`/progress/badges`) and the Topics map (`/progress/topics/map`) open under them.
 */
export function Progress() {
  const mode = usePrefs().data?.mode === "beginner" ? "beginner" : "smart";
  const handles = useHandles().data;
  const view = usePath().data;
  const cur = view && view.current !== null ? view.steps[view.current] : undefined;
  const cont = continuePractice(mode, cur ? lessonPath(cur.step.id) : null);
  return (
    // --tree-above: the tab row (40px) plus its gap (24px), so the Topics map keeps its full height.
    <div className="flex flex-col gap-6 [--tree-above:64px]">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <SegmentedTabs label="Progress sections" tabs={progressTabs(friendsTabShown(mode, handles))} />
        <Button asChild variant="outline">
          <Link to={cont.to}>
            {cont.label}
            <ArrowRight aria-hidden />
          </Link>
        </Button>
      </div>
      <Suspense fallback={<p className="text-body-sm text-ink-muted">Loading…</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}

/** Your rating over every rated round (Codeforces, plus LeetCode contest rating once you have one), with the goal under it. */
function RatingCard() {
  const { data } = useHomeData();
  return (
    <RatingChart cf={data?.ratingHistory ?? []} lc={data?.lcContests ?? []} rating={data?.cf?.rating ?? null}>
      <RatingGoalSection />
    </RatingChart>
  );
}

/** Before the first update (or while it runs): what will be here, and the button that brings it. */
function OverviewEmpty() {
  const syncing = useSyncStore((s) => s.syncing);
  const run = useSyncStore((s) => s.run);
  return (
    <EmptyState
      icon={LineChart}
      title={syncing ? "Adding up your history…" : "Your progress starts after the first update"}
      action={
        !syncing && (
          <Button variant="outline" size="sm" onClick={() => void run()}>
            <RefreshCw aria-hidden />
            {LABELS.updateNow}
          </Button>
        )
      }
    >
      Your rating chart, level, weekly goals and activity collect here once your solve history is in.
    </EmptyState>
  );
}

/**
 * Overview, smart mode (v1.8: five cards, was eight). Left: Rating with the goal under it, This week
 * with the weekly review folded in, Activity. Right: Level and badges, LeetCode. Where you stand moved
 * to Topics, beside the list it summarises.
 */
function SmartOverview() {
  const report = useTopicReport();
  const home = useHomeData().data;
  if (report.isLoading) return <p className="text-body-sm text-ink-muted">Adding up your history…</p>;
  if (!report.data?.hasData) return <OverviewEmpty />;
  return (
    // Two columns that stack independently (v1.4), so a tall card on one side never leaves a hole on the other.
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
        <Suspense fallback={<section aria-busy className="glass-card h-[300px] p-6" />}>
          <RatingCard />
        </Suspense>
        <WeeklyGoalsCard actions={<ShareWeekButton size="sm" />}>
          <WeeklyReviewFold />
        </WeeklyGoalsCard>
        <ActivityHeatmap activity={home?.activity ?? []} />
      </div>
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
        <LevelCard>
          <BadgeTiles columns={1} heading="section" />
        </LevelCard>
        <LcCard lc={home?.lcStats ?? null} />
      </div>
    </div>
  );
}

/** Progress → Overview: Your path, Your week and Badges for a beginner (never empty); the full picture in smart mode. */
export function ProgressOverview() {
  const prefs = usePrefs();
  if (prefs.isLoading) return null;
  return prefs.data?.mode === "beginner" ? <BeginnerOverview /> : <SmartOverview />;
}
