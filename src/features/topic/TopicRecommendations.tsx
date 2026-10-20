import { BookOpen, ExternalLink, ListChecks, PlayCircle, type LucideIcon } from "lucide-react";
import { cfProblemsetUrl } from "@/adapters/links";
import { ModeBadge } from "@/components/practice/ModeBadge";
import { ProblemRow } from "@/components/practice/ProblemRow";
import { RESOURCES, type Resource, type ResourceKind } from "@/data/catalog";
import { useRecommender } from "@/data/recommendations";
import type { Recommender, TopicPlan } from "@/engine/recommender";
import { TOPIC_BY_ID } from "@/engine/topics";
import { openExternal } from "@/lib/openExternal";
import { TopicVideos } from "./TopicVideos";

const PER_LIST = 3;

function SubList({ label, platform, children }: { label: string; platform: "cf" | "lc"; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <h4 className="flex items-center gap-1.5 text-label text-ink-muted">
        <span aria-hidden className={platform === "cf" ? "size-1.5 rounded-full bg-platform-cf" : "size-1.5 rounded-full bg-platform-lc"} />
        {label}
      </h4>
      {children}
    </div>
  );
}

function modeSentence(plan: TopicPlan): string {
  if (!plan.canSharpen) return "Codeforces doesn't tag this topic, so it's learned and practiced on LeetCode.";
  if (!plan.canLearn) return "LeetCode has no problems for this topic, so it's learned straight on Codeforces.";
  if (plan.mode === "learn") return `${plan.readiness.solves} of ${plan.readiness.needed} solves. After ${plan.readiness.needed}, it moves to Codeforces to sharpen.`;
  return `You have ${plan.readiness.solves} solves here, so it's sharpened on Codeforces now. LeetCode problems stay below for review.`;
}

function Lists({ plan, rec }: { plan: TopicPlan; rec: Recommender }) {
  const learn = plan.canLearn ? rec.learn(plan.topicId, PER_LIST) : [];
  const sharpen = plan.canSharpen ? rec.sharpen(plan.topicId, PER_LIST) : [];
  const learnList = plan.canLearn && (
    <SubList key="lc" label="Learn on LeetCode" platform="lc">
      {learn.length ? (
        <ul className="-mx-2 flex flex-col">
          {learn.map((p) => (
            <ProblemRow key={p.id} p={p} density="compact" />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">You've done every curated LeetCode problem here.</p>
      )}
    </SubList>
  );
  const sharpenList = plan.canSharpen && (
    <SubList key="cf" label={`Sharpen on Codeforces, rated ${plan.window.lo} to ${plan.window.hi}`} platform="cf">
      {sharpen.length ? (
        <ul className="-mx-2 flex flex-col">
          {sharpen.map((p) => (
            <ProblemRow key={p.id} p={p} density="compact" />
          ))}
        </ul>
      ) : (
        <p className="text-body-sm text-ink-muted">No open Codeforces problems in this range. Mark one too easy or too hard to move the range.</p>
      )}
    </SubList>
  );
  // The current mode's list leads.
  return <div className="flex flex-col gap-4">{plan.mode === "learn" ? [learnList, sharpenList] : [sharpenList, learnList]}</div>;
}

/** Topic Detail → Recommended problems: Learn (LeetCode) and Sharpen (Codeforces), current mode first. */
export function TopicRecommendations({ topicId }: { topicId: string }) {
  const { data: rec, isLoading } = useRecommender();
  const plan = rec?.plans.get(topicId);
  if (isLoading) return <p className="text-body-sm text-ink-muted">Picking problems…</p>;
  if (!rec || !plan) return <p className="text-body-sm text-ink-muted">Recommendations appear after the first sync.</p>;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-start gap-2">
        <ModeBadge mode={plan.mode} />
        <p className="text-body-sm text-ink-muted">{modeSentence(plan)}</p>
      </div>
      <Lists plan={plan} rec={rec} />
      <p className="text-label text-ink-muted">Skip, Too easy and Too hard appear when you point at a problem. They tune what this topic serves next.</p>
    </div>
  );
}

const KIND_ICON: Record<ResourceKind, LucideIcon> = { article: BookOpen, video: PlayCircle, problems: ListChecks };
const KIND_LABEL: Record<ResourceKind, string> = { article: "Article", video: "Video", problems: "Problem set" };

function ResourceRow({ r }: { r: Resource }) {
  const Icon = KIND_ICON[r.kind];
  return (
    <li>
      <button
        type="button"
        onClick={() => openExternal(r.url)}
        aria-label={`${KIND_LABEL[r.kind]}: ${r.title}, ${r.source}. Opens in your browser`}
        className="group flex w-full items-center gap-3 rounded-sm px-2 py-1.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
      >
        <span className="grid size-7 shrink-0 place-items-center rounded-xs bg-abyss-sunken">
          <Icon aria-hidden className="size-3.5 text-ink-muted" strokeWidth={1.8} />
        </span>
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-body-sm text-ink">{r.title}</span>
          <span className="truncate text-label text-ink-muted">
            {KIND_LABEL[r.kind]}, {r.source}
          </span>
        </span>
        <ExternalLink
          aria-hidden
          className="size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100"
        />
      </button>
    </li>
  );
}

/** Topic Detail → Resources: learn, practice, go deeper. Practice adds a Codeforces filter at your rating. */
export function TopicResources({ topicId }: { topicId: string }) {
  const { data: rec } = useRecommender();
  const res = RESOURCES[topicId];
  const topic = TOPIC_BY_ID.get(topicId);
  if (!res || !topic) return <p className="text-body-sm text-ink-muted">No resources for this topic yet.</p>;
  const plan = rec?.plans.get(topicId);
  const cfTag = topic.cfTags[0];
  const cfFilter: Resource | null =
    cfTag && plan
      ? {
          kind: "problems",
          title: `${topic.name} problems rated ${plan.window.lo} to ${plan.window.hi}`,
          source: "Codeforces problemset",
          url: cfProblemsetUrl(cfTag, plan.window.lo, plan.window.hi),
        }
      : null;
  const tiers: { label: string; items: Resource[] }[] = [
    { label: "Learn", items: res.learn },
    { label: "Practice", items: [...res.practice, ...(cfFilter ? [cfFilter] : [])] },
    { label: "Go deeper", items: res.deeper },
  ];
  return (
    <div className="flex flex-col gap-4">
      <TopicVideos topicId={topicId} />
      {tiers.filter((t) => t.items.length > 0).map((t) => (
        <div key={t.label} className="flex flex-col gap-1">
          <h4 className="text-label text-ink-muted">{t.label}</h4>
          <ul className="-mx-2 flex flex-col">
            {t.items.map((r) => (
              <ResourceRow key={r.url + r.title} r={r} />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
