import { usePrefs } from "@/data/prefs";
import { LessonProblems } from "./LessonProblems";
import { PracticeMix } from "./Practice";
import { practiceIndexFor } from "./tabs";

/** /practice (v1.4): today's problems in smart mode; the problems from your lessons in Beginner mode. */
export function PracticeIndex() {
  const prefs = usePrefs();
  if (prefs.isLoading) return null;
  return practiceIndexFor(prefs.data?.mode ?? "smart") === "lessons" ? <LessonProblems /> : <PracticeMix />;
}
