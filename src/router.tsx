import { lazy } from "react";
import { createHashRouter, Navigate, useLocation, type RouteObject } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { LEGACY_REDIRECTS, legacyLessonRedirect } from "@/components/shell/nav";
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
const Learn = lazy(() => import("@/features/learn/Learn").then((m) => ({ default: m.Learn })));
const Lesson = lazy(() => import("@/features/learn/Lesson").then((m) => ({ default: m.Lesson })));
const Watch = lazy(() => import("@/features/learn/Watch").then((m) => ({ default: m.Watch })));
const SheetList = lazy(() => import("@/features/sheets/SheetList").then((m) => ({ default: m.SheetList })));
const SheetView = lazy(() => import("@/features/sheets/SheetView").then((m) => ({ default: m.SheetView })));
const Progress = lazy(() => import("@/features/progress/Progress").then((m) => ({ default: m.Progress })));
const ProgressOverview = lazy(() => import("@/features/progress/Progress").then((m) => ({ default: m.ProgressOverview })));
const Contests = lazy(() => import("@/features/contests/Contests").then((m) => ({ default: m.Contests })));
const Achievements = lazy(() => import("@/features/achievements/Achievements").then((m) => ({ default: m.Achievements })));
const Settings = lazy(() => import("@/features/settings/Settings").then((m) => ({ default: m.Settings })));
const Debug = lazy(() => import("@/features/debug/Debug").then((m) => ({ default: m.Debug })));

const h = (title: RouteHandle["title"]): RouteHandle => ({ title });

/** v1.3: lessons moved from Practice to Learn; old /practice/path/:step links land on the same lesson. */
function LegacyLesson() {
  return <Navigate to={legacyLessonRedirect(useLocation().pathname) ?? "/learn"} replace />;
}

/** The route table (exported on its own so tests can match paths against it). */
export const routes: RouteObject[] = [
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
        path: "learn",
        handle: h("Learn"),
        children: [
          { index: true, element: <Learn /> },
          { path: "path", element: <Navigate to="/learn#path" replace /> },
          { path: "path/:stepId", element: <Lesson /> },
          { path: "watch/:videoId", element: <Watch /> },
        ],
      },
      { path: "practice/path/:stepId", element: <LegacyLesson /> },
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
];

// Hash routing: the bundled app is served from tauri://, where history routes can't be deep-loaded.
// Created on first use, so importing the route table doesn't need a window.
let created: ReturnType<typeof createHashRouter> | null = null;
export const getRouter = () => (created ??= createHashRouter(routes));
