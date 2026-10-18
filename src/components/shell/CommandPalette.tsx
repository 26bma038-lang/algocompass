import { useState } from "react";
import { Command } from "cmdk";
import { CalendarClock, GraduationCap, Keyboard, ListChecks, Network, PanelLeft, RefreshCw, Search, Target, Trophy, type LucideIcon } from "lucide-react";
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
interface Entry {
  key: string;
  group: "Actions" | "Screens" | "Topics";
  icon: LucideIcon;
  label: string;
  hint?: string;
  kbd?: string;
  keywords?: string[];
  onSelect: () => void;
}

/** Old (v1.1) screen names, so searching for them still finds where the content went. */
const SCREEN_KEYWORDS: Record<string, string[]> = {
  "/": ["home", "home base", "quests", "daily", "streak"],
  "/practice": ["problems", "mix", "upsolve", "recommendations"],
  "/progress": ["rating", "level", "xp", "weekly goals", "weekly review"],
};

const GROUPS: Entry["group"][] = ["Actions", "Screens", "Topics"];
/** In the flat search list, each row says what it is. */
const KIND: Record<Entry["group"], string> = { Actions: "Action", Screens: "Screen", Topics: "Topic" };

export function CommandPalette() {
  const open = useUiStore((s) => s.paletteOpen);
  const setOpen = useUiStore((s) => s.setPaletteOpen);
  const openTopic = useUiStore((s) => s.openTopic);
  const setShortcuts = useUiStore((s) => s.setShortcutsOpen);
  const toggleSidebar = useUiStore((s) => s.toggleSidebar);
  const navigate = useNavigate();
  const { data } = useHomeData();
  const nextContest = data?.upcoming.find((c) => c.platform === "cf") ?? data?.upcoming[0];
  const [search, setSearch] = useState("");

  /** Close first, then act: the palette never lingers over where you're going. */
  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  const entries: Entry[] = [
    { key: "sync", group: "Actions", icon: RefreshCw, label: "Sync now", kbd: "Ctrl R", keywords: ["refresh", "update"], onSelect: run(() => void useSyncStore.getState().run()) },
    { key: "mix", group: "Actions", icon: Target, label: "Open today's mix", hint: "Today", keywords: ["problems", "daily"], onSelect: run(() => navigate("/")) },
    ...(nextContest
      ? [{ key: "contest", group: "Actions" as const, icon: CalendarClock, label: "Open next contest", hint: shortName(nextContest), keywords: ["round", "register", "codeforces"], onSelect: run(() => openExternal(nextContest.url)) }]
      : []),
    { key: "keys", group: "Actions", icon: Keyboard, label: "Keyboard shortcuts", kbd: "?", keywords: ["help", "keys"], onSelect: run(() => setShortcuts(true)) },
    { key: "sidebar", group: "Actions", icon: PanelLeft, label: "Toggle sidebar", kbd: "Ctrl B", onSelect: run(toggleSidebar) },
    ...ALL_NAV.map((n): Entry => ({ key: n.to, group: "Screens", icon: n.icon, label: n.label, kbd: keyLabel(n.shortcut), keywords: ["go", "screen", ...(SCREEN_KEYWORDS[n.to] ?? [])], onSelect: run(() => navigate(n.to)) })),
    { key: "tab-topics", group: "Screens", icon: Network, label: "Topics map", hint: "Progress", keywords: ["skill tree", "graph", "mastery"], onSelect: run(() => navigate("/progress/topics")) },
    { key: "tab-achievements", group: "Screens", icon: Trophy, label: "Achievements", hint: "Progress", keywords: ["badges", "unlocks", "level", "xp"], onSelect: run(() => navigate("/progress/achievements")) },
    { key: "tab-sheets", group: "Screens", icon: ListChecks, label: "Sheets", hint: "Practice", keywords: ["striver", "a2z", "sde", "neetcode", "blind 75", "babbar", "450", "list"], onSelect: run(() => navigate("/practice/sheets")) },
    { key: "tab-path", group: "Screens", icon: GraduationCap, label: "Beginner Path", hint: "Practice", keywords: ["learn", "lessons", "videos", "start", "beginner"], onSelect: run(() => navigate("/practice/path")) },
    ...TOPICS.map((t): Entry => ({ key: t.id, group: "Topics", icon: topicIcon(t.id), label: t.name, keywords: [...t.cfTags, ...t.lcTags, "topic"], onSelect: run(() => openTopic(t.id)) })),
  ];
  const row = (e: Entry, flat: boolean) => (
    <Item key={e.key} icon={e.icon} label={e.label} hint={flat ? KIND[e.group] : e.hint} kbd={e.kbd} keywords={e.keywords} onSelect={e.onSelect} />
  );
  // cmdk ranks items inside a group but keeps groups in order, so while typing the list is flat:
  // the best match is always on top ("sort" → Sorting, not Keyboard shortcuts).
  const searching = search.trim() !== "";

  return (
    <Command.Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setSearch("");
      }}
      label="Command palette"
      loop
      filter={paletteScore}
      overlayClassName="fixed inset-0 z-50 bg-abyss/60"
      contentClassName="fixed top-[14vh] left-1/2 z-50 w-[min(560px,calc(100vw-48px))] -translate-x-1/2 overflow-hidden rounded-md border border-glass-border-strong bg-abyss-raised shadow-float"
    >
      <div className="flex items-center gap-2 border-b border-glass-border px-4">
        <Search aria-hidden className="size-4 shrink-0 text-ink-muted" strokeWidth={1.8} />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="Jump to a screen or topic, or run a command"
          className="h-12 w-full bg-transparent text-body text-ink outline-none placeholder:text-ink-faint focus-visible:!shadow-none"
        />
        <Kbd>Esc</Kbd>
      </div>
      <Command.List className="max-h-[min(420px,60vh)] overflow-y-auto p-2 [&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-2 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-label [&_[cmdk-group-heading]]:text-ink-faint">
        <Command.Empty className="px-3 py-6 text-center text-body-sm text-ink-muted">Nothing matches. Try a screen, a topic or a tag.</Command.Empty>
        {searching
          ? entries.map((e) => row(e, true))
          : GROUPS.map((g) => (
              <Command.Group key={g} heading={g}>
                {entries.filter((e) => e.group === g).map((e) => row(e, false))}
              </Command.Group>
            ))}
      </Command.List>
    </Command.Dialog>
  );
}
