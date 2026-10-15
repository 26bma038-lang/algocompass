import { Command } from "cmdk";
import { CalendarClock, Keyboard, PanelLeft, RefreshCw, Search, Target, type LucideIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useHomeData } from "@/data/queries";
import { useSyncStore } from "@/data/syncStore";
import { useUiStore } from "@/data/uiStore";
import { TOPICS } from "@/engine/topics";
import { shortName } from "@/features/home/ContestStrip";
import { openExternal } from "@/lib/openExternal";
import { topicIcon } from "@/lib/topicIcons";
import { paletteScore } from "@/lib/paletteScore";
import { ALL_NAV } from "./nav";

/** Shortcut text as shown in kbd keys ("Ctrl 1"). */
export const keyLabel = (shortcut: string) => `Ctrl ${shortcut}`;

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="numeric font-sans ml-auto rounded-xs border border-glass-border-strong px-1 text-label whitespace-nowrap text-ink-muted">{children}</kbd>
  );
}

const itemClass =
  "flex h-10 cursor-pointer items-center gap-3 rounded-sm px-3 text-body text-ink-muted select-none data-[selected=true]:bg-glass-hover data-[selected=true]:text-ink data-[disabled=true]:cursor-not-allowed data-[disabled=true]:opacity-45";

function Item({ icon: Icon, label, hint, kbd, keywords, onSelect }: { icon: LucideIcon; label: string; hint?: string; kbd?: string; keywords?: string[]; onSelect: () => void }) {
  return (
    <Command.Item value={label} keywords={keywords} onSelect={onSelect} className={itemClass}>
      <Icon aria-hidden className="size-4 shrink-0" strokeWidth={1.8} />
      <span className="truncate text-ink">{label}</span>
      {hint && <span className="truncate text-body-sm text-ink-faint">{hint}</span>}
      {kbd && <Kbd>{kbd}</Kbd>}
    </Command.Item>
  );
}

/**
 * Ctrl+K: jump anywhere. Screens, every topic (opens Topic Detail), and the everyday actions.
 * cmdk ranks matches fuzzily and handles the arrows, Enter and Esc. Styled as the Float plane.
 */
export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const openTopic = useUiStore((s) => s.openTopic);
  const setShortcuts = useUiStore((s) => s.setShortcutsOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const { data } = useHomeData();
  const nextContest = data?.upcoming.find((c) => c.platform === "cf") ?? data?.upcoming[0];

  /** Close first, then act: the palette never lingers over where you're going. */
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Command palette"
      loop
      filter={paletteScore}
      overlayClassName="fixed inset-0 z-50 bg-abyss/60"
      contentClassName="fixed top-[14vh] left-1/2 z-50 w-[min(560px,calc(100vw-48px))] -translate-x-1/2 overflow-hidden rounded-md border border-glass-border-strong bg-abyss-raised shadow-float"
    >
      <div className="flex items-center gap-2 border-b border-glass-border px-4">
        <Search aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
        <Command.Input
          placeholder="Jump to a screen or topic, or run a command"
          className="h-12 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-faint focus-visible:!shadow-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-label [&_[cmdk-group-heading]]:text-ink-faint">
        <Command.Empty className="px-3 py-6 text-center text-body-sm text-ink-muted">Nothing matches. Try a screen, a topic or a tag.</Command.Empty>
        <Command.Group heading="Actions">
          <Item icon={RefreshCw} label="Sync now" kbd="Ctrl R" keywords={["refresh", "update"]} onSelect={run(() => void useSyncStore.getState().run())} />
          <Item icon={Target} label="Open today's mix" hint="Practice" keywords={["problems", "daily"]} onSelect={run(() => navigate("/practice"))} />
          {nextContest && (
            <Item
              icon={CalendarClock}
              label="Open next contest"
              hint={shortName(nextContest)}
              keywords={["round", "register", "codeforces"]}
              onSelect={run(() => openExternal(nextContest.url))}
            />
          )}
          <Item icon={Keyboard} label="Keyboard shortcuts" kbd="?" keywords={["help", "keys"]} onSelect={run(() => setShortcuts(true))} />
          <Item icon={PanelLeft} label="Toggle sidebar" kbd="Ctrl B" onSelect={run(toggleSidebar)} />
        </Command.Group>
        <Command.Group heading="Screens">
          {ALL_NAV.map((n) => (
            <Item key={n.to} icon={n.icon} label={n.label} kbd={keyLabel(n.shortcut)} keywords={["go", "screen"]} onSelect={run(() => navigate(n.to))} />
          ))}
        </Command.Group>
        <Command.Group heading="Topics">
          {TOPICS.map((t) => (
            <Item key={t.id} icon={topicIcon(t.id)} label={t.name} keywords={[...t.cfTags, ...t.lcTags, "topic"]} onSelect={run(() => openTopic(t.id))} />
          ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}
