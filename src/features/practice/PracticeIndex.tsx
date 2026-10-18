import { Navigate } from "react-router-dom";
import { usePrefs } from "@/data/prefs";
import { PracticeMix } from "./Practice";

/** /practice: today's mix in smart mode; Beginner mode lands on the Beginner Path instead. */
export function PracticeIndex() {
  const prefs = usePrefs();
  if (prefs.isLoading) return null;
  if (prefs.data?.mode === "beginner") return <Navigate to="/practice/path" replace />;
  return <PracticeMix />;
}
