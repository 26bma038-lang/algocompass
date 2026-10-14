import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Background,
  BackgroundVariant,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type Edge,
  type ReactFlowInstance,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import { Crosshair, Info, Maximize, Minus, Network, Plus, Search, SearchX, X } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { MasteryRing } from "@/components/MasteryRing";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTopicReport } from "@/data/queries";
import { readPref, writePref } from "@/data/settings";
import { useUiStore } from "@/data/uiStore";
import type { TopicReport } from "@/engine/report";
import {
  buildSkillTree,
  isPromotion,
  lineageEdges,
  matchesFilter,
  matchesSearch,
  searchRank,
  statusSnapshot,
  type TreeFilter,
} from "@/engine/skillTree";
import type { StandingItem } from "@/engine/standing";
import { STATUS_THRESHOLDS, type TopicStatus } from "@/engine/strength";
import { cn } from "@/lib/utils";
import { layoutTree, NODE_H, NODE_W } from "./layout";
import { STATUS_WORD, TopicNode, type TopicFlowNode } from "./TopicNode";

const nodeTypes = { topic: TopicNode };
const SEEN_KEY = "skillTree.seen";
/** Width of the Topic Detail panel, so a node opened near the right edge isn't hidden under it. */
const PANEL_W = 440;
/** Keep the fitted tree clear of the overlaid plates (top) and canvas edges. */
const PAD = { top: 24, bottom: 24, x: 24 } as const;
const FIT = { padding: { top: `${PAD.top}px`, bottom: `${PAD.bottom}px`, x: `${PAD.x}px` } } as const;
/** Below this zoom node names get too small to read, so the first view doesn't go lower. */
const READABLE_ZOOM = 0.75;

interface Seen {
  statuses: Record<string, TopicStatus>;
  scores: Record<string, number>;
}

/**
 * What the tree looked like the last time you saw it. Read once per new report, then replaced
 * by the current state, so an unlock animates once (after the sync that caused it), not on every visit.
 * Null on the very first look: nothing animates until there's a baseline.
 */
function useSeen(report: TopicReport | undefined): { ready: boolean; seen: Seen | null } {
  const [state, setState] = useState<{ ready: boolean; seen: Seen | null }>({ ready: false, seen: null });
  const computedAt = report?.computedAt ?? null;
  useEffect(() => {
    if (!report || !report.hasData) return;
    let alive = true;
    void (async () => {
      const seen = await readPref<Seen>(SEEN_KEY).catch(() => null);
      if (!alive) return;
      setState({ ready: true, seen });
      await writePref<Seen>(SEEN_KEY, {
        statuses: statusSnapshot(report.topics),
        scores: Object.fromEntries(report.topics.map((t) => [t.topicId, t.score])),
      }).catch(() => undefined);
    })();
    return () => {
      alive = false;
    };
    // Only a new report (a sync, or a fresh visit) should re-read the baseline.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [computedAt]);
  return { ready: state.ready || (report !== undefined && !report.hasData), seen: state.seen };
}

const FILTERS: { id: TreeFilter; label: string; hint: string }[] = [
  { id: "all", label: "All", hint: "Every topic" },
  { id: "unlocked", label: "Unlocked", hint: "Every topic except Locked ones" },
  { id: "weak", label: "Weak", hint: `Practiced but under ${STATUS_THRESHOLDS.strong}: Weak and Developing` },
  { id: "blind", label: "Blind spots", hint: "Never solved, but common at your rating" },
];

const plateCls = "rounded-md border border-glass-border bg-abyss-raised/90 shadow-slab";

function IconButton({ label, onClick, pressed, children }: { label: string; onClick: () => void; pressed?: boolean; children: React.ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={label}
          aria-pressed={pressed}
          onClick={onClick}
          className={cn(
            "grid size-8 place-items-center rounded-sm transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink",
            pressed ? "bg-glass-hover text-ink" : "text-ink-muted",
          )}
        >
          {children}
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{label}</TooltipContent>
    </Tooltip>
  );
}

function CanvasControls({ legendOpen, toggleLegend }: { legendOpen: boolean; toggleLegend: () => void }) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  return (
    <div className={cn("flex gap-0.5 p-0.5", plateCls)}>
      <IconButton label="Zoom in" onClick={() => void zoomIn({ duration: 160 })}>
        <Plus aria-hidden className="size-4" strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Zoom out" onClick={() => void zoomOut({ duration: 160 })}>
        <Minus aria-hidden className="size-4" strokeWidth={1.8} />
      </IconButton>
      <IconButton label="Fit the whole tree" onClick={() => void fitView({ ...FIT, duration: 240 })}>
        <Maximize aria-hidden className="size-4" strokeWidth={1.8} />
      </IconButton>
      <IconButton label={legendOpen ? "Hide the key" : "Show the key"} pressed={legendOpen} onClick={toggleLegend}>
        <Info aria-hidden className="size-4" strokeWidth={1.8} />
      </IconButton>
    </div>
  );
}

const LEGEND: { status: TopicStatus; score: number; range: string }[] = [
  { status: "Locked", score: 0, range: "prerequisites under 25" },
  { status: "Untouched", score: 0, range: "unlocked, no solves" },
  { status: "Weak", score: 20, range: "1–24" },
  { status: "Developing", score: 40, range: "25–49" },
  { status: "Strong", score: 60, range: "50+" },
  { status: "Mastered", score: 100, range: "75+, 15 solves, one at your rating" },
];

function Legend() {
  return (
    <div className={cn("flex w-[268px] flex-col gap-2 px-3 py-2.5", plateCls)}>
      <p className="text-label text-ink">Ring = strength out of 100, one segment per 10 points</p>
      <ul className="flex flex-col gap-1.5">
        {LEGEND.map((l) => (
          <li key={l.status} className="flex items-center gap-2 text-label text-ink-muted">
            <MasteryRing score={l.score} status={l.status} size={16} stroke={2.5} />
            <span className="text-ink">{STATUS_WORD[l.status]}</span>
            {l.range}
          </li>
        ))}
        <li className="flex items-center gap-2 text-label text-ink-muted">
          <span aria-hidden className="grid size-4 place-items-center rounded-full bg-ink">
            <Crosshair className="size-3 text-abyss" strokeWidth={2.4} />
          </span>
          <span className="text-ink">Work on next</span>
        </li>
        <li className="flex items-center gap-2 text-label text-ink-muted">
          <svg aria-hidden width="16" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="16" y2="4" stroke="var(--accent)" strokeWidth="1.5" />
          </svg>
          <span className="text-ink">Unlocked path</span>
          <svg aria-hidden width="16" height="8" className="shrink-0">
            <line x1="0" y1="4" x2="16" y2="4" stroke="var(--glass-border-strong)" strokeWidth="1.5" strokeDasharray="4 3" />
          </svg>
          not yet
        </li>
      </ul>
    </div>
  );
}

/**
 * The screen's answer to "what now?": the engine's work-on-next topics (with why, on hover and
 * in the panel), plus what rose since your last look. Sits above the canvas so it never covers nodes.
 */
function NextStrip({
  items,
  changes,
  onPick,
}: {
  items: readonly StandingItem[];
  changes: readonly { id: string; name: string; to: TopicStatus }[];
  onPick: (id: string) => void;
}) {
  if (!items.length && !changes.length) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
      {items.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="flex items-center gap-1.5 text-label text-ink">
            <span aria-hidden className="grid size-4 place-items-center rounded-full bg-ink">
              <Crosshair className="size-3 text-abyss" strokeWidth={2.4} />
            </span>
            Work on next
          </h2>
          <ul className="flex flex-wrap gap-1.5">
            {items.map((w) => (
              <li key={w.topicId}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => onPick(w.topicId)}
                      aria-description={w.reason}
                      className="flex h-8 items-center gap-2 rounded-sm border border-glass-border bg-glass px-2.5 text-body-sm text-ink transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong hover:bg-glass-hover"
                    >
                      <span className="font-semibold">{w.name}</span>
                      <span className="numeric font-display text-label font-semibold text-ink-muted">{w.score}</span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[280px]">
                    {w.reason}
                  </TooltipContent>
                </Tooltip>
              </li>
            ))}
          </ul>
        </div>
      )}
      {changes.length > 0 && (
        <p className="text-label text-ink-muted">
          Since your last look:{" "}
          {changes.map((c, i) => (
            <span key={c.id}>
              {i > 0 && ", "}
              <button type="button" onClick={() => onPick(c.id)} className="rounded-xs text-ink underline decoration-glass-border-strong underline-offset-4 hover:decoration-ink">
                {c.name}
              </button>{" "}
              rose to {STATUS_WORD[c.to]}
            </span>
          ))}
        </p>
      )}
    </div>
  );
}

function Tree({ report, seen }: { report: TopicReport; seen: Seen | null }) {
  const filter = useUiStore((s) => s.treeFilter);
  const setFilter = useUiStore((s) => s.setTreeFilter);
  const [query, setQuery] = useState("");
  const [hovered, setHovered] = useState<string | null>(null);
  const [legendOpen, setLegendOpen] = useState(false);
  const openTopicId = useUiStore((s) => s.openTopicId);
  const openTopic = useUiStore((s) => s.openTopic);
  const { setCenter, getZoom } = useReactFlow();
  const containerRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const model = useMemo(() => buildSkillTree(report.topics, report.standing, seen?.statuses ?? null), [report, seen]);
  const positions = useMemo(() => layoutTree(model.nodes.map((n) => n.id), model.edges), [model]);

  const counts = useMemo(
    () => Object.fromEntries(FILTERS.map((f) => [f.id, model.nodes.filter((n) => matchesFilter(n, f.id)).length])) as Record<TreeFilter, number>,
    [model],
  );

  const visible = useMemo(
    () => new Set(model.nodes.filter((n) => matchesFilter(n, filter) && matchesSearch(n, query)).map((n) => n.id)),
    [model, filter, query],
  );

  const changes = useMemo(
    () =>
      model.nodes
        .filter((n) => n.changedFrom !== null && isPromotion(n.changedFrom, n.status))
        .map((n) => ({ id: n.id, name: n.name, to: n.status })),
    [model],
  );

  // A hovered or open topic lights its prerequisite chain and what it leads to; the rest recedes.
  const focusId = hovered ?? openTopicId;
  const lineage = useMemo(() => (focusId ? lineageEdges(focusId, model.edges) : null), [focusId, model.edges]);

  /** Pan so a node sits in the part of the canvas the side panel leaves visible. */
  const reveal = useCallback(
    (id: string, force: boolean) => {
      const pos = positions.get(id);
      const el = containerRef.current;
      if (!pos || !el) return;
      const box = el.getBoundingClientRect();
      const visibleRight = useUiStore.getState().openTopicId ? Math.min(box.right, window.innerWidth - PANEL_W) : box.right;
      const rect = el.querySelector<HTMLElement>(`[data-id="${CSS.escape(id)}"]`)?.getBoundingClientRect();
      const offscreen = !rect || rect.left < box.left || rect.right > visibleRight - 8 || rect.top < box.top || rect.bottom > box.bottom;
      if (!force && !offscreen) return;
      const zoom = getZoom();
      const visibleW = Math.max(240, visibleRight - box.left);
      void setCenter(pos.x + NODE_W / 2 + (box.width - visibleW) / 2 / zoom, pos.y + NODE_H / 2, { zoom, duration: 240 });
    },
    [positions, getZoom, setCenter],
  );

  const focusTopic = useCallback(
    (id: string, center = false) => {
      openTopic(id);
      // After the panel state updates, so the visible area accounts for it.
      requestAnimationFrame(() => reveal(id, center));
    },
    [openTopic, reveal],
  );
  const onFocusNode = useCallback((id: string) => reveal(id, false), [reveal]);

  // DOM (and so tab) order follows the picture: top to bottom, left to right.
  const ordered = useMemo(
    () =>
      [...model.nodes].sort((a, b) => {
        const pa = positions.get(a.id)!;
        const pb = positions.get(b.id)!;
        return pa.y - pb.y || pa.x - pb.x;
      }),
    [model, positions],
  );

  const nodes = useMemo<TopicFlowNode[]>(
    () =>
      ordered.map((n) => ({
        id: n.id,
        type: "topic",
        position: positions.get(n.id)!,
        width: NODE_W,
        height: NODE_H,
        data: {
          ...n,
          dimmed: !visible.has(n.id),
          selected: openTopicId === n.id,
          previousScore: seen?.scores[n.id],
          onOpen: focusTopic,
          onFocusNode,
        },
        draggable: false,
        connectable: false,
        selectable: false,
        focusable: false,
      })),
    [ordered, positions, visible, openTopicId, seen, focusTopic, onFocusNode],
  );

  const edges = useMemo<Edge[]>(
    () =>
      model.edges.map((e) => {
        const filtered = !visible.has(e.source) || !visible.has(e.target);
        const onLineage = lineage?.has(e.id) ?? false;
        const opacity = filtered ? 0.12 : lineage ? (onLineage ? 1 : 0.18) : e.lit ? 0.75 : 1;
        return {
          id: e.id,
          source: e.source,
          target: e.target,
          focusable: false,
          selectable: false,
          zIndex: onLineage ? 1 : 0,
          style: {
            stroke: e.lit ? "var(--accent)" : onLineage ? "var(--ink-muted)" : "var(--glass-border-strong)",
            strokeWidth: onLineage ? 2 : 1.5,
            // Unlit edges are dashed as well as dim, so lit vs not doesn't hang on color (at Newbie the accent is gray).
            strokeDasharray: e.lit ? undefined : "4 5",
            opacity,
            transition: "opacity 160ms var(--ease-out)",
          },
        };
      }),
    [model, visible, lineage],
  );

  const bestMatch = useMemo(() => {
    if (!query.trim()) return undefined;
    return [...model.nodes]
      .filter((n) => visible.has(n.id))
      .sort((a, b) => searchRank(b, query) - searchRank(a, query))[0];
  }, [model, visible, query]);
  const noMatch = query.trim() !== "" && visible.size === 0;

  // "/" jumps to search from anywhere on this screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.ctrlKey || e.metaKey || e.altKey) return;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /**
   * First view: the whole tree if it fits at a readable zoom, otherwise a readable zoom with the
   * roots at the top, centered (pan or zoom out, or use the minimap, for the rest).
   */
  const onInit = useCallback(
    (rf: ReactFlowInstance<TopicFlowNode>) => {
      const el = containerRef.current;
      if (!el || positions.size === 0) return;
      const ps = [...positions.values()];
      const minX = Math.min(...ps.map((p) => p.x));
      const maxX = Math.max(...ps.map((p) => p.x)) + NODE_W;
      const minY = Math.min(...ps.map((p) => p.y));
      const maxY = Math.max(...ps.map((p) => p.y)) + NODE_H;
      const w = el.clientWidth;
      const h = el.clientHeight;
      const fit = Math.min((w - 2 * PAD.x) / (maxX - minX), (h - PAD.top - PAD.bottom) / (maxY - minY));
      const zoom = Math.min(1, Math.max(fit, READABLE_ZOOM));
      const x = (w - (maxX - minX) * zoom) / 2 - minX * zoom;
      const y = fit >= READABLE_ZOOM ? PAD.top + (h - PAD.top - PAD.bottom - (maxY - minY) * zoom) / 2 - minY * zoom : PAD.top - minY * zoom;
      void rf.setViewport({ x, y, zoom });
    },
    [positions],
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Show topics" className="flex flex-wrap items-center gap-1.5">
          {FILTERS.map((f) => (
            <Tooltip key={f.id}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  aria-pressed={filter === f.id}
                  onClick={() => setFilter(f.id)}
                  className={cn(
                    "flex h-8 items-center gap-1.5 rounded-full border px-3 text-label transition-colors duration-[var(--dur-fast)]",
                    filter === f.id
                      ? "border-accent bg-accent-soft text-ink"
                      : "border-glass-border bg-glass text-ink-muted hover:border-glass-border-strong hover:text-ink",
                  )}
                >
                  {f.label}
                  <span className="numeric text-ink-muted">{counts[f.id]}</span>
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom">{f.hint}</TooltipContent>
            </Tooltip>
          ))}
        </div>
        <label className="relative flex items-center">
          <span className="sr-only">Find a topic or tag</span>
          <Search aria-hidden className="pointer-events-none absolute left-2.5 size-4 text-ink-faint" strokeWidth={1.8} />
          <input
            ref={searchRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && bestMatch) focusTopic(bestMatch.id, true);
              if (e.key === "Escape" && query) {
                e.preventDefault();
                e.stopPropagation();
                setQuery("");
              }
            }}
            placeholder="Find a topic or tag"
            className="h-8 w-[240px] rounded-sm border border-glass-border bg-abyss-sunken pr-14 pl-8 text-body-sm text-ink placeholder:text-ink-faint transition-colors duration-[var(--dur-fast)] hover:border-glass-border-strong focus-visible:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {query ? (
            <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="absolute right-1.5 grid size-5 place-items-center rounded-xs text-ink-muted hover:text-ink">
              <X aria-hidden className="size-3.5" />
            </button>
          ) : (
            <kbd aria-hidden className="pointer-events-none absolute right-2 rounded-xs border border-glass-border-strong px-1.5 text-label text-ink-muted">
              /
            </kbd>
          )}
        </label>
      </div>
      <NextStrip items={report.standing.weaknesses} changes={changes} onPick={(id) => focusTopic(id, true)} />
      <p className="sr-only" aria-live="polite">
        {query.trim()
          ? noMatch
            ? `No topic or tag matches ${query.trim()}.`
            : `${visible.size} ${visible.size === 1 ? "topic matches" : "topics match"}. Press Enter to open ${bestMatch?.name ?? "the first"}.`
          : changes.length
            ? `Since your last look: ${changes.map((c) => `${c.name} rose to ${STATUS_WORD[c.to]}`).join(", ")}.`
            : ""}
      </p>

      <div
        ref={containerRef}
        className="skill-tree glass-card relative h-[calc(100vh-var(--titlebar-h)-var(--topbar-h)-154px)] min-h-[440px] overflow-hidden"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onInit={onInit}
          onNodeMouseEnter={(_, n) => setHovered(n.id)}
          onNodeMouseLeave={() => setHovered(null)}
          minZoom={0.3}
          maxZoom={1.6}
          nodesDraggable={false}
          nodesConnectable={false}
          nodesFocusable={false}
          edgesFocusable={false}
          elementsSelectable={false}
          zoomOnDoubleClick={false}
          attributionPosition="top-left"
          colorMode="dark"
        >
          <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(150, 172, 230, 0.12)" />
          <Panel position="top-right" className="flex flex-col items-end gap-2">
            <CanvasControls legendOpen={legendOpen} toggleLegend={() => setLegendOpen((v) => !v)} />
            {legendOpen && <Legend />}
          </Panel>
          {noMatch && (
            <Panel position="top-center" className="!top-1/3">
              <div className={cn("flex items-center gap-3 px-4 py-3", plateCls)}>
                <SearchX aria-hidden className="size-4 text-ink-muted" strokeWidth={1.8} />
                <p className="text-body-sm text-ink">No topic or tag matches “{query.trim()}”.</p>
                <Button variant="outline" size="sm" onClick={() => setQuery("")}>
                  Clear search
                </Button>
              </div>
            </Panel>
          )}
          {!legendOpen && (
            <MiniMap
              position="top-right"
              pannable
              zoomable
              ariaLabel="Skill tree overview"
              nodeBorderRadius={999}
              nodeColor={(n) => {
                const d = n.data as TopicFlowNode["data"];
                if (d.dimmed) return "rgba(150, 172, 230, 0.10)";
                if (d.workOnNext) return "var(--ink)";
                return d.status === "Strong" || d.status === "Mastered" ? "var(--accent)" : d.status === "Locked" ? "rgba(150, 172, 230, 0.14)" : "rgba(150, 172, 230, 0.32)";
              }}
              maskColor="rgba(5, 8, 18, 0.62)"
              bgColor="var(--abyss-raised)"
              style={{ width: 156, height: 100, marginTop: 58 }}
            />
          )}
        </ReactFlow>
      </div>
    </div>
  );
}

export function SkillTree() {
  const { data: report, isLoading } = useTopicReport();
  const { ready, seen } = useSeen(report);
  // Deep link (/topics/:id) lands here with the topic to open.
  const location = useLocation();
  const openTopic = useUiStore((s) => s.openTopic);
  useEffect(() => {
    const id = (location.state as { openTopic?: string } | null)?.openTopic;
    if (id) openTopic(id);
  }, [location.state, openTopic]);

  if (isLoading || (report?.hasData && !ready)) return <p className="text-body-sm text-ink-muted">Loading your topics…</p>;

  if (!report?.hasData) {
    return (
      <div className="glass-card grid grid-cols-1 items-center gap-10 p-8 md:grid-cols-[1fr_auto]">
        <EmptyState
          icon={Network}
          title="Your skill tree grows from solved problems"
          action={
            <Button asChild variant="outline" size="sm">
              <Link to="/settings">Check your handles</Link>
            </Button>
          }
        >
          Every topic you've practiced on Codeforces and LeetCode becomes a node, with a mastery ring
          that fills as the topic gets stronger. Nodes unlock after the first sync.
        </EmptyState>
        <LockedTree />
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <Tree report={report} seen={seen} />
    </ReactFlowProvider>
  );
}

// Locked silhouette for the empty state: the tree's shape with no topics, labels or values.
const SIL_NODES = [
  { x: 160, y: 40, r: 18 },
  { x: 80, y: 120, r: 15 },
  { x: 240, y: 120, r: 15 },
  { x: 40, y: 210, r: 12 },
  { x: 120, y: 210, r: 12 },
  { x: 200, y: 210, r: 12 },
  { x: 280, y: 210, r: 12 },
  { x: 160, y: 290, r: 12 },
] as const;
const SIL_EDGES: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [0, 2], [1, 3], [1, 4], [2, 5], [2, 6], [4, 7], [5, 7],
];

function LockedTree() {
  return (
    <svg viewBox="0 0 320 330" className="h-auto w-full max-w-[320px]" aria-hidden>
      {SIL_EDGES.map(([a, b]) => (
        <line
          key={`${a}-${b}`}
          x1={SIL_NODES[a]!.x}
          y1={SIL_NODES[a]!.y}
          x2={SIL_NODES[b]!.x}
          y2={SIL_NODES[b]!.y}
          stroke="var(--glass-border-strong)"
          strokeWidth={1.5}
        />
      ))}
      {SIL_NODES.map((n, i) => (
        <g key={i}>
          <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none" stroke="var(--glass-border)" strokeWidth={3} strokeDasharray="3 5" />
          <circle cx={n.x} cy={n.y} r={n.r} fill="var(--abyss-sunken)" stroke="var(--glass-border-strong)" strokeWidth={1.5} />
        </g>
      ))}
    </svg>
  );
}
