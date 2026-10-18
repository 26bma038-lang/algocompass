import { Suspense, useLayoutEffect, useRef } from "react";
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
            <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
              {/* Route change: a quick settle, never a blocking exit animation. */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[1440px] px-6 pt-6 pb-10"
              >
                <Suspense fallback={<p className="text-body-sm text-ink-muted">Loading…</p>}>
                  <Outlet />
                </Suspense>
              </motion.div>
            </div>
          </main>
        </div>
      </div>
      <TopicPanel />
      <Ceremonies />
      <CommandPalette />
      <ShortcutSheet />
      <TipTour />
      <Toaster />
    </TooltipProvider>
  );
}
