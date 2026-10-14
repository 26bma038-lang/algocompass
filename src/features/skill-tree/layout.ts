import dagre from "@dagrejs/dagre";

/** Node footprint in flow units: the ring plus a two-line name and a status line below it. */
export const NODE_W = 108;
export const NODE_H = 120;
const MIN_GAP = 10;
/**
 * dagre spreads wide ranks to keep edges straight, which makes this DAG ~2.3k units wide.
 * Pulling each rank toward the center (keeping dagre's crossing-minimized order) makes it
 * fit a desktop window at a readable zoom.
 */
const SQUEEZE = 0.66;

/** Top-to-bottom layered layout of the prerequisite DAG (prerequisites above what they unlock). */
export function layoutTree(
  nodeIds: readonly string[],
  edges: readonly { source: string; target: string }[],
): Map<string, { x: number; y: number }> {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: "TB", nodesep: 14, ranksep: 26, marginx: 0, marginy: 0 });
  g.setDefaultEdgeLabel(() => ({}));
  for (const id of nodeIds) g.setNode(id, { width: NODE_W, height: NODE_H });
  for (const e of edges) g.setEdge(e.source, e.target);
  dagre.layout(g);

  const width = g.graph().width ?? 0;
  const mid = width / 2;
  const rows = new Map<number, { id: string; x: number }[]>();
  for (const id of nodeIds) {
    const n = g.node(id);
    const row = rows.get(n.y) ?? [];
    row.push({ id, x: mid + (n.x - mid) * SQUEEZE });
    rows.set(n.y, row);
  }

  const out = new Map<string, { x: number; y: number }>();
  for (const [y, row] of rows) {
    row.sort((a, b) => a.x - b.x);
    const wanted = row.reduce((s, n) => s + n.x, 0) / row.length;
    // Sweep left to right so squeezed neighbours never overlap, then re-center the row.
    for (let i = 1; i < row.length; i++) row[i]!.x = Math.max(row[i]!.x, row[i - 1]!.x + NODE_W + MIN_GAP);
    const shift = wanted - row.reduce((s, n) => s + n.x, 0) / row.length;
    // dagre gives centers; React Flow wants top-left corners.
    for (const n of row) out.set(n.id, { x: n.x + shift - NODE_W / 2, y: y - NODE_H / 2 });
  }
  return out;
}
