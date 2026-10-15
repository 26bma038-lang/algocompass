import { Link } from "react-router-dom";
import { useUiStore } from "@/data/uiStore";
import type { TopicReport } from "@/engine/report";
import type { StandingItem } from "@/engine/standing";

/** One ranked row: name + reason, and a thin 0–100 strength bar. Untried topics say so instead of "0". */
function Row({ item, untried }: { item: StandingItem; untried?: boolean }) {
  const openTopic = useUiStore((s) => s.openTopic);
  return (
    <li>
      <button
        type="button"
        onClick={() => openTopic(item.topicId)}
        className="group flex w-full flex-col gap-1.5 rounded-xs py-1 text-left"
        aria-describedby={`why-${item.topicId}`}
      >
        <span className="flex items-baseline justify-between gap-3">
          <span className="truncate text-body-sm font-semibold text-ink group-hover:underline group-hover:decoration-glass-border-strong group-hover:underline-offset-4">
            {item.name}
          </span>
          <span className="numeric shrink-0 text-body-sm text-ink-muted">{untried ? "Not tried" : item.score}</span>
        </span>
        {!untried && (
          <span aria-hidden className="h-1 w-full overflow-hidden rounded-full bg-glass-border">
            <span className="block h-full origin-left rounded-full bg-accent" style={{ transform: `scaleX(${item.score / 100})` }} />
          </span>
        )}
        <span id={`why-${item.topicId}`} className="text-label text-ink-muted">
          {item.reason}
        </span>
      </button>
    </li>
  );
}

function Group({ title, items, empty, untried }: { title: string; items: StandingItem[]; empty: string; untried?: boolean }) {
  return (
    <div className="flex flex-col gap-1">
      <h3 className="text-label text-ink-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((i) => (
            <Row key={i.topicId} item={i} untried={untried} />
          ))}
        </ul>
      )}
    </div>
  );
}

/** "Where you stand": strongest topics, what to work on next, and blind spots at your rating (scores out of 100). */
export function StandingCard({ report }: { report: TopicReport | undefined }) {
  return (
    <section aria-labelledby="standing-title" className="glass-card flex h-full flex-col gap-4 p-6">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="standing-title" className="font-display text-headline font-semibold text-ink">
          Where you stand
        </h2>
        <span className="text-label text-ink-muted">Strength / 100</span>
      </div>
      {!report ? (
        <p className="text-body-sm text-ink-muted">Topic strengths appear after the first sync.</p>
      ) : (
        <>
          <Group title="Strongest" items={report.standing.strengths} empty="Nothing strong yet" />
          <Group title="Work on next" items={report.standing.weaknesses} empty="No weak spots found" />
          <Group
            title="Blind spots at your rating"
            items={report.standing.blindSpots}
            empty="None. You've tried everything common at your rating."
            untried
          />
          <Link to="/skill-tree" className="text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink">
            All {report.topics.length} topics in the Skill Tree
          </Link>
        </>
      )}
    </section>
  );
}
