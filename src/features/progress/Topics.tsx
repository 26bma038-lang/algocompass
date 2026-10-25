import { useEffect } from "react";
import { Check, Network, PlayCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { CardHeader } from "@/components/CardHeader";
import { learnTopicPath, lessonPath } from "@/components/shell/nav";
import { Term } from "@/components/Term";
import { Button } from "@/components/ui/button";
import { RESOURCES } from "@/data/catalog";
import { usePath } from "@/data/path";
import { usePrefs } from "@/data/prefs";
import { useTopicReport } from "@/data/queries";
import { useUiStore } from "@/data/uiStore";
import { pathTopics, topicRows, type PathTopicRow, type TopicRow } from "@/engine/progress";
import { TOPIC_BY_ID } from "@/engine/topics";
import { LABELS, plainTopicName, STATUS_WORDS } from "@/lib/glossary";
import { cn } from "@/lib/utils";
import { TOPICS_MAP_PATH } from "./tabs";

const name = (id: string) => plainTopicName(id, TOPIC_BY_ID.get(id)?.name ?? id);
const hasVideos = (id: string) => (RESOURCES[id]?.videos.length ?? 0) > 0;

function WatchLink({ topicId }: { topicId: string }) {
  if (!hasVideos(topicId)) return null;
  return (
    <Link
      to={learnTopicPath(topicId)}
      aria-label={`Watch ${name(topicId)} videos`}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-sm px-2 text-body-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
    >
      <PlayCircle aria-hidden className="size-4" strokeWidth={1.8} />
      Watch
    </Link>
  );
}

/** One topic: plain name and status, a strength bar with the score in small type, and why it's here. */
function Row({ r }: { r: TopicRow }) {
  const openTopic = useUiStore((s) => s.openTopic);
  return (
    <li className="flex items-center gap-3 rounded-sm px-3 py-2.5 transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover">
      <button type="button" onClick={() => openTopic(r.topicId)} className="grid min-w-0 flex-1 grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] items-center gap-x-6 gap-y-1 text-left">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-body font-semibold text-ink">{r.name}</span>
          <span className="truncate text-label text-ink-muted">{r.why}</span>
        </span>
        <span className="flex min-w-0 items-center gap-3">
          <span className={cn("w-28 shrink-0 text-body-sm", r.tried ? "text-ink" : "text-ink-muted")}>{STATUS_WORDS[r.status]}</span>
          {r.tried && (
            <>
              <span aria-hidden className="h-1.5 min-w-12 flex-1 overflow-hidden rounded-full bg-glass-border-strong">
                <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${r.score / 100})` }} />
              </span>
              <span className="numeric w-12 shrink-0 text-right text-label text-ink-muted">{r.score}/100</span>
            </>
          )}
        </span>
      </button>
      <WatchLink topicId={r.topicId} />
    </li>
  );
}

const PATH_WORDS: Record<PathTopicRow["state"], string> = { done: "Done", current: "Learning now", started: "Started", later: "Later step" };

/** Before any solve history: the Beginner Path's topics, done / learning now / later (never "after the first update"). */
function PathTopicsCard({ beginner }: { beginner: boolean }) {
  const view = usePath().data;
  if (!view) return <section aria-busy className="glass-card h-[300px] p-6" />;
  const rows = pathTopics(view.path, view);
  return (
    <section aria-labelledby="path-topics-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="path-topics-title"
        title="Topics in the Beginner Path"
        description={
          beginner
            ? "What each step teaches, and where you are. Your strength in each topic shows here once you connect LeetCode or Codeforces."
            : "What each step teaches. Your strength in every topic shows here after your first update."
        }
        pill={`${rows.filter((r) => r.state === "done").length} of ${rows.length} done`}
      />
      <ul className="-mx-3 flex flex-col gap-1">
        {rows.map((r) => (
          <li key={r.topicId} className={cn("flex items-center gap-3 rounded-sm px-3 py-2.5", r.state === "current" && "bg-abyss-sunken")}>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className={cn("truncate text-body font-semibold", r.state === "later" ? "text-ink-muted" : "text-ink")}>{name(r.topicId)}</span>
              <span className="truncate text-label text-ink-muted">
                {r.steps.map((i, k) => (
                  <span key={i}>
                    {k > 0 && ", "}
                    {view.steps[i]!.state === "locked" ? (
                      `Step ${i + 1}: ${view.steps[i]!.step.title}`
                    ) : (
                      <Link to={lessonPath(view.steps[i]!.step.id)} className="underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
                        Step {i + 1}: {view.steps[i]!.step.title}
                      </Link>
                    )}
                  </span>
                ))}
              </span>
            </span>
            <span className={cn("flex w-32 shrink-0 items-center gap-1.5 text-body-sm", r.state === "later" ? "text-ink-muted" : "text-ink")}>
              {r.state === "done" && <Check aria-hidden className="size-4 text-success" strokeWidth={2.4} />}
              {PATH_WORDS[r.state]}
            </span>
            <WatchLink topicId={r.topicId} />
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Progress → Topics (v1.4): a list first, weakest first, in plain words ("Getting there", not
 * "Developing"), with Show as map for the Skill Tree canvas. Clicking a topic opens its panel here.
 */
export function TopicsList() {
  const report = useTopicReport();
  const beginner = usePrefs().data?.mode === "beginner";
  // Deep link (/topics/:id) lands here with the topic to open.
  const location = useLocation();
  const openTopic = useUiStore((s) => s.openTopic);
  useEffect(() => {
    const id = (location.state as { openTopic?: string } | null)?.openTopic;
    if (id) openTopic(id);
  }, [location.state, openTopic]);

  if (report.isLoading) return <p className="text-body-sm text-ink-muted">Loading your topics…</p>;
  if (!report.data?.hasData) return <PathTopicsCard beginner={beginner} />;
  const rows = topicRows(report.data.topics, report.data.standing, plainTopicName);
  const tried = rows.filter((r) => r.tried);
  const untried = rows.filter((r) => !r.tried);
  return (
    <section aria-labelledby="topics-title" className="glass-card flex flex-col gap-4 p-6">
      <CardHeader
        id="topics-title"
        title={LABELS.topics}
        description={
          <>
            Weakest first. <Term id="strength" /> goes from 0 to 100 with how much you've solved in a topic and how hard it was. Click one for its
            problems and videos.
          </>
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link to={TOPICS_MAP_PATH}>
              <Network aria-hidden />
              {LABELS.showAsMap}
            </Link>
          </Button>
        }
      />
      <ul className="-mx-3 flex flex-col">
        {tried.map((r) => (
          <Row key={r.topicId} r={r} />
        ))}
      </ul>
      {untried.length > 0 && (
        <>
          <h3 className="border-t border-glass-border pt-4 text-title font-semibold text-ink">{LABELS.notTried}</h3>
          <ul className="-mx-3 flex flex-col">
            {untried.map((r) => (
              <Row key={r.topicId} r={r} />
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
