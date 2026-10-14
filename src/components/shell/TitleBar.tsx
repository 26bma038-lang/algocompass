import { useEffect, useState, type ReactNode } from "react";
import { isTauri } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Compass, Copy, Minus, Square, X } from "lucide-react";
import { cn } from "@/lib/utils";

const inTauri = isTauri();

function WindowButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      tabIndex={-1}
      onClick={onClick}
      className={cn(
        "grid h-full w-[46px] place-items-center text-ink-muted transition-colors duration-[var(--dur-fast)]",
        "focus-visible:text-ink focus-visible:shadow-[inset_0_0_0_2px_var(--accent)]",
        danger ? "hover:bg-danger hover:text-abyss" : "hover:bg-glass-hover hover:text-ink",
      )}
    >
      {children}
    </button>
  );
}

export function TitleBar() {
  const [maximized, setMaximized] = useState(false);

  useEffect(() => {
    if (!inTauri) return;
    const win = getCurrentWindow();
    let unlisten: (() => void) | undefined;
    let disposed = false;
    win.isMaximized().then(setMaximized);
    win
      .onResized(() => {
        win.isMaximized().then(setMaximized);
      })
      .then((fn) => {
        if (disposed) fn();
        else unlisten = fn;
      });
    return () => {
      disposed = true;
      unlisten?.();
    };
  }, []);

  const win = inTauri ? getCurrentWindow() : null;

  return (
    <header
      data-tauri-drag-region
      className="relative z-20 flex h-[var(--titlebar-h)] shrink-0 items-center justify-between border-b border-glass-border bg-abyss-raised"
    >
      <div data-tauri-drag-region className="flex items-center gap-2 pl-[25px]">
        <Compass aria-hidden className="pointer-events-none size-4 text-accent" strokeWidth={2} />
        <span className="pointer-events-none font-display text-body-sm font-medium tracking-[0.01em] text-ink">
          AlgoCompass
        </span>
      </div>
      <div className="flex h-full">
        <WindowButton label="Minimize" onClick={() => win?.minimize()}>
          <Minus className="size-4" strokeWidth={1.5} />
        </WindowButton>
        <WindowButton label={maximized ? "Restore" : "Maximize"} onClick={() => win?.toggleMaximize()}>
          {maximized ? (
            <Copy className="size-3.5 -scale-x-100" strokeWidth={1.5} />
          ) : (
            <Square className="size-3.5" strokeWidth={1.5} />
          )}
        </WindowButton>
        <WindowButton label="Close to tray" danger onClick={() => win?.hide()}>
          <X className="size-4" strokeWidth={1.5} />
        </WindowButton>
      </div>
    </header>
  );
}
