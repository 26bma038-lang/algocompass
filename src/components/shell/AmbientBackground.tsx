import { useEffect, useRef } from "react";

/**
 * Ambient nebula in the theme accent (strength per theme: --ambient-* in globals.css): three blurred blobs drifting on long
 * transform-only loops. Paused while the window is hidden; static under reduced motion
 * (see globals.css).
 */
export function AmbientBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => ref.current?.classList.toggle("ambient-paused", document.hidden);
    sync();
    document.addEventListener("visibilitychange", sync);
    return () => document.removeEventListener("visibilitychange", sync);
  }, []);

  return (
    <div ref={ref} aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      <div
        className="nebula-blob"
        style={{
          width: "58vw",
          height: "58vw",
          top: "-22vw",
          right: "-12vw",
          background: "var(--accent)",
          opacity: "var(--ambient-a)",
          animation: "nebula-drift-a 52s ease-in-out infinite",
        }}
      />
      <div
        className="nebula-blob"
        style={{
          width: "46vw",
          height: "46vw",
          bottom: "-24vw",
          left: "4vw",
          background: "var(--accent-2)",
          opacity: "var(--ambient-b)",
          animation: "nebula-drift-b 61s ease-in-out infinite",
        }}
      />
      <div
        className="nebula-blob"
        style={{
          width: "30vw",
          height: "30vw",
          top: "30%",
          left: "38%",
          background: "var(--nebula-deep)",
          opacity: "var(--ambient-c)",
          animation: "nebula-drift-c 44s ease-in-out infinite",
        }}
      />
      {/* Vignette (Dark only) keeps the edges deep so the glow reads as light, not fog. */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(120% 90% at 50% 40%, transparent 45%, var(--ambient-vignette) 100%)",
        }}
      />
    </div>
  );
}
