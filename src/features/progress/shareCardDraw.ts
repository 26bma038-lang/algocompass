import type { ShareWeek } from "@/engine/shareCard";
import { weekRangeWords } from "@/engine/shareCard";
import { TOPIC_BY_ID } from "@/engine/topics";
import { plainTopicName } from "@/lib/glossary";
import { bandForRating, RANK_BANDS, type RankToken } from "@/lib/rank";
import type { Scheme } from "@/lib/theme";

/**
 * Draws the "Share my week" card on a canvas (v1.7): 1200x630 (the size link previews use), drawn
 * at 2x. Colours are the theme's own tokens, read from a hidden [data-theme] wrapper, so Light and
 * Dark match the app exactly; the rating and rank chip use your real rank colour (DESIGN.md).
 */

export const CARD_W = 1200;
export const CARD_H = 630;
export const CARD_SCALE = 2;

const TOKENS = ["abyss", "abyss-raised", "glass-border-strong", "ink", "ink-muted", "ink-faint", "accent", "nebula-deep", "ember", "success", "danger"] as const;
type Palette = Record<(typeof TOKENS)[number], string> & { rank: string };

const DISPLAY = '"Chakra Petch", "Geist Variable", system-ui, sans-serif';
const SANS = '"Geist Variable", "Segoe UI", system-ui, sans-serif';

/** The theme's token values, read from a hidden wrapper (selectors match any [data-theme] element). */
function readPalette(scheme: Scheme, rankToken: RankToken | null): Palette {
  const probe = document.createElement("div");
  probe.setAttribute("data-theme", scheme);
  probe.style.display = "none";
  document.body.appendChild(probe);
  const css = getComputedStyle(probe);
  const get = (name: string) => css.getPropertyValue(`--${name}`).trim();
  const p = Object.fromEntries(TOKENS.map((t) => [t, get(t)])) as Palette;
  p.rank = rankToken ? get(rankToken) : p["ink-muted"];
  probe.remove();
  return p;
}

/** "#8b9bff" + 0.2 → "rgba(139, 155, 255, 0.2)" for gradient stops (tokens used here are hex). */
function alpha(hex: string, a: number): string {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return hex;
  const n = parseInt(m[1]!, 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

/** The largest font size (down to `min`) at which `text` fits in `width`. */
function fit(ctx: CanvasRenderingContext2D, text: string, font: (px: number) => string, px: number, min: number, width: number): number {
  for (let s = px; s > min; s -= 2) {
    ctx.font = font(s);
    if (ctx.measureText(text).width <= width) return s;
  }
  ctx.font = font(min);
  return min;
}

/** The compass mark from the title bar, drawn small in the accent. */
function compass(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(cx + r * 0.45, cy - r * 0.45);
  ctx.lineTo(cx + r * 0.14, cy + r * 0.14);
  ctx.lineTo(cx - r * 0.45, cy + r * 0.45);
  ctx.lineTo(cx - r * 0.14, cy - r * 0.14);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export async function loadCardFonts(): Promise<void> {
  await Promise.all(
    ['600 150px "Chakra Petch"', '500 26px "Chakra Petch"', '400 22px "Geist Variable"', '500 22px "Geist Variable"'].map((f) => document.fonts.load(f).catch(() => [])),
  );
}

export function drawShareCard(canvas: HTMLCanvasElement, w: ShareWeek, scheme: Scheme): void {
  const band = w.rating != null ? bandForRating(w.rating).current : null;
  const rankBand = band ?? (w.rank ? RANK_BANDS.find((b) => b.rank === w.rank) ?? null : null);
  const p = readPalette(scheme, rankBand?.token ?? null);
  canvas.width = CARD_W * CARD_SCALE;
  canvas.height = CARD_H * CARD_SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.setTransform(CARD_SCALE, 0, 0, CARD_SCALE, 0, 0);
  const dark = scheme === "dark";

  // Ground and the ambient nebula, still (two accent glows and the deep-indigo blob).
  ctx.fillStyle = p.abyss;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  const glow = (x: number, y: number, r: number, color: string, a: number) => {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, alpha(color, a));
    g.addColorStop(1, alpha(color, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, CARD_W, CARD_H);
  };
  glow(1040, 40, 560, p.accent, dark ? 0.2 : 0.1);
  glow(120, 640, 480, p["nebula-deep"], dark ? 0.55 : 0.45);
  glow(560, 300, 380, p.accent, dark ? 0.06 : 0.03);

  const X = 64;
  ctx.textBaseline = "alphabetic";

  // Header: the mark and wordmark, the week on the right.
  compass(ctx, X + 13, 76, 13, p.accent);
  ctx.fillStyle = p.ink;
  ctx.font = `500 26px ${DISPLAY}`;
  ctx.textAlign = "left";
  ctx.fillText("AlgoCompass", X + 38, 85);
  ctx.fillStyle = p["ink-muted"];
  ctx.font = `400 22px ${SANS}`;
  ctx.textAlign = "right";
  ctx.fillText(`My week · ${weekRangeWords(w.from)}`, CARD_W - X, 84);

  // Left: the rating, in your rank colour, and the rank chip.
  ctx.textAlign = "left";
  ctx.fillStyle = p["ink-muted"];
  ctx.font = `400 22px ${SANS}`;
  ctx.fillText("Codeforces rating", X, 196);
  if (w.rating != null && rankBand) {
    ctx.fillStyle = p.rank;
    ctx.font = `600 150px ${DISPLAY}`;
    ctx.fillText(String(w.rating), X - 4, 338);
    ctx.font = `500 22px ${DISPLAY}`;
    const label = rankBand.label;
    const lw = ctx.measureText(label).width + 32;
    roundRect(ctx, X, 366, lw, 40, 20);
    ctx.fillStyle = alpha(p.rank, dark ? 0.14 : 0.1);
    ctx.fill();
    ctx.strokeStyle = alpha(p.rank, 0.5);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = p.rank;
    ctx.fillText(label, X + 16, 393);
  } else {
    ctx.fillStyle = p["ink-muted"];
    ctx.font = `600 88px ${DISPLAY}`;
    ctx.fillText("Unrated", X - 2, 300);
    ctx.font = `400 22px ${SANS}`;
    ctx.fillText(w.handle ? "No rated round yet" : "No Codeforces handle added", X, 350);
  }
  if (w.rating != null) {
    ctx.font = `500 22px ${SANS}`;
    if (w.ratingWeek.rounds > 0) {
      const d = w.ratingWeek.delta;
      const sign = d > 0 ? "+" : d < 0 ? "−" : "±";
      const head = `${sign}${Math.abs(d)}`;
      ctx.fillStyle = d > 0 ? p.success : d < 0 ? p.danger : p.ink;
      ctx.fillText(head, X, 462);
      const hw = ctx.measureText(head).width;
      ctx.fillStyle = p["ink-muted"];
      ctx.font = `400 22px ${SANS}`;
      ctx.fillText(` this week, ${w.ratingWeek.rounds} rated ${w.ratingWeek.rounds === 1 ? "round" : "rounds"}`, X + hw, 462);
    } else {
      ctx.fillStyle = p["ink-muted"];
      ctx.font = `400 22px ${SANS}`;
      ctx.fillText("No rated round this week", X, 462);
    }
  }

  // Right: three tiles.
  const TX = 612;
  const TW = CARD_W - X - TX;
  const TH = 112;
  const tile = (y: number, label: string, value: string, detail: string, valueColor: string) => {
    roundRect(ctx, TX, y, TW, TH, 16);
    ctx.fillStyle = alpha(p["abyss-raised"], dark ? 0.86 : 0.92);
    ctx.fill();
    ctx.strokeStyle = p["glass-border-strong"];
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.textAlign = "left";
    ctx.fillStyle = p["ink-muted"];
    ctx.font = `400 20px ${SANS}`;
    ctx.fillText(label, TX + 24, y + 38);
    ctx.textAlign = "right";
    ctx.font = `400 20px ${SANS}`;
    const dw = detail ? ctx.measureText(detail).width : 0;
    if (detail) ctx.fillText(detail, TX + TW - 24, y + 90);
    ctx.textAlign = "left";
    ctx.fillStyle = valueColor;
    fit(ctx, value, (px) => `600 ${px}px ${DISPLAY}`, 46, 26, TW - 48 - dw - 24);
    ctx.fillText(value, TX + 24, y + 92);
  };
  const s = w.solves;
  const parts = [s.cf ? `${s.cf} Codeforces` : "", s.lc ? `${s.lc} LeetCode` : ""].filter(Boolean).join(" · ");
  tile(170, "Solved this week", String(s.total), parts || "Nothing yet", p.ink);
  tile(302, "Streak", `${w.streak} ${w.streak === 1 ? "day" : "days"}`, w.streak ? "in a row" : "", w.streak ? p.ember : p["ink-muted"]);
  const topic = w.topTopic ? TOPIC_BY_ID.get(w.topTopic.id) : undefined;
  tile(
    434,
    "Top topic",
    topic ? plainTopicName(topic.id, topic.name) : "None yet",
    w.topTopic ? `${w.topTopic.solves} solved` : "",
    topic ? p.ink : p["ink-muted"],
  );

  // Footer: whose week it is.
  if (w.handle) {
    ctx.font = `400 20px ${SANS}`;
    ctx.textAlign = "left";
    ctx.fillStyle = p["ink-faint"];
    ctx.fillText(`codeforces.com/profile/${w.handle}`, X, 590);
  }
}

export function canvasPng(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Couldn't make the image."))), "image/png"));
}
