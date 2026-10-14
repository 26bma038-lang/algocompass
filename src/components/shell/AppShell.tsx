import { Outlet, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AmbientBackground } from "./AmbientBackground";
import { Sidebar } from "./Sidebar";
import { TitleBar } from "./TitleBar";
import { TopBar } from "./TopBar";
import { useShortcuts } from "./useShortcuts";
import { Toaster } from "@/components/ui/sonner";
import { useSyncScheduler } from "@/data/syncStore";

export function AppShell() {
  const { pathname } = useLocation();
  useShortcuts();
  useSyncScheduler();
  return (
    <TooltipProvider delayDuration={250} skipDelayDuration={150}>
      <div className="relative flex h-full flex-col bg-abyss">
        <AmbientBackground />
        <TitleBar />
        <div className="relative z-10 flex min-h-0 flex-1">
          <Sidebar />
          <main className="flex min-w-0 flex-1 flex-col">
            <TopBar />
            <div className="min-h-0 flex-1 overflow-y-auto">
              {/* Route change: a quick settle, never a blocking exit animation. */}
              <motion.div
                key={pathname}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-[1440px] px-6 pt-6 pb-10"
              >
                <Outlet />
              </motion.div>
            </div>
          </main>
        </div>
      </div>
      <Toaster />
    </TooltipProvider>
  );
}
