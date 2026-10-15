import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, ExternalLink, Lock, X } from "lucide-react";
import { cfProblemUrl, lcProblemUrl } from "@/adapters/links";
import { MasteryRing } from "@/components/MasteryRing";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTopicProblems, useTopicReport } from "@/data/queries";
import { useUiStore } from "@/data/uiStore";
import type { TopicStrength } from "@/engine/strength";
import { MASTERY_MIN_SOLVES, STATUS_THRESHOLDS } from "@/engine/strength";
import { verdictLabel, type TopicProblems } from "@/engine/topicProblems";
import { PREREQUISITES, TOPIC_BY_ID } from "@/engine/topics";
import { openExternal } from "@/lib/openExternal";
import { topicIcon } from "@/lib/topicIcons";
import { cn } from "@/lib/utils";
import { TopicRecommendations, TopicResources } from "./TopicRecommendations";

const DAY = 86_400;

/** "today", "3 days ago", "Jul 2026". Lowercase so it reads mid-sentence; `Ago` for a standalone value. */
function ago(ts: number, nowSec = Date.now() / 1000): string {
  const days = Math.floor((nowSec - ts) / DAY);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 45) return `${days} days ago`;
  return new Date(ts * 1000).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}
const Ago = (ts: number) => {
  const s = ago(ts);
  return s.charAt(0).toUpperCase() + s.slice(1);
};

const pct = (x: number) => `${Math.round(x * 100)}%`;

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3 pt-8">
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="text-title font-semibold text-ink">{title}</h3>
        {aside && <span className="text-label text-ink-muted">{aside}</span>}
      </div>
      {children}
    </section>
  );
}

function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-md bg-abyss-sunken px-3.5 py-3">
      <dt className="text-label text-ink-muted">{label}</dt>
      <dd className="numeric text-title font-semibold text-ink">{value}</dd>
      {sub && <dd className="text-label text-ink-muted">{sub}</dd>}
    </div>
  );
}

/** Where the strength comes from: Codeforces vs LeetCode share of the weighted evidence. */
function Breakdown({ t }: { t: TopicStrength }) {
  const total = t.cfEvidence + t.lcEvidence;
  if (total <= 0) return null;
  const cf = t.cfEvidence / total;
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between text-label text-ink-muted">
        <span>Where the strength comes from</span>
      </div>
      <div className="flex h-2 w-full gap-0.5 overflow-hidden rounded-full" aria-hidden>
        {cf > 0 && <span className="h-full rounded-full bg-platform-cf" style={{ flexGrow: cf }} />}
        {cf < 1 && <span className="h-full rounded-full bg-platform-lc" style={{ flexGrow: 1 - cf }} />}
      </div>
      <dl className="flex justify-between text-body-sm">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-platform-cf" />
          <dt className="text-ink-muted">Codeforces</dt>
          <dd className="numeric font-semibold text-ink">{pct(cf)}</dd>
        </div>
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="size-1.5 rounded-full bg-platform-lc" />
          <dt className="text-ink-muted">LeetCode</dt>
          <dd className="numeric font-semibold text-ink">{pct(1 - cf)}</dd>
        </div>
      </dl>
      <p className="text-label text-ink-muted">
        Harder and more recent solves count more. A LeetCode solve counts half as much as a Codeforces one.
      </p>
    </div>
  );
}

interface Row {
  key: string;
  platform: "cf" | "lc";
  name: string;
  meta: string;
  detail?: string;
  at: number;
  url: string | null;
}

function ProblemList({ rows, empty, limit = 6 }: { rows: Row[]; empty: string; limit?: number }) {
  const [all, setAll] = useState(false);
  if (rows.length === 0) return <p className="text-body-sm text-ink-muted">{empty}</p>;
  const shown = all ? rows : rows.slice(0, limit);
  return (
    <div className="flex flex-col gap-1">
      <ul className="flex flex-col">
        {shown.map((r) => {
          const site = r.platform === "cf" ? "Codeforces" : "LeetCode";
          const body = (
            <>
              <span aria-hidden className={cn("size-1.5 shrink-0 rounded-full", r.platform === "cf" ? "bg-platform-cf" : "bg-platform-lc")} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-body-sm text-ink">{r.name}</span>
                <span className="truncate text-label text-ink-muted">
                  {r.detail ? `${r.detail}, ${ago(r.at)}` : Ago(r.at)}
                </span>
              </span>
              <span className="numeric shrink-0 text-body-sm text-ink-muted">{r.meta}</span>
              {r.url && (
                <ExternalLink aria-hidden className="size-3.5 shrink-0 text-ink-faint opacity-0 transition-opacity duration-[var(--dur-fast)] group-hover:opacity-100 group-focus-visible:opacity-100" />
              )}
            </>
          );
          return (
            <li key={r.key}>
              {r.url ? (
                <button
                  type="button"
                  onClick={() => openExternal(r.url!)}
                  aria-label={`${r.name}, ${r.meta}. Open on ${site}`}
                  className="group flex w-full items-center gap-2.5 rounded-sm px-2 py-1.5 text-left transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover"
                >
                  {body}
                </button>
              ) : (
                <div className="flex items-center gap-2.5 px-2 py-1.5">{body}</div>
              )}
            </li>
          );
        })}
      </ul>
      {rows.length > limit && (
        <button
          type="button"
          onClick={() => setAll((v) => !v)}
          className="self-start rounded-xs px-2 py-1 text-body-sm text-ink-muted underline decoration-glass-border-strong underline-offset-4 hover:text-ink"
        >
          {all ? "Show fewer" : `Show all ${rows.length}`}
        </button>
      )}
    </div>
  );
}

function solvedRows(p: TopicProblems): Row[] {
  const cf: Row[] = p.cfSolved.map((s) => ({
    key: `cf:${s.key}`,
    platform: "cf",
    name: s.name,
    meta: s.rating !== null ? String(s.rating) : "Unrated",
    detail: s.triesBeforeAc > 0 ? `Accepted after ${s.triesBeforeAc} wrong ${s.triesBeforeAc === 1 ? "try" : "tries"}` : undefined,
    at: s.solvedAt,
    url: cfProblemUrl(s.contestId, s.index),
  }));
  const lc: Row[] = p.lcSolved.map((s) => ({
    key: `lc:${s.slug}`,
    platform: "lc",
    name: s.title,
    meta: s.difficulty,
    at: s.solvedAt,
    url: lcProblemUrl(s.slug),
  }));
  return [...cf, ...lc].sort((a, b) => b.at - a.at);
}

function attemptedRows(p: TopicProblems): Row[] {
  return p.cfAttempted.map((s) => ({
    key: `cf:${s.key}`,
    platform: "cf",
    name: s.name,
    meta: s.rating !== null ? String(s.rating) : "Unrated",
    detail: `${s.attempts} ${s.attempts === 1 ? "try" : "tries"}, last ${verdictLabel(s.lastVerdict).toLowerCase()}`,
    at: s.lastAttemptAt,
    url: cfProblemUrl(s.contestId, s.index),
  }));
}

function statusSentence(t: TopicStrength, blocking: readonly TopicStrength[]): string {
  const of = `Strength ${t.score} of 100.`;
  switch (t.status) {
    case "Locked":
      return `Unlocks when ${blocking.map((b) => b.name.toLowerCase()).join(" and ")} ${blocking.length === 1 ? "reaches" : "reach"} ${STATUS_THRESHOLDS.developing}, or when you solve a problem here.`;
    case "Untouched":
      return "Unlocked. Solve one problem here to start its ring.";
    case "Mastered":
      return `${of} Deep and current, with solves at or above your rating.`;
    case "Strong":
      return `${of} Mastered needs ${STATUS_THRESHOLDS.mastered}+, ${MASTERY_MIN_SOLVES} solves and a Codeforces solve at your rating.`;
    case "Developing":
      return `${of} ${STATUS_THRESHOLDS.strong - t.score} points to Strong.`;
    case "Weak":
      return `${of} ${STATUS_THRESHOLDS.developing - t.score} points to Developing.`;
  }
}

function PanelBody({ t, topics }: { t: TopicStrength; topics: readonly TopicStrength[] }) {
  const problems = useTopicProblems(t.topicId);
  const openTopic = useUiStore((s) => s.openTopic);
  const prereqs = (PREREQUISITES[t.topicId] ?? []).map((id) => topics.find((x) => x.topicId === id)).filter((x): x is TopicStrength => !!x);
  const solved = problems.data ? solvedRows(problems.data) : [];
  const attempted = problems.data ? attemptedRows(problems.data) : [];
  const lcListed = problems.data?.lcSolved.length ?? 0;
  const lcUnlisted = Math.max(0, t.lcSolved - lcListed);
  const touched = t.solvedCount > 0;

  return (
    <div className="px-6 pb-10">
      {/* Strength */}
      <div className="flex items-center gap-5 pt-2">
        <div className="relative grid size-[96px] shrink-0 place-items-center">
          <span className="absolute inset-0">
            <MasteryRing score={t.score} status={t.status} size={96} stroke={5} />
          </span>
          {t.status === "Locked" ? (
            <Lock aria-hidden className="size-5 text-ink-faint" strokeWidth={1.8} />
          ) : (
            <span className="numeric font-display text-display leading-none font-semibold text-ink">{touched ? t.score : "–"}</span>
          )}
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-title font-semibold text-ink">{t.status === "Untouched" ? "Not tried" : t.status}</p>
          <p className="text-body-sm text-ink-muted">{statusSentence(t, prereqs.filter((p) => p.score < STATUS_THRESHOLDS.developing))}</p>
        </div>
      </div>

      {prereqs.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-4">
          <span className="text-label text-ink-muted">Builds on</span>
          {prereqs.map((p) => {
            const ok = p.score >= STATUS_THRESHOLDS.developing;
            return (
              <button
                key={p.topicId}
                type="button"
                onClick={() => openTopic(p.topicId)}
                className={cn(
                  "flex h-6 items-center gap-1.5 rounded-full border px-2.5 text-label transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:text-ink",
                  ok ? "border-glass-border bg-glass text-ink-muted" : "border-dashed border-glass-border-strong text-ink-muted",
                )}
              >
                {p.name}
                <span className="numeric text-ink">{p.solvedCount ? p.score : "–"}</span>
                {!ok && <span className="sr-only">(below Developing)</span>}
              </button>
            );
          })}
        </div>
      )}

      {touched && (
        <div className="pt-6">
          <Breakdown t={t} />
        </div>
      )}

      {touched && (
        <>
          <dl className="grid grid-cols-2 gap-2 pt-6">
            <Stat label="Solved" value={t.solvedCount} sub={`${t.cfSolved} Codeforces, ${t.lcSolved} LeetCode`} />
            <Stat label="Hardest Codeforces solve" value={t.maxCfRatingSolved ?? "–"} sub={t.maxCfRatingSolved ? "problem rating" : "no rated Codeforces solve yet"} />
            <Stat
              label="Struggle rate"
              value={t.struggleRate === null ? "–" : pct(t.struggleRate)}
              sub={t.struggleRate === null ? "no Codeforces attempts" : `of ${t.cfJudged} judged Codeforces submissions not accepted`}
            />
            <Stat
              label="Last practiced"
              value={t.lastPracticedAt ? Ago(t.lastPracticedAt) : "–"}
              sub={t.lastPracticedAt ? new Date(t.lastPracticedAt * 1000).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : undefined}
            />
          </dl>

          <Section title="Upsolve" aside={attempted.length ? `${attempted.length} open` : undefined}>
            <ProblemList
              rows={attempted}
              empty={t.cfJudged ? "Nothing open. Every Codeforces problem you tried here is solved." : "No unsolved attempts here."}
            />
            <p className="text-label text-ink-muted">Codeforces only: LeetCode doesn't share failed attempts.</p>
          </Section>

          <Section title="Solved" aside={solved.length ? `${solved.length} listed` : undefined}>
            {problems.isLoading ? (
              <p className="text-body-sm text-ink-muted">Loading your problems…</p>
            ) : (
              <ProblemList rows={solved} empty="No named solves here yet." />
            )}
            {lcUnlisted > 0 && (
              <p className="text-label text-ink-muted">
                +{lcUnlisted} earlier LeetCode {lcUnlisted === 1 ? "solve" : "solves"}. LeetCode only shares your 20 most recent, so older ones count from tag totals.
              </p>
            )}
          </Section>
        </>
      )}

      <Section title="Recommended problems">
        <TopicRecommendations topicId={t.topicId} />
      </Section>

      <Section title="Resources">
        <TopicResources topicId={t.topicId} />
      </Section>
    </div>
  );
}

/**
 * Topic Detail: a non-modal side panel (Float plane) over any screen. Opens from a Skill Tree node
 * or any topic on Home Base; clicking another topic swaps it in place. Esc or × closes it and
 * returns focus to where you were.
 */
export function TopicPanel() {
  const id = useUiStore((s) => s.openTopicId);
  const close = useUiStore((s) => s.closeTopic);
  const report = useTopicReport();
  const t = id ? report.data?.topics.find((x) => x.topicId === id) : undefined;
  const panelRef = useRef<HTMLElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const wasOpen = useRef(false);

  useEffect(() => {
    const open = id !== null;
    if (open && !wasOpen.current) {
      returnFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      requestAnimationFrame(() => panelRef.current?.focus({ preventScroll: true }));
    }
    if (!open && wasOpen.current) returnFocus.current?.focus({ preventScroll: true });
    wasOpen.current = open;
  }, [id]);

  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented) close();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [id, close]);

  // Scroll back to the top when switching topics.
  useEffect(() => {
    panelRef.current?.querySelector("[data-scroll]")?.scrollTo({ top: 0 });
  }, [id]);

  const Icon = id ? topicIcon(id) : BookOpen;
  const topic = id ? TOPIC_BY_ID.get(id) : undefined;
  // What the topic covers, in the platforms' own tag names.
  const coverage = topic
    ? [...new Set([...topic.cfTags, ...topic.lcTags.map((tag) => tag.replace(/-/g, " "))])]
        .filter((tag) => tag !== topic.name.toLowerCase())
        .join(", ")
    : "";

  // Leaving the screen closes the panel, so it never covers a screen it wasn't opened on.
  // A layout effect, so it runs before the next screen's own effects (which may open a topic).
  const { pathname } = useLocation();
  const lastPath = useRef(pathname);
  useLayoutEffect(() => {
    if (lastPath.current !== pathname) close();
    lastPath.current = pathname;
  }, [pathname, close]);

  return (
    <AnimatePresence>
      {id && (
        <motion.aside
          ref={panelRef}
          key="topic-panel"
          id="topic-panel"
          tabIndex={-1}
          role="complementary"
          aria-label={t ? `${t.name} details` : "Topic details"}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 24, transition: { duration: 0.16, ease: [0.65, 0, 0.35, 1] } }}
          transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
          className="fixed top-[calc(var(--titlebar-h)+var(--topbar-h)+2px)] right-0 bottom-0 z-40 flex w-[440px] flex-col border-l border-glass-border-strong bg-abyss-raised shadow-float outline-none"
        >
          <header className="flex items-start gap-3 border-b border-glass-border px-6 pt-5 pb-4">
            <span className="grid size-10 shrink-0 place-items-center rounded-md bg-accent-soft">
              <Icon aria-hidden className="size-5 text-accent" strokeWidth={1.8} />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="truncate font-display text-headline font-semibold text-ink">{t?.name ?? "Topic"}</h2>
              {coverage && (
                <p className="line-clamp-2 text-body-sm text-ink-muted">
                  <span className="text-ink-faint">Covers </span>
                  {coverage}
                </p>
              )}
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-label="Close topic details"
                  onClick={close}
                  className="grid size-8 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
                >
                  <X aria-hidden className="size-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Close <kbd className="ml-1 rounded-xs border border-glass-border-strong px-1 text-ink-muted">Esc</kbd>
              </TooltipContent>
            </Tooltip>
          </header>
          <div data-scroll className="min-h-0 flex-1 overflow-y-auto pt-4">
            {t && report.data ? (
              <PanelBody key={t.topicId} t={t} topics={report.data.topics} />
            ) : (
              <p className="px-6 text-body-sm text-ink-muted">{report.isLoading ? "Loading…" : "This topic has no data yet. It fills in after the first sync."}</p>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
