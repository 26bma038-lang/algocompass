import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useUiStore, type Ceremony } from "@/data/uiStore";
import { applyRankAccent, RANK_BANDS } from "@/lib/rank";

/**
 * Progression moments (DESIGN.md: ceremony up to 1.2s, skippable with a click or Esc, never
 * blocking input). The overlay never takes pointer events: a click anywhere skips the moment and
 * still reaches whatever you clicked.
 */

/** Total time on screen; the motion itself finishes within 1.2s. */
const LEVEL_MS = 2600;
const RANK_MS = 3200;
const SHIFT_MS = 1200;

const ease = [0.22, 1, 0.36, 1] as const;

function useSkip(onSkip: () => void, active: boolean) {
  const skip = useRef(onSkip);
  skip.current = onSkip;
  useEffect(() => {
    if (!active) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && skip.current();
    // Capture, and never preventDefault: the click still does what you meant.
    const click = () => skip.current();
    window.addEventListener("keydown", key, true);
    window.addEventListener("pointerdown", click, true);
    return () => {
      window.removeEventListener("keydown", key, true);
      window.removeEventListener("pointerdown", click, true);
    };
  }, [active]);
}

/** Level-up: a Float plate drops under the level badge and reveals the title. */
function LevelUp({ c, onDone }: { c: Extract<Ceremony, { kind: "level" }>; onDone: () => void }) {
  useEffect(() => {
    const t = window.setTimeout(onDone, LEVEL_MS);
    return () => window.clearTimeout(t);
  }, [onDone]);
  return (
    <motion.div
      key="level"
      role="status"
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, transition: { duration: 0.16 } }}
      transition={{ duration: 0.24, ease }}
      className="pointer-events-none fixed top-[92px] right-6 z-[60] flex w-[260px] flex-col gap-1 rounded-md border border-glass-border-strong bg-abyss-raised p-4 shadow-float"
    >
      <span className="text-label text-ink-muted">Level up</span>
      <span className="flex items-baseline gap-2">
        <span className="numeric font-display text-display leading-none font-semibold text-ink">{c.level}</span>
        {/* Title reveal: a left-to-right wipe, done by 0.9s. */}
        <motion.span
          initial={{ clipPath: "inset(0 100% 0 0)", opacity: 0.4 }}
          animate={{ clipPath: "inset(0 0% 0 0)", opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.6, ease }}
          className="font-display text-title font-semibold text-accent"
        >
          {c.title}
        </motion.span>
      </span>
      <motion.span
        aria-hidden
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.9, ease }}
        className="mt-2 block h-[2px] origin-left bg-accent shadow-[0_0_10px_var(--accent-glow)]"
      />
    </motion.div>
  );
}

/**
 * The Aura Shift: the whole app repaints from the old rank's color to the new one over 1.2s
 * (one registered CSS variable), while a plate names the new rank. Preview mode (Debug page)
 * puts your real rank back afterwards: the Earned Light Rule.
 */
function AuraShift({ c, onDone }: { c: Extract<Ceremony, { kind: "rank" }>; onDone: () => void }) {
  const reduce = useReducedMotion();
  const from = RANK_BANDS[c.from]!;
  const to = RANK_BANDS[c.to]!;
  const after = RANK_BANDS[c.to + 1] ?? null;

  useEffect(() => {
    const root = document.documentElement;
    applyRankAccent(from.token, to.token);
    // Next frame: turn the transition on, then point the aura at the new rank.
    const raf = requestAnimationFrame(() => {
      if (!reduce) root.classList.add("aura-shifting");
      applyRankAccent(to.token, after?.token ?? null);
    });
    const done = window.setTimeout(onDone, RANK_MS);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(done);
      root.classList.remove("aura-shifting");
      // Preview: back to the rank you've actually earned. A real promotion keeps the new color.
      if (c.preview) applyRankAccent(from.token, to.token);
      else applyRankAccent(to.token, after?.token ?? null);
    };
  }, [c, from, to, after, reduce, onDone]);

  return (
    <motion.div
      key="rank"
      role="status"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.24 } }}
      transition={{ duration: 0.24 }}
      className="pointer-events-none fixed inset-0 z-[60] grid place-items-center"
    >
      {/* A wash of the new color from the top, gone by the time the repaint settles. */}
      <motion.div
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.5, 0] }}
        transition={{ duration: SHIFT_MS / 1000, ease: "easeInOut" }}
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,var(--rank-glow),transparent_60%)]"
      />
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.5, ease }}
        className="relative flex flex-col items-center gap-2 rounded-lg border border-[var(--rank-line)] bg-abyss-raised/90 px-10 py-7 shadow-[0_0_0_1px_var(--rank-line),0_6px_24px_-6px_var(--rank-glow)]"
      >
        <span className="text-label text-ink-muted">{c.preview ? "Preview · Promoted" : "Promoted"}</span>
        <span className="font-display text-display leading-none font-semibold text-rank">{to.label}</span>
        <span className="text-body-sm text-ink-muted">
          {from.label} → {to.label}. The whole app now wears your new rank.
        </span>
        <span className="text-label text-ink-faint">Click or press Esc to continue</span>
      </motion.div>
    </motion.div>
  );
}

export function Ceremonies() {
  const ceremony = useUiStore((s) => s.ceremony);
  const end = useUiStore((s) => s.endCeremony);
  useSkip(end, ceremony !== null);
  return (
    <AnimatePresence>
      {ceremony?.kind === "level" && <LevelUp key={`level-${ceremony.level}`} c={ceremony} onDone={end} />}
      {ceremony?.kind === "rank" && <AuraShift key={`rank-${ceremony.to}-${ceremony.preview}`} c={ceremony} onDone={end} />}
    </AnimatePresence>
  );
}
