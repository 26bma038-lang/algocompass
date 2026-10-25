import { Suspense, useLayoutEffect, useRef, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AmbientBackground } from "./AmbientBackground";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { PreviewBanner } from "./PreviewBanner";
import { TopBar } from "./TopBar";
import { useShortcuts } from "./useShortcuts";
import { Toaster } from "@/components/ui/sonner";
import { useDesktopBridge } from "@/data/desktopBridge";
import { useProgressionWatcher } from "@/data/progression";
import { useQuestWatcher } from "@/data/quests";
import { usePathWatcher } from "@/data/path";
import { Ceremonies } from "@/features/achievements/Ceremonies";
import { CommandPalette } from "./CommandPalette";
import { ShortcutSheet } from "./ShortcutSheet";
import { TipTour } from "./TipTour";
import { useSyncScheduler } from "@/data/syncStore";
import { TopicPanel } from "@/features/topic/TopicPanel";
import { useHandlesState } from "@/data/onboarding";
import { Welcome } from "@/features/onboarding/Welcome";
import { ShellFooterContext } from "./footerSlot";

/**
 * First launch (no handles saved, nothing synced): only the title bar and the welcome screen. The
 * sidebar, top bar and every watcher wait until there's a real account to show.
 */
export function AppShell() {
  const handles = useHandlesState();
  if (handles.isLoading) {
    return (
      <div className="relative flex h-full flex-col bg-abyss">
        <AmbientBackground />
        <TitleBar />
        <PreviewBanner />
      </div>
    );
  }
  if (handles.data === null) {
    return (
      <TooltipProvider delayDuration={250} skipDelayDuration={150}>
        <div className="relative flex h-full flex-col bg-abyss">
          <AmbientBackground />
          <TitleBar />
          <PreviewBanner />
          <main className="relative z-10 min-h-0 flex-1 overflow-y-auto px-6">
            <Welcome />
          </main>
        </div>
        <Toaster />
      </TooltipProvider>
    );
  }
  return <MainShell />;
}

function MainShell() {
  const { pathname } = useLocation();
  // A new screen starts at the top (the scroll area outlives route changes). Screens that land
  // somewhere specific (Learn filtered to a topic) scroll after this.
  const scroller = useRef<HTMLDivElement>(null);
  const [footer, setFooter] = useState<HTMLDivElement | null>(null);
  useLayoutEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [pathname]);
  useShortcuts();
  useSyncScheduler();
  useQuestWatcher();
  usePathWatcher();
  useDesktopBridge();
  useProgressionWatcher();
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={150}>
      <div className="relative flex h-full flex-col bg-abyss">
        <AmbientBackground />
        <TitleBar />
        <PreviewBanner />
        <div className="relative z-10 flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <div ref={scroller} data-shell-scroller className="min-h-0 flex-1 overflow-y-auto">
              {/* Route change: a quick settle, never a blocking exit animation. */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[1440px] px-6 pt-6 pb-10"
              >
                <ShellFooterContext.Provider value={footer}>
                  <Suspense fallback={<p className="text-body-sm text-ink-muted">Loading…</p>}>
                    <Outlet />
                  </Suspense>
                </ShellFooterContext.Provider>
              </motion.div>
            </div>
            {/* The lesson's flow bar lives here, under the scroll area, so it never covers content (v1.4). */}
            <div ref={setFooter} data-shell-footer className="mx-auto w-full max-w-[1440px] px-6 pt-3 pb-4 empty:hidden" />
          </main>
        </div>
      </div>
      <TopicPanel />
      <Ceremonies />
      <CommandPalette />
      <ShortcutSheet />
      <TipTour />
      {/* On a lesson, toasts sit above the sticky Next bar so they never cover the button. */}
      <Toaster offset={pathname.startsWith("/learn/path/") ? { bottom: 104, right: 20 } : 20} />
    </TooltipProvider>
  );
}
