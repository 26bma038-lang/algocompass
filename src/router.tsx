import { lazy } from "react";
import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import type { RouteHandle } from "@/components/shell/TopBar";
import { HomeBase } from "@/features/home/HomeBase";
import { humanizeTopic } from "@/lib/topics";

// Home Base is the daily check-in, so it ships in the main chunk. Every other screen loads on first
// visit (the Skill Tree brings @xyflow/react and dagre with it). AppShell suspends with a quiet line.
const SkillTree = lazy(() => import("@/features/skill-tree/SkillTree").then((m) => ({ default: m.SkillTree })));
const TopicDetail = lazy(() => import("@/features/topic/TopicDetail").then((m) => ({ default: m.TopicDetail })));
const Practice = lazy(() => import("@/features/practice/Practice").then((m) => ({ default: m.Practice })));
const Quests = lazy(() => import("@/features/quests/Quests").then((m) => ({ default: m.Quests })));
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
      { index: true, element: <HomeBase />, handle: h("Home Base") },
      { path: "skill-tree", element: <SkillTree />, handle: h("Skill Tree") },
      {
        path: "topics/:topicId?",
        element: <TopicDetail />,
        handle: h((p) => (p.topicId ? humanizeTopic(p.topicId) : "Topic Detail")),
      },
      { path: "practice", element: <Practice />, handle: h("Practice") },
      { path: "quests", element: <Quests />, handle: h("Quests") },
      { path: "contests", element: <Contests />, handle: h("Contests") },
      { path: "achievements", element: <Achievements />, handle: h("Achievements") },
      { path: "settings", element: <Settings />, handle: h("Settings") },
      { path: "debug", element: <Debug />, handle: h("Debug") },
      { path: "*", element: <Navigate to="/" replace /> },
    ],
  },
]);
