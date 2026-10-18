import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { MotionConfig } from "framer-motion";
import { queryClient } from "@/data/queryClient";
import { applyRankAccent, FALLBACK_RANK_TOKEN } from "@/lib/rank";
import { initTheme, useThemeStore } from "@/lib/theme";
import { getRouter } from "@/router";
import "@/styles/globals.css";

// Pre-sync fallback accent (DESIGN.md: expert blue until a real rank is known).
applyRankAccent(FALLBACK_RANK_TOKEN, null);
// Theme before the first render, so the saved one shows without a flash of the default.
useThemeStore.setState({ theme: initTheme() });

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <RouterProvider router={getRouter()} />
      </MotionConfig>
    </QueryClientProvider>
  </React.StrictMode>,
);
