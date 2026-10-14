import { Trophy } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";

export function Achievements() {
  return (
    <EmptyState icon={Trophy} title="Nothing unlocked yet">
      Achievements mark real milestones: rank promotions, long streaks, topics mastered. Your level
      and every unlock will collect here.
    </EmptyState>
  );
}
