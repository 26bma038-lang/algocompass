import { createHashRouter, Navigate } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import type { RouteHandle } from "@/components/shell/TopBar";
import { Achievements } from "@/features/achievements/Achievements";
import { Contests } from "@/features/contests/Contests";
import { HomeBase } from "@/features/home/HomeBase";
import { Practice } from "@/features/practice/Practice";
import { Quests } from "@/features/quests/Quests";
import { Settings } from "@/features/settings/Settings";
import { SkillTree } from "@/features/skill-tree/SkillTree";
import { TopicDetail } from "@/features/topic/TopicDetail";
import { Debug } from "@/features/debug/Debug";
import { humanizeTopic } from "@/lib/topics";

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
