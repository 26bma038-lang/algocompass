import { useNavigate, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { usePath } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { hasAnyHandle, useHandles } from "@/data/settings";
import { PATH_SHEET_ID } from "@/data/sheets";
import { mainVideo, nextAction } from "@/engine/path";
import { lessonPath, stripProgress } from "@/features/path/PathView";
import { useRewardPulse } from "@/features/quests/QuestList";
import { FollowedSheetCard } from "@/features/sheets/FollowedSheetCard";
import { SectionStrip } from "@/features/sheets/SectionStrip";
import { cn } from "@/lib/utils";

/** "Step 3 of 14: Hashing · Watch 12 min · then solve 2 problems", and one button into the lesson. */
function StartHereCard() {
  const { data: view } = usePath();
  const lang = usePrefs().data?.videoLang ?? "en";
  const navigate = useNavigate();
  const cur = view && view.current !== null ? view.steps[view.current]! : null;
  const pulse = useRewardPulse(cur ? `path:${cur.step.id}` : "");
  if (!view) return <section aria-busy className="glass-card h-[220px] p-6" />;
  const total = view.steps.length;
  return (
    <section aria-labelledby="start-title" className={cn("glass-card flex flex-col gap-6 p-6", pulse && "aura-pulse")}>
      <div className="flex flex-col gap-2">
        <p className="text-body-sm text-ink-muted">{view.doneCount === 0 ? "Start here" : "Pick up where you left off"}</p>
        {cur ? (
          <>
            <h2 id="start-title" className="font-display text-display font-semibold text-ink">
              Step {(view.current ?? 0) + 1} of {total}: {cur.step.title}
            </h2>
            <p className="text-body text-ink-muted">{cur.step.subtitle}</p>
            <p className="text-title font-semibold text-ink">{nextAction(cur, mainVideo(cur.step, lang)).label}</p>
          </>
        ) : (
          <>
            <h2 id="start-title" className="font-display text-display font-semibold text-ink">
              You finished the Beginner Path
            </h2>
            <p className="text-body text-ink-muted">All {total} steps are done. A full sheet like Striver's A2Z or NeetCode 150 is the next step.</p>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <SectionStrip sections={stripProgress(view)} titles={view.steps.map((s) => s.step.title)} label="Step" current={view.current ?? undefined} />
        <span className="numeric text-label text-ink-muted">
          {view.doneCount} of {total} steps done
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        {cur ? (
          <Button onClick={() => navigate(lessonPath(cur.step.id))}>{nextAction(cur, mainVideo(cur.step, lang)).button}</Button>
        ) : (
          <Button onClick={() => navigate("/practice/sheets")}>Pick a sheet</Button>
        )}
        <Link to="/practice/path" className="text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
          See all {total} steps
        </Link>
      </div>
    </section>
  );
}

/** Optional: a username makes LeetCode solves tick themselves. Shown only while there's none. */
function ConnectCard() {
  return (
    <section aria-labelledby="connect-title" className="glass-card flex h-full flex-col gap-2 p-6">
      <h2 id="connect-title" className="flex items-center gap-2 text-title font-semibold text-ink">
        <span aria-hidden className="size-2 rounded-full bg-platform-lc" />
        Let your solves tick themselves
      </h2>
      <p className="max-w-[62ch] text-body-sm text-ink-muted">
        Add your LeetCode username in{" "}
        <Link to="/settings" className="text-ink underline decoration-glass-border-strong underline-offset-4">
          Settings
        </Link>{" "}
        and every lesson problem you solve there is ticked after the next sync. Until then, tick them by hand in each lesson.
      </p>
    </section>
  );
}

/**
 * Today in Beginner mode (v1.3): one big Start here card. No rating hero, charts or contests while
 * there's no data for them. Quests sit beside it (hand ticks count); the streak line appears once a
 * handle is connected.
 */
export function BeginnerToday({ quests }: { quests: (connected: boolean) => React.ReactNode }) {
  const handles = useHandles().data;
  const followed = usePrefs().data?.followedSheet;
  const connected = hasAnyHandle(handles);
  return (
    <div className="grid grid-cols-12 items-start gap-6">
      <div className="col-span-12 lg:col-span-7">
        <StartHereCard />
      </div>
      {/* Quests work without a handle too: hand ticks on lesson problems count. */}
      <div className="col-span-12 lg:col-span-5">{quests(connected)}</div>
      {followed && followed !== PATH_SHEET_ID && (
        <div className="col-span-12">
          <FollowedSheetCard />
        </div>
      )}
      {!connected && (
        <div className="col-span-12">
          <ConnectCard />
        </div>
      )}
    </div>
  );
}
