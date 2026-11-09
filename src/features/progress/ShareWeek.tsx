import { useEffect, useRef, useState } from "react";
import { Dialog } from "radix-ui";
import { Download, Share2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { savePng, useShareWeek } from "@/data/shareCard";
import { shareFileName } from "@/engine/shareCard";
import { useSchemeStore, type Scheme } from "@/lib/theme";
import { cn } from "@/lib/utils";
import { CARD_H, CARD_W, canvasPng, drawShareCard, loadCardFonts } from "./shareCardDraw";

const SCHEMES: readonly { id: Scheme; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

/**
 * Progress → "Share my week" (v1.7): a PNG of this week (rating, solves, streak, top topic) in the
 * app's style, Light or Dark, saved where you choose. It never leaves this computer on its own:
 * no upload, no link.
 */
export function ShareWeekButton() {
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="ghost">
          <Share2 aria-hidden />
          Share my week
        </Button>
      </Dialog.Trigger>
      {open && <SharePanel />}
    </Dialog.Root>
  );
}

function SharePanel() {
  const week = useShareWeek(true);
  const appScheme = useSchemeStore((s) => s.scheme);
  const [scheme, setScheme] = useState<Scheme>(appScheme);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvas = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!week.data || !canvas.current) return;
    let live = true;
    void loadCardFonts().then(() => {
      if (!live || !canvas.current || !week.data) return;
      drawShareCard(canvas.current, week.data, scheme);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [week.data, scheme]);

  const save = async () => {
    if (!canvas.current || !week.data) return;
    setSaving(true);
    try {
      const path = await savePng(await canvasPng(canvas.current), shareFileName(week.data.from));
      if (path) toast("Saved your week", { id: "share-week", description: path });
    } catch (e) {
      toast.error("Couldn't save the image", { description: e instanceof Error ? e.message : String(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-50 bg-abyss/60" />
      <Dialog.Content className="fixed top-[8vh] left-1/2 z-50 flex w-[min(760px,calc(100vw-48px))] -translate-x-1/2 flex-col gap-5 rounded-md border border-glass-border-strong bg-abyss-raised p-6 shadow-float">
        <div className="flex items-start justify-between gap-4">
          <div className="flex flex-col gap-1">
            <Dialog.Title className="font-display text-headline font-semibold text-ink">Share my week</Dialog.Title>
            <Dialog.Description className="text-body-sm text-ink-muted">
              An image of this week from your own numbers. It's saved on this computer; nothing is uploaded.
            </Dialog.Description>
          </div>
          <Dialog.Close
            aria-label="Close"
            className="grid size-8 shrink-0 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
          >
            <X aria-hidden className="size-4" />
          </Dialog.Close>
        </div>

        <div className="relative overflow-hidden rounded-sm border border-glass-border" style={{ aspectRatio: `${CARD_W} / ${CARD_H}` }}>
          {week.isError && <p className="p-6 text-body-sm text-danger">Couldn't read your week: {String(week.error)}</p>}
          {!ready && !week.isError && <div aria-busy className="absolute inset-0 bg-abyss-sunken" />}
          <canvas
            ref={canvas}
            role="img"
            aria-label={week.data ? `Your week: ${week.data.solves.total} solved, ${week.data.streak}-day streak` : "Your week"}
            className={cn("block size-full", !ready && "invisible")}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div role="radiogroup" aria-label="Card colours" className="flex h-10 items-center gap-1 rounded-md border border-glass-border bg-glass p-1">
            {SCHEMES.map((s) => (
              <button
                key={s.id}
                type="button"
                role="radio"
                aria-checked={scheme === s.id}
                onClick={() => setScheme(s.id)}
                className={cn(
                  "flex h-8 items-center rounded-sm px-4 text-body-sm font-medium transition-colors duration-[var(--dur-fast)]",
                  scheme === s.id ? "bg-accent-soft text-ink" : "text-ink-muted hover:bg-glass-hover hover:text-ink",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
          <Button onClick={() => void save()} disabled={!ready || saving}>
            <Download aria-hidden />
            {saving ? "Saving…" : "Save as PNG"}
          </Button>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  );
}
