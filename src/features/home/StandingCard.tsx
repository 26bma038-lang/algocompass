import { Link } from "react-router-dom";
import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer } from "recharts";
import type { TopicReport } from "@/engine/report";

/** Topics shown on the radar: the ones most common at your rating, so the shape reflects the climb. */
const RADAR_TOPICS = 8;

/** Short axis labels so the radar fits the narrow column at the 1100px minimum window. */
const SHORT: Record<string, string> = {
  "arrays-hashing": "Arrays",
  "two-pointers": "Two ptrs",
  "number-theory": "Num. theory",
  "brute-force": "Brute force",
  constructive: "Constructive",
  implementation: "Implement.",
  "recursion-backtracking": "Recursion",
  "stacks-queues": "Stacks",
  "binary-search": "Bin. search",
  "data-structures": "Range DS",
  "string-algorithms": "String algos",
  "shortest-paths": "Shortest paths",
  "divide-conquer": "D&C",
  "game-theory": "Games",
  "advanced-graphs": "Advanced",
  "prefix-sums": "Prefix sums",
  "linked-lists": "Lists",
  "heaps": "Heaps",
  "graphs": "Graphs",
  "bitmasks": "Bits",
};

function Group({ title, items, empty }: { title: string; items: TopicReport["standing"]["strengths"]; empty: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <h3 className="text-label text-ink-muted">{title}</h3>
      {items.length === 0 ? (
        <p className="text-body-sm text-ink-faint">{empty}</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((i) => (
            <li key={i.topicId}>
              <Link
                to={`/topics/${i.topicId}`}
                className="group flex items-baseline justify-between gap-3 rounded-xs text-body-sm"
                title={i.reason}
              >
                <span className="truncate text-ink group-hover:underline group-hover:decoration-glass-border-strong group-hover:underline-offset-4">
                  {i.name}
                </span>
                <span className="numeric shrink-0 text-ink-muted">{i.score}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function StandingCard({ report }: { report: TopicReport | undefined }) {
  if (!report) {
    return (
      <section className="glass-card p-5">
        <h2 className="text-title font-semibold">Where you stand</h2>
        <p className="mt-2 text-body-sm text-ink-muted">Topic strengths appear after the first sync.</p>
      </section>
    );
  }
  const { topics, standing } = report;
  const focus = [...standing.strengths, ...standing.weaknesses, ...standing.blindSpots].map((s) => s.topicId);
  const radar = topics
    .filter((t) => focus.includes(t.topicId) || t.solvedCount > 0)
    .sort((a, b) => focus.indexOf(a.topicId) - focus.indexOf(b.topicId))
    .sort((a, b) => Number(focus.includes(b.topicId)) - Number(focus.includes(a.topicId)))
    .slice(0, RADAR_TOPICS)
    .map((t) => ({ name: SHORT[t.topicId] ?? t.name, full: t.name, score: t.score }));

  return (
    <section aria-labelledby="standing-title" className="glass-card flex flex-col gap-4 p-5">
      <h2 id="standing-title" className="text-title font-semibold">
        Where you stand
      </h2>
      <div className="h-[220px]" role="img" aria-label={`Topic scores: ${radar.map((r) => `${r.full} ${r.score}`).join(", ")}`}>
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={radar} outerRadius="66%" margin={{ top: 4, right: 40, bottom: 4, left: 40 }}>
            <PolarGrid stroke="var(--glass-border-strong)" />
            <PolarAngleAxis dataKey="name" tick={{ fill: "var(--ink-muted)", fontSize: 12 }} />
            <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} tickCount={5} />
            <Radar
              dataKey="score"
              stroke="var(--accent)"
              strokeWidth={2}
              fill="var(--accent)"
              fillOpacity={0.12}
              dot={{ r: 3, fill: "var(--accent)", strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <div className="grid gap-4 border-t border-glass-border pt-4">
        <Group title="Strongest" items={standing.strengths} empty="Nothing strong yet" />
        <Group title="Work on next" items={standing.weaknesses} empty="No weak spots found" />
        <Group title="Blind spots at your rating" items={standing.blindSpots} empty="None. You've touched everything common at your rating." />
      </div>
    </section>
  );
}
