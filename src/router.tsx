import { lazy } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { LEGACY_REDIRECTS } from "@/components/shell/nav";
import type { RouteHandle } from "@/components/shell/TopBar";
import { Today } from "@/features/home/Today";
import { humanizeTopic } from "@/lib/topics";

// Today is the daily check-in, so it ships in the main chunk. Every other screen loads on first
// visit (the Topics map brings @xyflow/react and dagre with it). AppShell suspends with a quiet line.
const SkillTree = lazy(() => import("@/features/skill-tree/SkillTree").then((m) => ({ default: m.SkillTree })));
const TopicDetail = lazy(() => import("@/features/topic/TopicDetail").then((m) => ({ default: m.TopicDetail })));
const Practice = lazy(() => import("@/features/practice/Practice").then((m) => ({ default: m.Practice })));
const PracticeIndex = lazy(() => import("@/features/practice/PracticeIndex").then((m) => ({ default: m.PracticeIndex })));
const PracticeMix = lazy(() => import("@/features/practice/Practice").then((m) => ({ default: m.PracticeMix })));
const SheetList = lazy(() => import("@/features/sheets/SheetList").then((m) => ({ default: m.SheetList })));
const SheetView = lazy(() => import("@/features/sheets/SheetView").then((m) => ({ default: m.SheetView })));
const Progress = lazy(() => import("@/features/progress/Progress").then((m) => ({ default: m.Progress })));
const ProgressOverview = lazy(() => import("@/features/progress/Progress").then((m) => ({ default: m.ProgressOverview })));
const Contests = lazy(() => import("@/features/contests/Contests").then((m) => ({ default: m.Contests })));
const Achievements = lazy(() => import("@/features/achievements/Achievements").then((m) => ({ default: m.Achievements })));
const Settings = lazy(() => import("@/features/settings/Settings").then((m) => ({ default: m.Settings })));
const Debug = lazy(() => import("@/features/debug/Debug").then((m) => ({ default: m.Debug })));

const h = (title: RouteHandle["title"]): RouteHandle => ({ title });

// Hash routing: the bundled app is served from tauri://, where history routes can't be deep-loaded.
export const router = createHashRouter([
  {
    element: <AppShell />,
    children: [
      { index: true, element: <Today />, handle: h("Today") },
      {
        path: "practice",
        element: <Practice />,
        handle: h("Practice"),
        children: [
          { index: true, element: <PracticeIndex /> },
          { path: "mix", element: <PracticeMix /> },
          { path: "sheets", element: <SheetList /> },
          { path: "sheets/:sheetId", element: <SheetView /> },
        ],
      },
      {
        path: "progress",
        element: <Progress />,
        handle: h("Progress"),
        children: [
          { index: true, element: <ProgressOverview /> },
          { path: "topics", element: <SkillTree /> },
          { path: "achievements", element: <Achievements /> },
        ],
      },
      {
        path: "topics/:topicId?",
        element: <TopicDetail />,
        handle: h((p) => (p.topicId ? humanizeTopic(p.topicId) : "Topic Detail")),
      },
      { path: "contests", element: <Contests />, handle: h("Contests") },
      { path: "settings", element: <Settings />, handle: h("Settings") },
      { path: "debug", element: <Debug />, handle: h("Debug") },
      // v1.1 screens that moved: redirect so nothing breaks.
      ...Object.entries(LEGACY_REDIRECTS).map(([from, to]) => ({ path: from.slice(1), element: <Navigate to={to} replace /> })),
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
