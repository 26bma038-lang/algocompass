import { Dialog } from "radix-ui";
import { X } from "lucide-react";
import { useUiStore } from "@/data/uiStore";
import type { NavItem } from "./nav";
import { useNav } from "./useNav";

const groups = (nav: NavItem[]): { title: string; keys: [string, string][] }[] => [
  {
    title: "Anywhere",
    keys: [
      ["Ctrl K", "Command palette"],
      ["Ctrl R", "Sync now"],
      ["Ctrl B", "Toggle sidebar"],
      ["?", "This sheet"],
      ["Esc", "Close a panel, dialog or moment"],
    ],
  },
  { title: "Screens", keys: nav.map((n) => [`Ctrl ${n.shortcut}`, n.label]) },
  {
    title: "Progress · Topics map",
    keys: [
      ["/", "Search topics"],
      ["Enter", "Open the best match"],
    ],
  },
];

/** "?": every keyboard shortcut on one Float panel. */
export function ShortcutSheet() {
  const open = useUiStore((s) => s.shortcutsOpen);
  const setOpen = useUiStore((s) => s.setShortcutsOpen);
  const nav = useNav().all;
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-abyss/60" />
        <Dialog.Content className="fixed top-[12vh] left-1/2 z-50 w-[min(640px,calc(100vw-48px))] -translate-x-1/2 rounded-md border border-glass-border-strong bg-abyss-raised p-6 shadow-float">
          <div className="flex items-start justify-between gap-4">
            <div>
              <Dialog.Title className="text-title font-semibold text-ink">Keyboard shortcuts</Dialog.Title>
              <Dialog.Description className="text-body-sm text-ink-muted">Everything works without a mouse.</Dialog.Description>
            </div>
            <Dialog.Close
              aria-label="Close"
              className="grid size-8 place-items-center rounded-sm text-ink-muted transition-colors duration-[var(--dur-fast)] hover:bg-glass-hover hover:text-ink"
            >
              <X aria-hidden className="size-4" />
            </Dialog.Close>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-x-8 gap-y-5">
            {groups(nav).map((g) => (
              <section key={g.title} className="flex flex-col gap-1.5">
                <h3 className="text-label text-ink-faint">{g.title}</h3>
                <dl className="flex flex-col gap-1">
                  {g.keys.map(([k, label]) => (
                    <div key={k} className="flex items-center justify-between gap-3">
                      <dt className="text-body-sm text-ink">{label}</dt>
                      <dd>
                        <kbd className="numeric font-sans rounded-xs border border-glass-border-strong px-1 text-label whitespace-nowrap text-ink-muted">{k}</kbd>
                      </dd>
                    </div>
                  ))}
                </dl>
              </section>
            ))}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
