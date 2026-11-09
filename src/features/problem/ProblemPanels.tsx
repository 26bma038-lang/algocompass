import { useId, useState, type ReactNode } from "react";
import { Dialog } from "radix-ui";
import { ExternalLink, PlayCircle, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useLibrary } from "@/data/learn";
import { useProblemPool } from "@/data/mustDo";
import { usePrefs } from "@/data/prefs";
import { useWatchedVideos } from "@/data/path";
import { openTarget, useSaveNote, useSheetNotes, useSolveIndex } from "@/data/sheets";
import { useUiStore } from "@/data/uiStore";
import { problemStatus } from "@/engine/sheets";
import type { ProblemRef } from "@/engine/problemRef";
import { easierProblem, editorialLinks, STUCK_LABELS, STUCK_STEPS, stuckTopic, stuckVideo, type StuckStepId } from "@/engine/stuck";
import { TOPIC_BY_ID } from "@/engine/topics";
import { learnTopicPath, watchPath } from "@/components/shell/nav";
import { LABELS, plainTopicName } from "@/lib/glossary";
import { openExternal } from "@/lib/openExternal";

/**
 * The note editor and the "Stuck?" steps (v1.7), mounted once in the app shell and opened from any
 * problem row (useUiStore.openTool). Lazy: nothing here loads until a row asks for it.
 */

const shell = "fixed top-[10vh] left-1/2 z-50 flex max-h-[80vh] w-[min(560px,calc(100vw-48px))] -translate-x-1/2 flex-col gap-4 overflow-y-auto rounded-md border border-glass-border-strong bg-abyss-raised p-6 shadow-float";

function Frame({ title, description, children, onClose }: { title: string; description: ReactNode; children: ReactNode; onClose: () => void }) {
  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-abyss/60" />
        <Dialog.Content className={shell}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <Dialog.Title className="truncate text-title font-semibold text-ink">{title}</Dialog.Title>
              <Dialog.Description className="text-body-sm text-ink-muted">{description}</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          {children}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// ---------- notes ----------

function NotePanel({ problem, onClose }: { problem: ProblemRef; onClose: () => void }) {
  const notes = useSheetNotes();
  const save = useSaveNote();
  const id = useId();
  const saved = notes.data?.get(problem.key)?.body ?? "";
  const [body, setBody] = useState<string | null>(null);
  const value = body ?? saved;
  const commit = () => {
    if (body !== null && body !== saved) save.mutate({ key: problem.key, body, title: problem.title });
  };
  return (
    <Frame
      title={problem.title}
      description="Your note. Why you got Wrong Answer, the key idea, what to remember. Private: kept only on this computer."
      onClose={() => {
        commit();
        onClose();
      }}
    >
      <label htmlFor={id} className="sr-only">
        Note on {problem.title}
      </label>
      <textarea
        id={id}
        autoFocus
        rows={7}
        value={notes.isLoading ? "" : value}
        disabled={notes.isLoading}
        placeholder="Why I got WA / the key idea…"
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
            commit();
            onClose();
          }
        }}
        className="w-full resize-y rounded-sm border border-glass-border bg-abyss-sunken px-3 py-2 text-body text-ink placeholder:text-ink-faint hover:border-glass-border-strong focus-visible:border-accent"
      />
      <div className="flex items-center justify-between gap-3">
        <span className="text-label text-ink-muted">Saved when you close this. Ctrl Enter saves and closes.</span>
        <Button
          size="sm"
          onClick={() => {
            commit();
            onClose();
          }}
        >
          Save
        </Button>
      </div>
    </Frame>
  );
}

// ---------- stuck ----------

function StepCard({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    // A new step scrolls into view, so the panel never hides what you just asked for.
    <li ref={(el) => el?.scrollIntoView({ block: "nearest" })} className="flex gap-3 rounded-md border border-glass-border bg-glass p-4">
      <span aria-hidden className="numeric grid size-6 shrink-0 place-items-center rounded-full bg-accent text-label font-semibold text-accent-ink">
        {n}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <h3 className="text-body font-semibold text-ink">{title}</h3>
        {children}
      </div>
    </li>
  );
}

function StuckStep({ id, problem, onClose }: { id: StuckStepId; problem: ProblemRef; onClose: () => void }) {
  const navigate = useNavigate();
  const lang = usePrefs().data?.videoLang ?? "en";
  const library = useLibrary();
  const watched = useWatchedVideos().data;
  const pool = useProblemPool();
  const solve = useSolveIndex();
  // v1.8: the first specific topic (a Greedy + Implementation problem is about greedy).
  const topicId = stuckTopic(problem);
  const n = STUCK_STEPS.indexOf(id) + 1;

  if (id === "topic") {
    const names = problem.topics.slice(0, 3).map((t) => plainTopicName(t, TOPIC_BY_ID.get(t)?.name ?? t));
    return (
      <StepCard n={n} title="What it is about">
        {names.length ? (
          <p className="text-body text-ink">
            {names.join(", ")}. <span className="text-ink-muted">That comes from the problem's own tags, so think about which of these ideas fits.</span>
          </p>
        ) : (
          <p className="text-body text-ink-muted">We don't have a topic for this one, so there's nothing honest to say here. Try the next step.</p>
        )}
      </StepCard>
    );
  }

  if (id === "video") {
    const v = library.ready ? stuckVideo(library.groups, topicId, library.path, new Set(watched?.keys() ?? []), lang) : null;
    return (
      <StepCard n={n} title="A video on the idea">
        {!library.ready ? (
          <p className="text-body-sm text-ink-muted">Looking for a video…</p>
        ) : v ? (
          <>
            <p className="text-body text-ink">
              {v.title} <span className="text-ink-muted">· {v.channel}, {v.minutes} min</span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="self-start"
              onClick={() => {
                onClose();
                navigate(`${watchPath(v.id)}?topic=${encodeURIComponent(topicId ?? "")}`);
              }}
            >
              <PlayCircle aria-hidden />
              Watch it here
            </Button>
          </>
        ) : (
          <div className="flex flex-col items-start gap-2">
            <p className="text-body text-ink-muted">
              {topicId
                ? `No video in the library is clearly about ${plainTopicName(topicId, TOPIC_BY_ID.get(topicId)?.name ?? topicId).toLowerCase()}, so we won't guess one.`
                : "This problem has no topic, so there's no video to point at."}
            </p>
            {topicId && TOPIC_BY_ID.has(topicId) && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  onClose();
                  navigate(learnTopicPath(topicId));
                }}
              >
                <PlayCircle aria-hidden />
                Browse the topic's videos
              </Button>
            )}
          </div>
        )}
      </StepCard>
    );
  }

  if (id === "easier") {
    const idx = solve.data;
    const p = pool.data && idx ? easierProblem(pool.data, problem, (k) => problemStatus(k, idx).done) : null;
    const target = p ? openTarget(p) : null;
    return (
      <StepCard n={n} title="An easier problem on the same topic">
        {pool.isLoading || solve.isLoading ? (
          <p className="text-body-sm text-ink-muted">Looking for one…</p>
        ) : p ? (
          <>
            <p className="text-body text-ink">
              {p.title} <span className="text-ink-muted">· {p.difficulty ?? (p.rating ? `rated ${p.rating}` : "")}</span>
            </p>
            {target && (
              <Button variant="outline" size="sm" className="self-start" onClick={() => openExternal(target.url)}>
                Open on {target.site}
                <ExternalLink aria-hidden />
              </Button>
            )}
          </>
        ) : (
          <p className="text-body text-ink-muted">No easier unsolved problem on this topic in the sheets. This is already near the bottom of the ladder.</p>
        )}
      </StepCard>
    );
  }

  const links = editorialLinks(problem);
  return (
    <StepCard n={n} title="The editorial">
      {links.length ? (
        <ul className="flex flex-col gap-2">
          {links.map((l) => (
            <li key={l.url} className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={() => openExternal(l.url)}
                className="inline-flex items-center gap-1 self-start rounded-xs text-body font-medium text-ink underline decoration-glass-border-strong underline-offset-4 hover:decoration-accent"
              >
                {l.label}
                <ExternalLink aria-hidden className="size-3.5" />
                <span className="sr-only">(opens in your browser)</span>
              </button>
              <span className="text-label text-ink-muted">{l.note}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-body text-ink-muted">We don't know an editorial page for this problem.</p>
      )}
    </StepCard>
  );
}

function StuckPanel({ problem, onClose }: { problem: ProblemRef; onClose: () => void }) {
  const [shown, setShown] = useState(0);
  const next = STUCK_STEPS[shown];
  return (
    <Frame title={`${LABELS.stuck} ${problem.title}`} description="Take it one step at a time. The solution only shows up at the last step, if you ask for it." onClose={onClose}>
      {shown > 0 && (
        <ol className="flex flex-col gap-3" aria-live="polite">
          {STUCK_STEPS.slice(0, shown).map((id) => (
            <StuckStep key={id} id={id} problem={problem} onClose={onClose} />
          ))}
        </ol>
      )}
      {next ? (
        <Button className="self-start" onClick={() => setShown((s) => s + 1)} autoFocus>
          {STUCK_LABELS[next]}
        </Button>
      ) : (
        <p className="text-body-sm text-ink-muted">That's every step. Write what you learn in a note, so it sticks.</p>
      )}
    </Frame>
  );
}

/** Mounted once in the shell; renders whichever tool a row opened. */
export function ProblemPanels() {
  const tool = useUiStore((s) => s.tool);
  const close = useUiStore((s) => s.closeTool);
  if (!tool) return null;
  // The key resets each panel's own state when a different problem or tool opens.
  const t = tool;
  return t.kind === "note" ? <NotePanel key={`n-${t.ref.key}`} problem={t.ref} onClose={close} /> : <StuckPanel key={`s-${t.ref.key}`} problem={t.ref} onClose={close} />;
}
