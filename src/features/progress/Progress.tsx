import { lazy, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { usePrefs } from "@/data/prefs";
import { useHomeData, useTopicReport } from "@/data/queries";
import { LevelCard, WeeklyGoalsCard } from "@/features/quests/Quests";
import { WeeklyReviewCard } from "@/features/quests/WeeklyReview";
import { ActivityHeatmap } from "@/features/home/ActivityHeatmap";
import { StandingCard } from "@/features/home/StandingCard";
import { BadgesCard } from "./BadgesCard";
import { BeginnerOverview } from "./BeginnerOverview";
import { LcCard } from "./LcCard";
import { PROGRESS_TABS } from "./tabs";

// Recharts loads only when the Overview tab opens.
const RatingChart = lazy(() => import("@/features/home/RatingChart").then((m) => ({ default: m.RatingChart })));

/**
 * Progress (v1.4): two tabs, Overview and Topics, each its own route. Badges (`/progress/badges`)
 * and the Topics map (`/progress/topics/map`) open under them; old links redirect.
 */
export function Progress() {
  return (
    // --tree-above: the tab row (40px) plus its gap (24px), so the Topics map keeps its full height.
    <div className="flex flex-col gap-6 [--tree-above:64px]">
      <SegmentedTabs label="Progress sections" tabs={PROGRESS_TABS} />
      <Suspense fallback={<p className="text-body-sm text-ink-muted">Loading…</p>}>
        <Outlet />
      </Suspense>
    </div>
  );
}

/** Your rating over every rated round (Codeforces, plus LeetCode contest rating once you have one). */
function RatingCard() {
  const { data } = useHomeData();
  return <RatingChart cf={data?.ratingHistory ?? []} lc={data?.lcContests ?? []} rating={data?.cf?.rating ?? null} />;
}

/**
 * Overview, smart mode: the rating chart, level, this week's goals and the weekly review, your
 * activity and LeetCode, badges, and where you stand by topic.
 */
function SmartOverview() {
  const report = useTopicReport();
  const home = useHomeData().data;
  if (report.isLoading) return <p className="text-body-sm text-ink-muted">Adding up your history…</p>;
  if (!report.data?.hasData) {
    return (
      <EmptyState icon={LineChart} title="Your progress starts after the first update">
        Your rating chart, level, weekly goals and weekly review collect here once your solve history is in.
      </EmptyState>
    );
  }
  return (
    // Two columns that stack independently (v1.4), so a tall card on one side never leaves a hole on the other.
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-8">
        <Suspense fallback={<section aria-busy className="glass-card h-[300px] p-6" />}>
          <RatingCard />
        </Suspense>
        <WeeklyGoalsCard />
        <ActivityHeatmap activity={home?.activity ?? []} />
      </div>
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
        <LevelCard />
        <WeeklyReviewCard />
        <BadgesCard columns={1} />
        <LcCard lc={home?.lcStats ?? null} />
      </div>
      <div className="col-span-12">
        <StandingCard report={report.data} />
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
