import { lazy, Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { LineChart } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { useHomeData, useTopicReport } from "@/data/queries";
import { LevelCard, WeeklyGoalsCard } from "@/features/quests/Quests";
import { WeeklyReviewCard } from "@/features/quests/WeeklyReview";
import { cn } from "@/lib/utils";

// Recharts loads only when the Overview tab opens.
const RatingChart = lazy(() => import("@/features/home/RatingChart").then((m) => ({ default: m.RatingChart })));

const TABS = [
  { to: "/progress", label: "Overview", end: true },
  { to: "/progress/topics", label: "Topics map", end: false },
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
      <nav aria-label="Progress sections" className="flex h-10 items-center gap-1 self-start rounded-md border border-glass-border bg-glass p-1">
        {TABS.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              cn(
                "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
                isActive ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
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

/** Overview: the rating chart and your level, then this week's goals and the weekly review. */
export function ProgressOverview() {
  const report = useTopicReport();
  if (report.isLoading) return <p className="text-body-sm text-ink-muted">Adding up your history…</p>;
  if (!report.data?.hasData) {
    return (
      <EmptyState icon={LineChart} title="Your progress starts after the first sync">
        Your rating chart, level, weekly goals and weekly review collect here once your solve history has synced.
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
    </div>
  );
}
