import { lazy, Suspense } from "react";
import { LABELS } from "@/lib/glossary";
import { Outlet } from "react-router-dom";
import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { SegmentedTabs } from "@/components/SegmentedTabs";
import { useHomeData, useTopicReport } from "@/data/queries";
import { LevelCard, WeeklyGoalsCard } from "@/features/quests/Quests";
import { WeeklyReviewCard } from "@/features/quests/WeeklyReview";
import { ActivityHeatmap } from "@/features/home/ActivityHeatmap";
import { StandingCard } from "@/features/home/StandingCard";
import { LcCard } from "./LcCard";

// Recharts loads only when the Overview tab opens.
const RatingChart = lazy(() => import("@/features/home/RatingChart").then((m) => ({ default: m.RatingChart })));

const TABS = [
  { to: "/progress", label: "Overview", end: true },
  { to: "/progress/topics", label: LABELS.topics, end: false },
  { to: "/progress/achievements", label: "Achievements", end: false },
] as const;

/**
 * Progress (v1.2): everything that shows growth, in one screen with three tabs. Each tab is its own
 * route, so /progress/topics and /progress/achievements deep-link (and the v1.1 routes redirect here).
 */
export function Progress() {
  return (
    // --tree-above: the tab row (40px) plus its gap (24px), so the Topics map keeps its full height.
    <div className="flex flex-col gap-6 [--tree-above:64px]">
      <SegmentedTabs label="Progress sections" tabs={TABS} />
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
 * Overview: the rating chart and your level, this week's goals and the weekly review, then (v1.4,
 * moved from Today) your activity, LeetCode and where you stand by topic.
 */
export function ProgressOverview() {
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
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12 lg:col-span-8">
        <Suspense fallback={<section aria-busy className="glass-card h-[300px] p-6" />}>
          <RatingCard />
        </Suspense>
      </div>
      <div className="col-span-12 flex flex-col gap-6 lg:col-span-4">
        <LevelCard />
      </div>
      <div className="col-span-12 lg:col-span-8">
        <WeeklyGoalsCard />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <WeeklyReviewCard />
      </div>
      <div className="col-span-12 lg:col-span-8">
        <ActivityHeatmap activity={home?.activity ?? []} />
      </div>
      <div className="col-span-12 lg:col-span-4">
        <LcCard lc={home?.lcStats ?? null} />
      </div>
      <div className="col-span-12">
        <StandingCard report={report.data} />
      </div>
    </div>
  );
}
